import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { firstValueFrom } from 'rxjs';
import { ScheduleService } from '../schedule.service';
import { ScheduleEntry, ScheduleState, ScheduleEntryCreate, ScheduleEntryUpdate } from '../../../shared/models/schedule-entry.model';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ScheduleEntryModalComponent } from '../schedule-entry-modal/schedule-entry-modal.component';

type ScheduleView = 'day' | 'week' | 'year';

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, ScheduleEntryModalComponent],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.css',
})
export class SchedulePageComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);
  private toastService = inject(ToastService);

  // Always in build mode (editable)
  // View state - default to day view
  currentView = signal<ScheduleView>('day');
  // Initialize with minimal required config to prevent viewType error
  calendarOptions = signal<CalendarOptions>({
    plugins: [resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'resourceTimelineDay',
    schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source', // Offline support
  });
  
  // Prevent infinite loop
  private isLoadingData = false;
  private lastLoadedRange: { start: Date; end: Date } | null = null;
  private isUpdatingEvents = false;
  private lastEventsHash: string = '';
  private datesSetCallCount = 0;
  private lastDatesSetTime = 0;
  // Store current calendar date for proper synchronization
  private currentCalendarDate: Date | null = null;
  // Prevent double-click/double-select issues
  private isProcessingSelection = false;
  private lastSelectionTime = 0;
  
  // Prevent multiple updates during drag/resize
  private isUpdatingEntry = false; // Flag to prevent recursive updates
  
  // Track pending changes that haven't been saved to server
  private pendingChanges: Set<string> = new Set(); // Set of entry IDs with pending changes
  
  // Prevent duplicate quick template entry creation
  private isCreatingQuickEntry = false;
  private lastQuickEntryKey = '';

  // Data
  scheduleEntries = signal<ScheduleEntry[]>([]);
  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);
  isLoading = signal(false);

  // Filters
  filterStates = signal<Record<ScheduleState, boolean>>({
    Training: true,
    OnWork: true,
    Rest: true,
    Vacation: true,
    Illness: true,
  });

  // Removed department and employee filters - showing all

  // Quick Template state
  isQuickFillMode = signal<boolean>(false);
  selectedTemplate = signal<number | null>(null); // Hours: 4, 8, or 12
  selectedTemplateState = signal<ScheduleState>('OnWork'); // Default state for quick templates

  /**
   * Calculate shift end time, handling overnight shifts correctly
   * If the shift crosses midnight, EndTime will be on the next day
   * Uses milliseconds addition to guarantee proper date transition
   */
  private calculateShiftEnd(startTime: Date, durationHours: number): Date {
    // Use milliseconds addition instead of setHours to guarantee proper date transition
    const end = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    return end;
  }

  /**
   * Preserve overnight shifts when navigating to next day
   * This ensures shifts that started previous day are still visible
   * Note: Saved entries will be loaded from server, but we preserve them
   * in case of timing issues or if they're not yet in server response
   */
  private preserveOvernightShifts(newDay: Date): void {
    const currentEntries = this.scheduleEntries();
    const dayStart = new Date(newDay);
    dayStart.setHours(0, 0, 0, 0);
    
    // Mark entries that should be preserved (overnight shifts from previous day)
    // These will be merged with server data in loadScheduleDataForRange
    currentEntries.forEach(entry => {
      const entryStart = new Date(entry.startTime);
      const entryEnd = new Date(entry.endTime);
      
      // If entry starts before new day but ends during/after new day, mark for preservation
      // Only if not already in pendingChanges (to avoid duplicates)
      if (entryStart < dayStart && entryEnd > dayStart && !this.pendingChanges.has(entry.id)) {
        // Don't add to pendingChanges - these are saved entries
        // They will be preserved in loadScheduleDataForRange merge logic
      }
    });
  }

  // Modal state
  isModalOpen = signal(false);
  modalEntry = signal<ScheduleEntry | null>(null);
  modalStartTime = signal<Date | null>(null);
  modalEndTime = signal<Date | null>(null);
  modalSelectedEmployeeId = signal<string | null>(null);
  modalSelectedDepartmentId = signal<string | null>(null);

  // Computed: filtered entries based on state filters only
  filteredEntries = computed(() => {
    const entries = this.scheduleEntries();
    const filters = this.filterStates();

    const filtered = entries.filter((entry) => {
      // Only filter by state
      return filters[entry.state as ScheduleState];
    });
    
    console.log('🔍 Filtering entries:', {
      totalEntries: entries.length,
      filteredCount: filtered.length,
      filters: filters
    });
    
    return filtered;
  });

  // Computed: resources (employees) for timeline - grouped by department, sorted by CallSign/Position
  calendarResources = computed(() => {
    const employees = this.employees();
    const departments = this.departments();
    
    // Group by department for resource grouping
    const grouped = employees.reduce((acc, emp) => {
      const dept = departments.find(d => d.id === emp.departmentId);
      const deptName = dept?.name || 'Без відділу';
      if (!acc[deptName]) {
        acc[deptName] = [];
      }
      acc[deptName].push(emp);
      return acc;
    }, {} as Record<string, typeof employees>);
    
    // Sort employees within each department by CallSign, then by name
    Object.keys(grouped).forEach(deptName => {
      grouped[deptName].sort((a, b) => {
        // First by CallSign
        if (a.callSign && b.callSign) {
          return a.callSign.localeCompare(b.callSign, 'uk');
        }
        if (a.callSign) return -1;
        if (b.callSign) return 1;
        // Then by name
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return nameA.localeCompare(nameB, 'uk');
      });
    });
    
    // Flatten and map to resources with department name
    // FullCalendar needs departmentName as a direct property for resourceGroupField
    return Object.entries(grouped).flatMap(([deptName, emps]) =>
      emps.map(emp => ({
        id: emp.id,
        title: emp.callSign || `${emp.firstName} ${emp.lastName}`,
        departmentName: deptName, // Direct property for grouping
        extendedProps: {
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentId: emp.departmentId,
          departmentName: deptName,
          callSign: emp.callSign,
        },
      }))
    );
  });

  // Computed: calendar events from filtered entries
  calendarEvents = computed<EventInput[]>(() => {
    const allEntries = this.scheduleEntries();
    const filtered = this.filteredEntries();
    const resources = this.calendarResources();
    const resourceIds = new Set(resources.map(r => r.id));
    
    console.log('🔵 Computing calendar events:', {
      allEntriesCount: allEntries.length,
      allEntries: allEntries.map(e => ({
        id: e.id,
        employeeId: e.employeeId,
        state: e.state,
        start: e.startTime,
        end: e.endTime
      })),
      filteredEntriesCount: filtered.length,
      resourcesCount: resources.length,
      resourceIds: Array.from(resourceIds),
      filterStates: this.filterStates()
    });
    
    // Filter out entries that don't have a matching resource
    const validEntries = filtered.filter(entry => {
      const hasResource = resourceIds.has(entry.employeeId);
      if (!hasResource) {
        console.warn('⚠️ Entry has no matching resource:', {
          entryId: entry.id,
          employeeId: entry.employeeId,
          startTime: entry.startTime,
          endTime: entry.endTime,
          availableResourceIds: Array.from(resourceIds)
        });
      }
      return hasResource;
    });
    
    console.log('🟢 Creating calendar events:', {
      filteredEntries: filtered.length,
      validEntries: validEntries.length,
      resourcesCount: resources.length,
      missingResources: filtered.length - validEntries.length
    });
    
    const mappedEvents = validEntries.map((entry) => {
      // Parse ISO datetime string - FullCalendar will handle timezone with timeZone: 'local'
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      
      // Get color based on state
      const color = this.getStateColor(entry.state);

      // Format time for display (only hours, e.g., "22" or "4")
      const formatTime = (date: Date): string => {
        return String(date.getHours());
      };

      const startTimeStr = formatTime(start);
      const endTimeStr = formatTime(end);
      
      // Format title with only time range (e.g., "22 - 4")
      const title = `${startTimeStr} - ${endTimeStr}`;

      // Check if this is an overnight shift
      const isOvernight = end.getDate() !== start.getDate() || 
                         (end.getTime() < start.getTime() && end.getDate() === start.getDate() + 1);

      // FullCalendar accepts both Date objects and ISO strings
      // Using ISO strings ensures consistent timezone handling with timeZone: 'local'
      const event: EventInput = {
        id: entry.id,
        resourceId: entry.employeeId, // Link to employee resource
        title: title, // Show time range only (e.g., "22 - 4")
        start: start.toISOString(), // ISO 8601 format for consistent timezone handling
        end: end.toISOString(), // ISO 8601 format
        backgroundColor: color,
        borderColor: color,
        editable: true, // Always editable
        // Allow events to span across midnight - continuous visualization
        display: 'block',
        // Ensure timezone is handled correctly
        allDay: false,
        // Store entry data and overnight flag
        extendedProps: {
          entry: entry,
          isOvernight: isOvernight,
        },
      };
      
      console.log('📅 Mapped event:', {
        entryId: entry.id,
        resourceId: entry.employeeId,
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        color
      });
      
      return event;
    });
    
    console.log('✅ Total calendar events created:', mappedEvents.length);
    return mappedEvents;
  });

  private calendarApi: any = null;

  private lastResourcesHash: string = '';

  constructor() {
    // Effect to update calendar resources when employees/departments change
    effect(() => {
      const resources = this.calendarResources();
      const resourcesHash = JSON.stringify(resources.map(r => r.id));
      
      console.log('Resources effect triggered:', {
        resourcesCount: resources.length,
        calendarApiExists: !!this.calendarApi,
        isLoadingData: this.isLoadingData,
        isUpdatingEvents: this.isUpdatingEvents,
        hashChanged: resourcesHash !== this.lastResourcesHash
      });
      
      // Only update if calendar is ready and resources changed
      if (this.calendarApi && resourcesHash !== this.lastResourcesHash) {
        this.lastResourcesHash = resourcesHash;
        
        console.log('📋 Updating calendar resources in effect:', resources.length);
        
        // Use setTimeout to avoid updating during Angular change detection
        setTimeout(() => {
          if (!this.calendarApi) return;
          
          try {
            const existingResources = this.calendarApi.getResources();
            const existingIds = new Set(existingResources.map((r: any) => r.id));
            
            // Only add resources that don't exist yet (don't remove existing ones!)
            let addedCount = 0;
            resources.forEach((resource: any) => {
              if (!existingIds.has(resource.id)) {
                try {
                  this.calendarApi.addResource(resource);
                  addedCount++;
                } catch (e) {
                  console.error('❌ Error adding resource in effect:', e);
                }
              }
            });
            
            if (addedCount > 0) {
              console.log('✅ Resources effect: added', addedCount, 'new resources');
              this.calendarApi.render();
            } else {
              console.log('ℹ️ Resources effect: no new resources to add');
            }
          } catch (error) {
            console.warn('⚠️ Error in resources effect:', error);
          }
        }, 50);
      } else if (!this.calendarApi && resources.length > 0) {
        console.log('ℹ️ Resources ready, waiting for calendar initialization:', resources.length);
      }
    });

    // Effect to update calendar events when they change
    effect(() => {
      const events = this.calendarEvents();
      
      // Create a hash of events to detect actual changes
      const eventsHash = JSON.stringify(events.map(e => ({ 
        id: e.id, 
        start: e.start, 
        end: e.end, 
        resourceId: e.resourceId
      })));
      
      console.log('🔄 Events effect triggered:', {
        eventsCount: events.length,
        hasCalendarApi: !!this.calendarApi,
        hashChanged: eventsHash !== this.lastEventsHash,
        lastHash: this.lastEventsHash.substring(0, 50) + '...'
      });
      
      // Update calendar when events change
      if (this.calendarApi && eventsHash !== this.lastEventsHash) {
        this.lastEventsHash = eventsHash;
        
        console.log('🚀 Updating calendar with events:', {
          eventsCount: events.length,
          resourcesCount: this.calendarResources().length,
          events: events.map(e => ({
            id: e.id,
            resourceId: e.resourceId,
            title: e.title,
            start: e.start,
            end: e.end
          }))
        });
        
        // Use setTimeout to avoid triggering during Angular change detection
        setTimeout(() => {
          if (this.calendarApi) {
            // Remove all events and add new ones for immediate update
            const currentEvents = this.calendarEvents();
            this.calendarApi.removeAllEvents();
            
            // Add events one by one
            currentEvents.forEach((event) => {
              try {
                const resource = this.calendarApi.getResourceById(event.resourceId);
                if (resource) {
                  this.calendarApi.addEvent(event);
                }
              } catch (e) {
                console.error('Error adding event:', e);
              }
            });
            
            this.calendarApi.render();
            console.log('✅ Calendar events updated and rendered:', currentEvents.length, 'events');
            
            // Log final state after a short delay to ensure rendering is complete
            setTimeout(() => {
              if (this.calendarApi) {
                const calendarEvents = this.calendarApi.getEvents();
                console.log('📈 Calendar now has', calendarEvents.length, 'events');
              }
            }, 100);
          }
        }, 50);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Load data first
    await Promise.all([
      this.loadDepartments(),
      this.loadEmployees()
    ]);
    
    console.log('Data loaded:', {
      departments: this.departments().length,
      employees: this.employees().length,
      resources: this.calendarResources().length
    });
    
    // Initialize calendar after data is loaded
    // Data will be loaded automatically via datesSet callback when calendar initializes
    this.initializeCalendar();
    
    // Force update calendar resources after everything is loaded
    // Update resources only once, and only add missing ones (don't remove/re-add)
    const updateResources = () => {
      const resources = this.calendarResources();
      
      if (this.calendarApi && resources.length > 0) {
        try {
          const existingResources = this.calendarApi.getResources();
          const existingIds = new Set(existingResources.map((r: any) => r.id));
          
          // Only add resources that don't exist yet
          let addedCount = 0;
          resources.forEach((resource: any) => {
            if (!existingIds.has(resource.id)) {
              try {
                this.calendarApi.addResource(resource);
                addedCount++;
              } catch (e) {
                console.error('Error adding resource:', e);
              }
            }
          });
          
          if (addedCount > 0) {
            console.log('✅ Added', addedCount, 'new resources (total:', existingIds.size + addedCount, ')');
          } else {
            console.log('ℹ️ All resources already exist');
          }
        } catch (error) {
          console.error('❌ Error updating resources:', error);
        }
      }
    };
    
    // Only try once after calendar is ready
    setTimeout(updateResources, 300);
  }

  private initializeCalendar(): void {
    this.updateCalendarOptions();
    // Also update calendar options after a delay to ensure resources are loaded
    setTimeout(() => {
      this.updateCalendarOptions();
    }, 300);
  }

  private updateCalendarOptions(): void {
    const view = this.currentView();
    // Always editable (build mode)
    const isBuildMode = true;
    
    // Get current events and resources
    // Use direct array - FullCalendar will be updated via refetchEvents when signals change
    const events = this.calendarEvents();
    const resources = this.calendarResources();
    
    console.log('Updating calendar options with:', {
      eventsCount: events.length,
      resourcesCount: resources.length,
      view
    });

    // Determine initial view based on mode and view type
    let initialView: string;
    if (view === 'day') {
      initialView = 'resourceTimelineDay';
    } else if (view === 'week') {
      initialView = 'resourceTimelineWeek';
    } else {
      initialView = 'dayGridMonth'; // Year view stays as month grid
    }

    // Create custom week view with daily slots (ONLY for week view)
    const customWeekView: any = {
      type: 'resourceTimeline',
      duration: { weeks: 1 }, // Use weeks: 1 to align with Monday-Sunday
      slotDuration: { days: 1 },
      slotLabelInterval: { days: 1 },
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotLabelFormat: {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      },
      slotLabelContent: (arg: any) => {
        const date = arg.date;
        const weekday = date.toLocaleDateString('uk-UA', { weekday: 'short' });
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${weekday} ${day}.${month}`;
      },
      eventOverlap: true,
      eventMaxStack: 999, // Show all events vertically without "+1 more"
      nextDayThreshold: '00:00:00', // Allow events to span across midnight
      slotEventOverlap: false, // Events stack vertically instead of overlapping horizontally
      eventOrder: 'start', // Sort overlapping events by start time
    };

    // Create custom day view with hourly slots (ONLY for day view)
    const customDayView: any = {
      type: 'resourceTimeline',
      duration: { days: 1 },
      slotDuration: '01:00:00', // Hourly slots for day view
      slotLabelInterval: '01:00:00',
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
      eventOverlap: true, // Allow events to overlap so they can be stacked vertically
      eventMaxStack: 999, // Show all events vertically without "+1 more"
      nextDayThreshold: '00:00:00', // Allow events to span across midnight
      slotEventOverlap: false, // Events stack vertically instead of overlapping horizontally
      eventOrder: 'start', // Sort overlapping events by start time
    };

    console.log('📋 Setting calendar options:', {
      view,
      initialView,
      resourcesCount: resources.length,
      eventsCount: events.length,
      resources: resources.map(r => ({ id: r.id, title: r.title })),
      events: events.map(e => ({ id: e.id, resourceId: e.resourceId, title: e.title }))
    });

    const baseOptions: CalendarOptions = {
      plugins: [resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: initialView,
      schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source', // Offline support
      views: {
        resourceTimelineWeek: customWeekView,
        resourceTimelineDay: customDayView,
      },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: view === 'year' ? 'dayGridYear,dayGridMonth' : 'resourceTimelineWeek,resourceTimelineDay',
      },
      resources: resources, // Always set resources (even if empty initially)
      events: events, // Use events array directly - FullCalendar will handle updates via refetchEvents
      editable: isBuildMode,
      selectable: isBuildMode,
      selectMirror: true,
      selectOverlap: false,
      // Configure event overlap - allow overlap so events can be stacked vertically
      eventOverlap: true, // Always allow overlap for vertical stacking
      weekends: true,
      select: this.handleDateSelect.bind(this),
      dateClick: this.handleDateClick.bind(this),
      eventClick: this.handleEventClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this),
      // Ensure overnight events are displayed correctly
      eventDisplay: 'block',
      // Note: eventChange is not used to avoid multiple calls during drag/resize
      locale: 'uk',
      firstDay: 1, // Monday (0 = Sunday, 1 = Monday)
      weekNumbers: false,
      weekNumberCalculation: 'ISO', // ISO week starts on Monday
      height: '100%', // Fill the calculated container
      contentHeight: 'auto', // Auto height for content
      handleWindowResize: true, // Adapt to container width changes
      timeZone: 'local', // Use local timezone instead of UTC
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      // Configure overnight shift handling
      nextDayThreshold: '00:00:00', // Events continuing past midnight are considered next day events
      // Visual stacking for overlapping events
      eventOrder: 'start', // Sort overlapping events by start time
      eventMaxStack: 999, // Show all events vertically without "+1 more" (no limit)
      slotEventOverlap: false, // Events stack vertically instead of overlapping horizontally
      // Note: slotDuration and slotLabelInterval are configured in custom views above
      // Don't set them here to avoid overriding custom view settings
      snapDuration: '01:00:00', // Snap to hours when dragging
      resourceGroupField: 'departmentName', // Group by department
      resourceAreaWidth: '25%', // Width of resource column
      resourceOrder: 'departmentName,title', // Order by department then name
      resourceLabelContent: (arg: any) => {
        // Custom label for resource groups (departments) and individual resources
        if (arg.groupValue) {
          return arg.groupValue; // Department name
        }
        return arg.resource?.title || ''; // Employee name
      },
      // Note: slotLabelFormat and slotLabelContent are configured in custom views above
      // Don't set them here to avoid overriding custom view settings
      // Allow events to span across days (for overnight shifts)
      eventMinWidth: 30, // Minimum width for events
      // Handle view change from FullCalendar buttons
      viewDidMount: (arg: any) => {
        const currentViewType = arg.view.type;
        
        // Debounce: prevent multiple rapid calls
        const now = Date.now();
        if (now - this.lastDatesSetTime < 500) {
          return;
        }
        this.lastDatesSetTime = now;
        
        console.log('🎨 View mounted:', currentViewType);
        
        // Don't reload data or update options on initial mount
        // This prevents double-loading and keeps events intact
        if (!this.calendarApi) {
          console.log('ℹ️ Initial view mount, skipping reload');
          return;
        }
        
        // Sync our currentView signal with FullCalendar's actual view (but don't reload)
        if (currentViewType === 'resourceTimelineWeek' && this.currentView() !== 'week') {
          console.log('📅 Syncing to week view');
          this.currentView.set('week');
        } else if (currentViewType === 'resourceTimelineDay' && this.currentView() !== 'day') {
          console.log('📅 Syncing to day view');
          this.currentView.set('day');
        }
      },
      datesSet: async (arg: any) => {
        // Store calendar API reference if not already set
        if (!this.calendarApi) {
          this.calendarApi = arg.view.calendar;
          console.log('🗓️ Calendar API initialized');
          
          // Store current calendar date immediately (use local date, not UTC)
          // arg.view.currentStart is in UTC, convert to local date
          const calendarDateUTC = new Date(arg.view.currentStart);
          // Get local date components to avoid timezone issues
          const localYear = calendarDateUTC.getFullYear();
          const localMonth = calendarDateUTC.getMonth();
          const localDate = calendarDateUTC.getDate();
          this.currentCalendarDate = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
          
          // Load data for the initial calendar date using local date
          const initialDate = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
          
          // Determine view type and load appropriate data
          const viewType = arg.view.type;
          if (viewType === 'resourceTimelineDay') {
            this.loadScheduleDataForRange(initialDate, initialDate);
          } else if (viewType === 'resourceTimelineWeek') {
            const weekStart = new Date(initialDate);
            // Calculate Monday of the week
            const day = weekStart.getDay();
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
            weekStart.setDate(diff);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Sunday
            weekEnd.setHours(23, 59, 59, 999);
            this.loadScheduleDataForRange(weekStart, weekEnd);
          }
          
          // Trigger events update immediately after calendar is ready
          setTimeout(() => {
            console.log('🔥 Forcing initial events update after calendar init');
            const events = this.calendarEvents();
            const resources = this.calendarResources();
            
            console.log('📊 Initial data:', {
              events: events.length,
              resources: resources.length,
              calendarDate: this.currentCalendarDate?.toISOString().split('T')[0]
            });
            
            if (resources.length > 0 && this.calendarApi) {
              try {
                // Clear and add resources
                const existingResources = this.calendarApi.getResources();
                existingResources.forEach((resource: any) => {
                  try {
                    this.calendarApi.removeResource(resource);
                  } catch (e) {
                    // Ignore
                  }
                });
                
                resources.forEach((resource: any) => {
                  try {
                    this.calendarApi.addResource(resource);
                  } catch (e) {
                    console.error('Error adding resource:', e);
                  }
                });
                
                console.log('✅ Resources added:', resources.length);
              } catch (error) {
                console.error('❌ Error setting resources:', error);
              }
            }
            
            // Update calendar options to trigger event reload
            if (this.calendarApi) {
              console.log('🎯 Updating calendar options to reload events');
              // Force calendar to reload events by updating options
              const currentEvents = this.calendarEvents();
              this.calendarApi.removeAllEvents();
              currentEvents.forEach((event) => {
                try {
                  const resource = this.calendarApi.getResourceById(event.resourceId);
                  if (resource) {
                    this.calendarApi.addEvent(event);
                  }
                } catch (e) {
                  console.error('Error adding event:', e);
                }
              });
              this.calendarApi.render();
              this.calendarApi.render();
              
              // Update hash to prevent effect from re-fetching same events
              const events = this.calendarEvents();
              this.lastEventsHash = JSON.stringify(events.map(e => ({ 
                id: e.id, 
                start: e.start, 
                end: e.end, 
                resourceId: e.resourceId
              })));
              
              setTimeout(() => {
                if (this.calendarApi) {
                  const calendarEvents = this.calendarApi.getEvents();
                  console.log('📈 Calendar initialized with', calendarEvents.length, 'events');
                  
                  // Check for duplicates
                  const eventIds = new Set();
                  const duplicates: string[] = [];
                  calendarEvents.forEach((evt: any) => {
                    const key = `${evt.id}-${evt.start}-${evt.end}-${evt.getResources()[0]?.id}`;
                    if (eventIds.has(key)) {
                      duplicates.push(evt.id);
                    } else {
                      eventIds.add(key);
                    }
                  });
                  if (duplicates.length > 0) {
                    console.warn('⚠️ Found duplicate events:', duplicates);
                  }
                }
              }, 100);
            }
          }, 200);
          
          // Don't load data on initial setup - it's already loaded in ngOnInit
          return;
        }
        
        // Update current calendar date on every datesSet call
        this.currentCalendarDate = new Date(arg.view.currentStart);
        
        // Rate limiting: prevent too frequent calls (increase to 2 seconds)
        const now = Date.now();
        if (now - this.lastDatesSetTime < 2000) { // Max 1 call per 2 seconds
          return;
        }
        this.lastDatesSetTime = now;
        
        // Don't reload if we're currently updating events or loading data
        if (this.isUpdatingEvents || this.isLoadingData) {
          return;
        }
        
        const view = this.currentView();
        
        // For day view with getCurrentShifts, be very conservative
        // Only reload if user explicitly navigated to a different day
      if (view === 'day') {
        // Use arg.view.currentStart which is the actual displayed date
        // Convert UTC to local date to avoid timezone issues
        const calendarDateUTC = new Date(arg.view.currentStart);
        const localYear = calendarDateUTC.getFullYear();
        const localMonth = calendarDateUTC.getMonth();
        const localDate = calendarDateUTC.getDate();
        const calendarDate = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
        
        // Update stored calendar date
        this.currentCalendarDate = new Date(calendarDate);
        
        // Check if date actually changed by comparing with last loaded range
        let dateChanged = false;
        if (this.lastLoadedRange) {
          const lastStart = new Date(this.lastLoadedRange.start);
          lastStart.setHours(0, 0, 0, 0);
          
          // Compare dates (ignore time)
          dateChanged = calendarDate.getTime() !== lastStart.getTime();
          
          if (!dateChanged) {
            console.log('⏸️ Same day, skipping reload:', {
              calendarDate: calendarDate.toISOString().split('T')[0],
              lastLoadedDate: lastStart.toISOString().split('T')[0]
            });
            return;
          }
        } else {
          // No previous range, definitely need to load
          dateChanged = true;
        }
        
        console.log('📅 Day navigation detected:', {
          calendarDate: calendarDate.toISOString().split('T')[0],
          calendarDateLocal: calendarDate.toLocaleDateString('uk-UA'),
          previousDate: this.lastLoadedRange?.start.toISOString().split('T')[0],
          previousDateLocal: this.lastLoadedRange?.start.toLocaleDateString('uk-UA'),
          dateChanged,
          argStart: arg.start.toISOString().split('T')[0],
          viewCurrentStart: arg.view.currentStart.toISOString().split('T')[0],
          currentCalendarDate: this.currentCalendarDate?.toISOString().split('T')[0]
        });
        
        // Date changed, load new day's data using the calendar's actual displayed date
        if (dateChanged) {
          // Before loading new day, preserve entries that span across days (overnight shifts)
          // This ensures overnight shifts from previous day are still visible
          this.preserveOvernightShifts(calendarDate);
          
          // For day view, load entries that overlap with the selected day
          // This includes overnight shifts that started previous day and continue into this day
          // Backend filter (StartTime < endDate AND EndTime > startDate) handles this correctly
          await this.loadScheduleDataForRange(calendarDate, calendarDate);
          
          // Force calendar refresh after loading new day
          if (this.calendarApi) {
            this.lastEventsHash = ''; // Force calendar update
            // Use setTimeout to ensure data is loaded before refreshing
            setTimeout(() => {
              if (this.calendarApi) {
                // Update events array directly
                const currentEvents = this.calendarEvents();
                this.calendarApi.removeAllEvents();
                currentEvents.forEach((event) => {
                  try {
                    const resource = this.calendarApi.getResourceById(event.resourceId);
                    if (resource) {
                      this.calendarApi.addEvent(event);
                    }
                  } catch (e) {
                    console.error('Error adding event:', e);
                  }
                });
                this.calendarApi.render();
                console.log('✅ Calendar updated after day navigation with', currentEvents.length, 'events');
              }
            }, 150);
          }
        }
        return;
      }
      
      // Handle week view
      if (view === 'week') {
        // Use arg.view.currentStart which is the actual displayed week start (Monday)
        // Convert UTC to local date to avoid timezone issues
        const weekStartUTC = new Date(arg.view.currentStart);
        const localYear = weekStartUTC.getFullYear();
        const localMonth = weekStartUTC.getMonth();
        const localDate = weekStartUTC.getDate();
        const weekStart = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
        
        // Calculate week end (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Update stored calendar date
        this.currentCalendarDate = new Date(weekStart);
        
        // Check if week actually changed
        let weekChanged = false;
        if (this.lastLoadedRange) {
          const lastStart = new Date(this.lastLoadedRange.start);
          lastStart.setHours(0, 0, 0, 0);
          
          // Compare week start dates
          weekChanged = weekStart.getTime() !== lastStart.getTime();
          
          if (!weekChanged) {
            console.log('⏸️ Same week, skipping reload:', {
              weekStart: weekStart.toISOString().split('T')[0],
              lastLoadedDate: lastStart.toISOString().split('T')[0]
            });
            return;
          }
        } else {
          weekChanged = true;
        }
        
        console.log('📅 Week navigation detected:', {
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          previousDate: this.lastLoadedRange?.start.toISOString().split('T')[0],
          weekChanged
        });
        
        if (weekChanged) {
          await this.loadScheduleDataForRange(weekStart, weekEnd);
          
          if (this.calendarApi) {
            this.lastEventsHash = '';
            setTimeout(() => {
              if (this.calendarApi) {
                // Update events array directly
                const currentEvents = this.calendarEvents();
                this.calendarApi.removeAllEvents();
                currentEvents.forEach((event) => {
                  try {
                    const resource = this.calendarApi.getResourceById(event.resourceId);
                    if (resource) {
                      this.calendarApi.addEvent(event);
                    }
                  } catch (e) {
                    console.error('Error adding event:', e);
                  }
                });
                this.calendarApi.render();
                console.log('✅ Calendar updated after week navigation with', currentEvents.length, 'events');
              }
            }, 150);
          }
        }
        return;
      }
      
      // Handle year view
      const newStart = new Date(arg.start);
      const newEnd = new Date(arg.end);
      
      // Normalize dates for comparison (ignore time for year comparisons)
      const normalizeForComparison = (date: Date) => {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      
      const normalizedNewStart = normalizeForComparison(newStart);
      const normalizedNewEnd = normalizeForComparison(newEnd);
      
      // Check if range actually changed
      if (this.lastLoadedRange) {
        const normalizedLastStart = normalizeForComparison(this.lastLoadedRange.start);
        const normalizedLastEnd = normalizeForComparison(this.lastLoadedRange.end);
        
        if (normalizedNewStart.getTime() === normalizedLastStart.getTime() &&
            normalizedNewEnd.getTime() === normalizedLastEnd.getTime()) {
          // Range hasn't changed, don't reload
          return;
        }
      }
      
      // Reload data only if range actually changed
      this.loadScheduleDataForRange(newStart, newEnd);
      },
    };

    if (view === 'year') {
      baseOptions.initialView = 'dayGridMonth';
      baseOptions.headerToolbar = {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridYear,dayGridMonth',
      };
      // Year view doesn't use resources
      delete (baseOptions as any).resources;
      delete (baseOptions as any).resourceGroupField;
      delete (baseOptions as any).resourceAreaWidth;
      delete (baseOptions as any).resourceOrder;
    }

    this.calendarOptions.set(baseOptions);
    
    console.log('Calendar options updated:', {
      resourcesCount: resources.length,
      eventsCount: events.length,
      view: initialView
    });
    
    // Update resources if calendar is already initialized
    // Events will be updated automatically via eventsFunction
    if (this.calendarApi && view !== 'year') {
      setTimeout(() => {
        const resources = this.calendarResources();
        
        try {
          // Update resources - use getResources() and removeResource() instead of removeAllResources()
          const existingResources = this.calendarApi.getResources();
          existingResources.forEach((resource: any) => {
            try {
              this.calendarApi.removeResource(resource);
            } catch (e) {
              // Ignore errors when removing resources
            }
          });
          if (resources.length > 0) {
            resources.forEach((resource: any) => {
              try {
                this.calendarApi.addResource(resource);
              } catch (e) {
                // Ignore errors when adding resources
              }
            });
          }
          
          // After updating resources, trigger events update via hash reset
          this.lastEventsHash = '';
        } catch (error) {
          console.warn('Error updating resources:', error);
        }
      }, 50);
    }
  }

  setView(view: ScheduleView): void {
    // Reset last loaded range when changing view
    this.lastLoadedRange = null;
    this.currentView.set(view);
    this.updateCalendarOptions();
    // Load data after calendar options are updated
    setTimeout(() => {
      this.loadScheduleData();
    }, 100);
  }

  toggleStateFilter(state: ScheduleState): void {
    const current = this.filterStates();
    this.filterStates.set({
      ...current,
      [state]: !current[state],
    });
    // Calendar will update automatically via computed signal
  }

  toggleQuickFillMode(): void {
    const current = this.isQuickFillMode();
    this.isQuickFillMode.set(!current);
    // Reset selected template when disabling mode
    if (!current) {
      // Mode is being enabled, keep current selection or default to 8 hours
      if (this.selectedTemplate() === null) {
        this.selectedTemplate.set(8);
      }
    } else {
      // Mode is being disabled, clear selection
      this.selectedTemplate.set(null);
    }
  }

  selectTemplate(hours: number): void {
    if (!this.isQuickFillMode()) {
      return;
    }
    this.selectedTemplate.set(hours);
  }

  selectTemplateState(state: ScheduleState): void {
    if (!this.isQuickFillMode()) {
      return;
    }
    this.selectedTemplateState.set(state);
  }

  // Removed department and employee filter handlers

  private getActiveCalendarDate(): Date {
    // Use stored calendar date if available (most accurate)
    if (this.currentCalendarDate) {
      return new Date(this.currentCalendarDate);
    }
    // Fallback to calendar API
    if (this.calendarApi) {
      const calendarDate = this.calendarApi.getDate();
      return new Date(calendarDate);
    }
    // Fallback to last loaded range
    if (this.lastLoadedRange?.start) {
      return new Date(this.lastLoadedRange.start);
    }
    // Last resort: current date
    return new Date();
  }

  private async loadScheduleData(): Promise<void> {
    console.log('loadScheduleData called, view:', this.currentView());
    
    // Only load if calendar is initialized
    if (!this.calendarApi || !this.currentCalendarDate) {
      console.log('⏸️ Calendar not ready, skipping loadScheduleData');
      return;
    }
    
    // Always load data based on the currently displayed calendar date
    const view = this.currentView();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (view === 'day') {
      const day = new Date(this.currentCalendarDate);
      day.setHours(0, 0, 0, 0);
      console.log('Loading day view data for:', day.toISOString().split('T')[0]);
      await this.loadScheduleDataForRange(day, day);
    } else if (view === 'week') {
      const base = new Date(this.currentCalendarDate);
      startDate = new Date(base);
      // Calculate Monday of the week
      const day = base.getDay();
      const diff = base.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // Sunday
      endDate.setHours(23, 59, 59, 999);
      console.log('Loading week view data for:', {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });
      await this.loadScheduleDataForRange(startDate, endDate);
    } else {
      const base = new Date(this.currentCalendarDate);
      startDate = new Date(base.getFullYear(), 0, 1);
      endDate = new Date(base.getFullYear(), 11, 31, 23, 59, 59, 999);
      await this.loadScheduleDataForRange(startDate, endDate);
    }
  }

  private async loadScheduleDataForRange(start: Date, end: Date): Promise<void> {
    console.log('loadScheduleDataForRange called:', {
      start: start.toISOString(),
      end: end.toISOString(),
      isLoadingData: this.isLoadingData,
      isUpdatingEvents: this.isUpdatingEvents
    });
    
    // Prevent concurrent requests
    if (this.isLoadingData) {
      console.log('Already loading data, skipping');
      return;
    }
    
    // Don't load if we're updating events
    if (this.isUpdatingEvents) {
      console.log('Currently updating events, skipping');
      return;
    }
    
    this.isLoadingData = true;
    this.isLoading.set(true);
    
    try {
      const view = this.currentView();
      console.log('Loading data for view:', view);

      if (view === 'day') {
        // For day view, load entries that overlap with the selected day
        // This includes overnight shifts that started previous day and continue into this day
        // Use local date components to ensure correct date regardless of timezone
        const dayStart = new Date(start);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(start);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Log both local and UTC for debugging
        console.log('Fetching entries from API:', {
          localDate: start.toLocaleDateString('uk-UA'),
          startDateLocal: dayStart.toLocaleString('uk-UA'),
          endDateLocal: dayEnd.toLocaleString('uk-UA'),
          startDateUTC: dayStart.toISOString(),
          endDateUTC: dayEnd.toISOString()
        });
        
        const entries = await firstValueFrom(
          this.scheduleService.getEntries({ startDate: dayStart, endDate: dayEnd })
        );
        
        console.log('Entries received from API:', {
          count: entries?.length || 0,
          entries: entries?.map(e => ({
            id: e.id,
            employeeId: e.employeeId,
            startTime: e.startTime,
            endTime: e.endTime,
            state: e.state
          })) || []
        });
        
        // Merge with preserved entries from current state
        // This includes overnight shifts and recently added entries that might not be in server response yet
        const currentEntries = this.scheduleEntries();
        const preservedEntries = currentEntries.filter(entry => {
          const entryStart = new Date(entry.startTime);
          const entryEnd = new Date(entry.endTime);
          
          // Keep entries that:
          // 1. Start before this day and end during/after this day (overnight shift from previous day)
          if (entryStart < dayStart && entryEnd > dayStart) {
            return true;
          }
          
          // 2. Overlap with the current day (entries that span across this day)
          if (entryStart < dayEnd && entryEnd > dayStart) {
            // Only preserve if they're not already in the server response
            // We'll check this later in the merge logic
            return true;
          }
          
          return false;
        });
        
        // Merge: combine preserved entries with new entries from server
        // Server entries take priority (they are the source of truth)
        const serverEntryIds = new Set((entries || []).map(e => e.id));
        const serverEntriesMap = new Map((entries || []).map(e => [e.id, e]));
        
        // Start with server entries (source of truth)
        const mergedEntries: ScheduleEntry[] = [...(entries || [])];
        
        // Add preserved entries that are not in server response (recently added, not yet synced)
        preservedEntries.forEach(preserved => {
          if (!serverEntryIds.has(preserved.id)) {
            // Check if preserved entry overlaps with the current day
            const preservedStart = new Date(preserved.startTime);
            const preservedEnd = new Date(preserved.endTime);
            if (preservedStart < dayEnd && preservedEnd > dayStart) {
              mergedEntries.push(preserved);
            }
          }
        });
        
        // Remove duplicates by ID - use Map to ensure uniqueness
        const entriesMap = new Map<string, ScheduleEntry>();
        mergedEntries.forEach(entry => {
          if (entry.id && !entriesMap.has(entry.id)) {
            entriesMap.set(entry.id, entry);
          }
        });
        const uniqueEntries = Array.from(entriesMap.values());
        
        console.log('Merged entries:', {
          preserved: preservedEntries.length,
          server: entries?.length || 0,
          merged: mergedEntries.length,
          unique: uniqueEntries.length,
          duplicatesRemoved: mergedEntries.length - uniqueEntries.length
        });
        
        // Update entries
        this.scheduleEntries.set(uniqueEntries);
        
        // Store the day (not time) to prevent reloads - CRITICAL: Update this immediately
        // This ensures that subsequent navigation checks work correctly
        this.lastLoadedRange = { start: new Date(dayStart), end: new Date(dayEnd) };
        
        // Reset hash to trigger events effect and update calendar
        this.lastEventsHash = '';
        
        // Log for debugging
        console.log('Loaded schedule data for day:', {
          date: dayStart.toISOString().split('T')[0],
          entriesCount: uniqueEntries.length,
          overnightShifts: uniqueEntries.filter(e => {
            const eStart = new Date(e.startTime);
            const eEnd = new Date(e.endTime);
            return eStart < dayStart && eEnd > dayStart;
          }).length,
          allEntries: uniqueEntries.map(e => ({
            id: e.id,
            start: e.startTime,
            end: e.endTime,
            employeeId: e.employeeId,
            state: e.state
          })),
          lastLoadedRange: this.lastLoadedRange,
          resourcesCount: this.calendarResources().length,
          filteredEntriesCount: this.filteredEntries().length,
          calendarEventsCount: this.calendarEvents().length
        });
        
        // Update calendar immediately after loading data
        if (this.calendarApi) {
          const currentEvents = this.calendarEvents();
          this.calendarApi.removeAllEvents();
          currentEvents.forEach((event) => {
            try {
              const resource = this.calendarApi.getResourceById(event.resourceId);
              if (resource) {
                this.calendarApi.addEvent(event);
              }
            } catch (e) {
              console.error('Error adding event:', e);
            }
          });
          this.calendarApi.render();
          console.log('✅ Calendar updated after loadScheduleDataForRange with', currentEvents.length, 'events');
        }
      } else {
        const entries = await firstValueFrom(
          this.scheduleService.getEntries({ startDate: start, endDate: end })
        );
        
        // Remove duplicates by ID
        const entriesMap = new Map<string, ScheduleEntry>();
        (entries || []).forEach(entry => {
          if (entry.id && !entriesMap.has(entry.id)) {
            entriesMap.set(entry.id, entry);
          }
        });
        const uniqueEntries = Array.from(entriesMap.values());
        
        this.scheduleEntries.set(uniqueEntries);
        this.lastLoadedRange = { start: new Date(start), end: new Date(end) };
        
        // Reset hash to trigger events effect
        this.lastEventsHash = '';
        
        // Update calendar immediately after loading data
        if (this.calendarApi) {
          setTimeout(() => {
            if (this.calendarApi) {
              const currentEvents = this.calendarEvents();
                this.calendarApi.removeAllEvents();
                currentEvents.forEach((event) => {
                  try {
                    const resource = this.calendarApi.getResourceById(event.resourceId);
                    if (resource) {
                      this.calendarApi.addEvent(event);
                    }
                  } catch (e) {
                    console.error('Error adding event:', e);
                  }
                });
                this.calendarApi.render();
                console.log('✅ Calendar updated after loadScheduleDataForRange (week/year) with', currentEvents.length, 'events');
            }
          }, 50);
        }
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      this.toastService.error('Помилка завантаження графіка');
    } finally {
      this.isLoading.set(false);
      
      // Force calendar events to recompute by resetting hash AFTER isLoadingData is set to false
      // This ensures the effect will trigger and update the calendar
      this.lastEventsHash = '';
      
      // Add delay before allowing next load to prevent rapid-fire requests
      setTimeout(() => {
        this.isLoadingData = false;
        
        // Reset hash to trigger events effect
        this.lastEventsHash = '';
      }, 100);
    }
  }
  
  // Removed setMode - always in build mode

  private async loadDepartments(): Promise<void> {
    try {
      const depts = await firstValueFrom(this.departmentService.getAllDepartments());
      this.departments.set(depts || []);
      console.log('Departments loaded:', depts?.length || 0);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  private async loadEmployees(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.employeeService.getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc')
      );
      const employees = response?.items || [];
      this.employees.set(employees);
      console.log('Employees loaded:', employees.length);
      console.log('Resources computed:', this.calendarResources().length);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  private getStateColor(state: ScheduleState): string {
    const colors: Record<ScheduleState, string> = {
      Training: '#3b82f6', // Blue
      OnWork: '#10b981', // Green
      Rest: '#6b7280', // Gray
      Vacation: '#f59e0b', // Amber
      Illness: '#ef4444', // Red
    };
    return colors[state] || '#6b7280';
  }

  private handleDateSelect(selectInfo: DateSelectArg): void {
    // Prevent double processing
    const now = Date.now();
    if (this.isProcessingSelection || (now - this.lastSelectionTime < 500)) {
      selectInfo.view.calendar.unselect();
      return;
    }
    
    this.isProcessingSelection = true;
    this.lastSelectionTime = now;
    
    // Convert to local time to avoid timezone issues
    const startUTC = new Date(selectInfo.start);
    const startLocal = new Date(
      startUTC.getFullYear(),
      startUTC.getMonth(),
      startUTC.getDate(),
      startUTC.getHours(),
      startUTC.getMinutes(),
      0,
      0
    );
    
    const endUTC = selectInfo.end ? new Date(selectInfo.end) : new Date(startLocal.getTime() + 3600000);
    const endLocal = selectInfo.end ? new Date(
      endUTC.getFullYear(),
      endUTC.getMonth(),
      endUTC.getDate(),
      endUTC.getHours(),
      endUTC.getMinutes(),
      0,
      0
    ) : new Date(startLocal.getTime() + 3600000);
    
    const resourceId = (selectInfo as any).resource?.id;
    
    console.log('📅 Date selected:', {
      startUTC: startUTC.toISOString(),
      startLocal: startLocal.toLocaleString('uk-UA'),
      endUTC: endUTC.toISOString(),
      endLocal: endLocal.toLocaleString('uk-UA'),
      resourceId
    });
    
    this.openEntryForSelection(startLocal, endLocal, resourceId, selectInfo.view.calendar, true);
    
    // Reset flag after processing
    setTimeout(() => {
      this.isProcessingSelection = false;
    }, 500);
  }

  private handleDateClick(clickInfo: DateClickArg): void {
    // Prevent double processing (if select already handled it)
    const now = Date.now();
    if (this.isProcessingSelection || (now - this.lastSelectionTime < 500)) {
      return;
    }
    
    this.isProcessingSelection = true;
    this.lastSelectionTime = now;
    
    // Use the exact clicked time from clickInfo.date
    // For resource timeline, clickInfo.date contains the exact timestamp of the clicked slot
    // Convert to local date to avoid timezone issues
    const clickedDateUTC = new Date(clickInfo.date);
    const localYear = clickedDateUTC.getFullYear();
    const localMonth = clickedDateUTC.getMonth();
    const localDate = clickedDateUTC.getDate();
    const localHours = clickedDateUTC.getHours();
    const localMinutes = clickedDateUTC.getMinutes();
    
    // Create date in local timezone
    const start = new Date(localYear, localMonth, localDate, localHours, localMinutes, 0, 0);
    
    const end = new Date(start.getTime() + 3600000); // Default 1 hour for single click
    const resourceId = (clickInfo as any).resource?.id;
    
    console.log('🖱️ Date clicked:', {
      clickedTimeUTC: clickedDateUTC.toISOString(),
      clickedTimeLocal: start.toLocaleString('uk-UA'),
      clickedHour: start.getHours(),
      clickedMinutes: start.getMinutes(),
      resourceId,
      dateStr: (clickInfo as any).dateStr,
      allDay: clickInfo.allDay
    });
    
    this.openEntryForSelection(start, end, resourceId, clickInfo.view.calendar, false);
    
    // Reset flag after processing
    setTimeout(() => {
      this.isProcessingSelection = false;
    }, 500);
  }

  private openEntryForSelection(
    start: Date,
    end: Date,
    resourceId: string | undefined,
    calendar: any,
    shouldUnselect: boolean
  ): void {
    if (!resourceId) {
      this.toastService.warning('Виберіть працівника для створення запису');
      if (shouldUnselect) {
        calendar.unselect();
      }
      return;
    }

    // Find employee to get department
    const employee = this.employees().find(e => e.id === resourceId);
    if (!employee) {
      this.toastService.error('Не вдалося знайти працівника');
      if (shouldUnselect) {
        calendar.unselect();
      }
      return;
    }

    // Check if employee has a department, if not, show error
    if (!employee.departmentId) {
      this.toastService.error('Працівник не має призначеного відділу. Будь ласка, призначте відділ працівнику перед створенням графіка.');
      if (shouldUnselect) {
        calendar.unselect();
      }
      return;
    }

      // Quick Fill Mode: Create entry immediately with template duration
      if (this.isQuickFillMode() && this.selectedTemplate() !== null) {
        // Use exact clicked time - ensure we use the precise timestamp
        // Round to nearest minute to avoid sub-minute precision issues
        const preciseStart = new Date(start);
        preciseStart.setSeconds(0, 0); // Round to minute
        
        // Prevent duplicate creation - create unique key for this entry
        const entryKey = `${resourceId}-${preciseStart.toISOString()}-${this.selectedTemplate()}`;
        
        if (this.isCreatingQuickEntry || this.lastQuickEntryKey === entryKey) {
          console.log('⏸️ Quick entry creation already in progress or duplicate, skipping');
          if (shouldUnselect) {
            calendar.unselect();
          }
          return;
        }
        
        this.isCreatingQuickEntry = true;
        this.lastQuickEntryKey = entryKey;
        
        const templateHours = this.selectedTemplate()!;
        const endTime = this.calculateShiftEnd(preciseStart, templateHours);
        const selectedState = this.selectedTemplateState();
        
        console.log('⚡ Creating quick template entry:', {
          start: preciseStart.toISOString(),
          startLocal: preciseStart.toLocaleString('uk-UA'),
          end: endTime.toISOString(),
          endLocal: endTime.toLocaleString('uk-UA'),
          hours: templateHours,
          state: selectedState
        });
        
        this.createQuickTemplateEntry({
          employeeId: resourceId,
          startTime: preciseStart.toISOString(),
          endTime: endTime.toISOString(),
          state: selectedState,
          departmentId: employee.departmentId,
        }).finally(() => {
          // Reset flags after creation completes
          setTimeout(() => {
            this.isCreatingQuickEntry = false;
            this.lastQuickEntryKey = '';
          }, 1000);
        });
        
        if (shouldUnselect) {
          calendar.unselect();
        }
        return;
      }

    // Validate time range using absolute timestamp comparison (allows overnight shifts)
    if (end.getTime() <= start.getTime()) {
      this.toastService.warning('Час закінчення повинен бути після часу початку');
      if (shouldUnselect) {
        calendar.unselect();
      }
      return;
    }

    // Open modal for creating new entry
    this.modalEntry.set(null);
    this.modalStartTime.set(start);
    this.modalEndTime.set(end);
    this.modalSelectedEmployeeId.set(resourceId);
    this.modalSelectedDepartmentId.set(employee.departmentId);
    this.isModalOpen.set(true);

    if (shouldUnselect) {
      calendar.unselect();
    }
  }


  async onModalSave(entry: ScheduleEntryCreate | ScheduleEntryUpdate): Promise<void> {
    if ('id' in entry) {
      await this.updateScheduleEntry(entry, true);
    } else {
      await this.createScheduleEntry(entry);
    }
    this.closeModal();
    // Reset hash to trigger events effect
    this.lastEventsHash = '';
  }

  onModalDelete(id: string): void {
    this.deleteScheduleEntry(id);
    this.closeModal();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.modalEntry.set(null);
    this.modalStartTime.set(null);
    this.modalEndTime.set(null);
    this.modalSelectedEmployeeId.set(null);
    this.modalSelectedDepartmentId.set(null);
  }

  private async createScheduleEntry(create: ScheduleEntryCreate): Promise<void> {
    try {
      const result = await firstValueFrom(this.scheduleService.createOrUpdate(create));
      this.toastService.success('Запис створено');
      
      // Entry is now saved to server
      const entryId = (result as any).id;
      if (entryId) {
        this.pendingChanges.delete(entryId);
      }
      const savedEntry = ((result as any).entry || result) as ScheduleEntry | null;
      if (savedEntry && savedEntry.id) {
        // Add entry to local state immediately (before reload)
        const currentEntries = this.scheduleEntries();
        const existingIndex = currentEntries.findIndex(e => e.id === savedEntry.id);
        const newEntries = [...currentEntries];
        if (existingIndex >= 0) {
          newEntries[existingIndex] = savedEntry;
        } else {
          newEntries.push(savedEntry);
        }
        this.scheduleEntries.set(newEntries);
        
        // Reset hash to trigger events effect
        this.lastEventsHash = '';
        
        // Update calendar immediately with new events
        if (this.calendarApi) {
          const currentEvents = this.calendarEvents();
          this.calendarApi.removeAllEvents();
          currentEvents.forEach((event) => {
            try {
              const resource = this.calendarApi.getResourceById(event.resourceId);
              if (resource) {
                this.calendarApi.addEvent(event);
              }
            } catch (e) {
              console.error('Error adding event:', e);
            }
          });
          this.calendarApi.render();
          console.log('✅ Calendar updated immediately after creating entry with', currentEvents.length, 'events');
        }
      }
      
      // Reload data from server to ensure synchronization (async, after immediate update)
      await this.loadScheduleData();
    } catch (error: any) {
      console.error('Error creating schedule entry:', error);
      const errorMessage = error?.error?.message || 'Помилка створення запису';
      this.toastService.error(errorMessage);
    }
  }

  private async createQuickTemplateEntry(create: ScheduleEntryCreate): Promise<void> {
    try {
      const result = await firstValueFrom(this.scheduleService.createOrUpdate(create));
      this.toastService.success(`Зміна створена (${this.selectedTemplate()} год)`);
      
      // Backend returns: { message: "...", id: "...", entry: {...} }
      const entryId = (result as any).id;
      const entryData = (result as any).entry;
      
      // Entry is now saved to server, remove from pending changes
      if (entryId) {
        this.pendingChanges.delete(entryId);
      }
      const savedEntry = (entryData || result) as ScheduleEntry | null;
      if (savedEntry && savedEntry.id) {
        // Check if entry already exists to prevent duplicates
        const currentEntries = this.scheduleEntries();
        const existingIndex = currentEntries.findIndex(e => e.id === savedEntry.id);
        
        // Only add if it doesn't exist (prevent duplicates)
        if (existingIndex === -1) {
          const newEntries = [...currentEntries, savedEntry];
          this.scheduleEntries.set(newEntries);
          
          // Reset hash to trigger events effect
          this.lastEventsHash = '';
          
          // Update calendar immediately with new events
          if (this.calendarApi) {
            const currentEvents = this.calendarEvents();
            this.calendarApi.removeAllEvents();
            currentEvents.forEach((event) => {
              try {
                const resource = this.calendarApi.getResourceById(event.resourceId);
                if (resource) {
                  this.calendarApi.addEvent(event);
                }
              } catch (e) {
                console.error('Error adding event:', e);
              }
            });
            this.calendarApi.render();
            console.log('✅ Calendar updated immediately after quick template entry with', currentEvents.length, 'events');
          }
        } else {
          console.log('⚠️ Entry already exists, skipping duplicate:', savedEntry.id);
        }
      } else {
        console.warn('⚠️ No saved entry returned from server');
      }
      
      // Reload data from server to ensure synchronization
      await this.loadScheduleData();
    } catch (error: any) {
      console.error('Error creating quick template entry:', error);
      const errorMessage = error?.error?.message || 'Помилка створення запису';
      this.toastService.error(errorMessage);
    }
  }

  private handleEventClick(clickInfo: EventClickArg): void {
    // Handle event click for editing/deleting
    // Always allow editing (always in build mode)

    const entry = clickInfo.event.extendedProps['entry'] as ScheduleEntry;
    if (!entry) {
      return;
    }

    // Open modal for editing
    this.modalEntry.set(entry);
    this.modalStartTime.set(new Date(entry.startTime));
    this.modalEndTime.set(new Date(entry.endTime));
    this.modalSelectedEmployeeId.set(entry.employeeId);
    this.modalSelectedDepartmentId.set(entry.departmentId);
    
    this.isModalOpen.set(true);
  }

  private async deleteScheduleEntry(id: string): Promise<void> {
    try {
      // Remove from local state immediately
      const currentEntries = this.scheduleEntries();
      const filteredEntries = currentEntries.filter(e => e.id !== id);
      this.scheduleEntries.set(filteredEntries);
      
      // Remove from pending changes
      this.pendingChanges.delete(id);
      
      // Reset hash to trigger events effect
      this.lastEventsHash = '';
      
      // Update calendar immediately with updated events
      if (this.calendarApi) {
        const currentEvents = this.calendarEvents();
        this.calendarApi.removeAllEvents();
        currentEvents.forEach((event) => {
          try {
            const resource = this.calendarApi.getResourceById(event.resourceId);
            if (resource) {
              this.calendarApi.addEvent(event);
            }
          } catch (e) {
            console.error('Error adding event:', e);
          }
        });
        this.calendarApi.render();
        console.log('✅ Calendar updated immediately after delete (before server) with', currentEvents.length, 'events');
      }
      
      // Delete from server
      await firstValueFrom(this.scheduleService.delete(id));
      this.toastService.success('Запис видалено');
      
      // Reload data from server to ensure synchronization
      await this.loadScheduleData();
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      this.toastService.error('Помилка видалення запису');
      
      // Revert local state on error by reloading data
      await this.loadScheduleData();
    }
  }

  private handleEventDrop(changeInfo: EventChangeArg): void {
    // Handle drag-and-drop - only called when drag is complete
    // Prevent recursive calls
    if (this.isUpdatingEntry) {
      return;
    }
    this.processEventChange(changeInfo, false); // false = don't show notification for drag
  }

  private handleEventResize(changeInfo: EventChangeArg): void {
    // Handle resize - only called when resize is complete
    // Prevent recursive calls
    if (this.isUpdatingEntry) {
      return;
    }
    this.processEventChange(changeInfo, false); // false = don't show notification for resize
  }

  private processEventChange(changeInfo: EventChangeArg, showNotification: boolean = true): void {
    const event = changeInfo.event;
    const entry = event.extendedProps['entry'] as ScheduleEntry;
    
    if (!entry) {
      return;
    }

    const newStart = event.start!;
    const newEnd = event.end || newStart;
    const newResourceId = event.getResources()[0]?.id;

    // Validate time range using absolute timestamp comparison (allows overnight shifts)
    if (newEnd.getTime() <= newStart.getTime()) {
      this.toastService.warning('Час закінчення повинен бути після часу початку');
      this.loadScheduleData(); // Revert changes
      return;
    }

    // Find employee to get department if resource changed
    let departmentId = entry.departmentId;
    let employeeId = entry.employeeId;
    
    if (newResourceId && newResourceId !== entry.employeeId) {
      const employee = this.employees().find(e => e.id === newResourceId);
      if (!employee) {
        this.toastService.error('Не вдалося знайти працівника');
        this.loadScheduleData(); // Revert changes
        return;
      }
      if (!employee.departmentId) {
        this.toastService.error('Працівник не має призначеного відділу. Будь ласка, призначте відділ працівнику.');
        this.loadScheduleData(); // Revert changes
        return;
      }
      departmentId = employee.departmentId;
      employeeId = newResourceId;
    }

    const update: ScheduleEntryUpdate = {
      id: entry.id,
      employeeId: employeeId,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      state: entry.state,
      departmentId: departmentId,
    };

    // Update immediately (no debounce needed since eventDrop/eventResize only fire once)
    this.updateScheduleEntry(update, showNotification);
  }

  private async updateScheduleEntry(update: ScheduleEntryUpdate, showNotification: boolean = true): Promise<void> {
    // Prevent recursive calls
    if (this.isUpdatingEntry) {
      return;
    }
    
    this.isUpdatingEntry = true;
    
    try {
      const result = await firstValueFrom(
        this.scheduleService.createOrUpdate(update)
      );
      
      // Only show notification if explicitly requested (not for drag/resize operations)
      if (showNotification) {
        this.toastService.success('Графік оновлено');
      }
      
      // Update the local entry in scheduleEntries signal immediately
      const currentEntries = this.scheduleEntries();
      const entryIndex = currentEntries.findIndex(e => e.id === update.id);
      
      let updatedEntry: ScheduleEntry | null = null;
      
      if (entryIndex !== -1) {
        // Calculate hours from the time difference
        const startTime = new Date(update.startTime);
        const endTime = new Date(update.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // Update the entry with new times
        updatedEntry = {
          ...currentEntries[entryIndex],
          startTime: update.startTime,
          endTime: update.endTime,
          hours: hours,
          employeeId: update.employeeId,
          departmentId: update.departmentId,
          state: update.state,
        };
        
        const newEntries = [...currentEntries];
        newEntries[entryIndex] = updatedEntry;
        this.scheduleEntries.set(newEntries);
        
        // Mark as pending change (will be saved to server)
        this.pendingChanges.add(update.id);
      }
      
      // Entry is now saved to server, remove from pending changes
      this.pendingChanges.delete(update.id);
      
      // Reset hash to trigger events effect
      this.lastEventsHash = '';
      
      // Update calendar immediately
      if (this.calendarApi) {
        const currentEvents = this.calendarEvents();
        this.calendarApi.removeAllEvents();
        currentEvents.forEach((event) => {
          try {
            const resource = this.calendarApi.getResourceById(event.resourceId);
            if (resource) {
              this.calendarApi.addEvent(event);
            }
          } catch (e) {
            console.error('Error adding event:', e);
          }
        });
        this.calendarApi.render();
        console.log('✅ Calendar updated immediately after updating entry with', currentEvents.length, 'events');
      }
      
      // Reload data from server to ensure synchronization
      await this.loadScheduleData();
      
    } catch (error: any) {
      console.error('Error updating schedule entry:', error);
      const errorMessage = error?.error?.message || 'Помилка оновлення графіка';
      this.toastService.error(errorMessage);
      
      // Revert calendar changes by reloading data
      await this.loadScheduleData();
      this.lastEventsHash = ''; // Reset hash to force update
      
      setTimeout(() => {
        if (this.calendarApi) {
          this.calendarApi.render();
        }
      }, 200);
    } finally {
      // Reset flag after a short delay to allow calendar to process the update
      setTimeout(() => {
        this.isUpdatingEntry = false;
      }, 300);
    }
  }
}
