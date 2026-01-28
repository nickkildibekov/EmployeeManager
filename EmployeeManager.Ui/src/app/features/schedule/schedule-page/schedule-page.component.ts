import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayPilot, DayPilotModule, DayPilotSchedulerComponent } from '@daypilot/daypilot-lite-angular';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ScheduleService } from '../schedule.service';
import { ScheduleEntry, ScheduleState, ScheduleEntryCreate, ScheduleEntryUpdate } from '../../../shared/models/schedule-entry.model';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { ToastService } from '../../../shared/services/toast.service';

type ScheduleView = 'day' | 'week' | 'year';

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [CommonModule, DayPilotModule],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.css',
})
export class SchedulePageComponent implements OnInit, AfterViewInit, OnDestroy {
  private scheduleService = inject(ScheduleService);
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);
  private toastService = inject(ToastService);

  @ViewChild('scheduler', { static: false })
  scheduler!: DayPilotSchedulerComponent;

  // View state - default to day view
  currentView = signal<ScheduleView>('day');
  currentDate = signal<DayPilot.Date>(DayPilot.Date.today());

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

  // Quick Template state
  isQuickFillMode = signal<boolean>(false);
  selectedTemplate = signal<number | null>(null);
  selectedTemplateState = signal<ScheduleState>('OnWork');

  // Delete confirmation modal state
  isDeleteModalOpen = signal(false);
  entryToDelete = signal<ScheduleEntry | null>(null);

  // State colors mapping
  private stateColors: Record<ScheduleState, string> = {
    Training: '#3b82f6',
    OnWork: '#10b981',
    Rest: '#6b7280',
    Vacation: '#f59e0b',
    Illness: '#ef4444',
  };

  // Computed: filtered entries based on state filters
  filteredEntries = computed(() => {
    const entries = this.scheduleEntries();
    const filters = this.filterStates();

    return entries.filter((entry) => {
      return filters[entry.state as ScheduleState];
    });
  });

  // Computed: hierarchical resources (departments with employees as children)
  // DayPilot Lite doesn't support children property, so we use flat list with visual indentation
  schedulerResources = computed(() => {
    const employees = this.employees();
    const departments = this.departments();

    if (employees.length === 0) {
      return [];
    }

    // Group employees by department
    const grouped = employees.reduce((acc, emp) => {
      const dept = departments.find(d => d.id === emp.departmentId);
      const deptId = dept?.id || 'no-dept';
      const deptName = dept?.name || 'Без відділу';
      
      if (!acc[deptId]) {
        acc[deptId] = {
          id: deptId,
          name: deptName,
          employees: []
        };
      }
      acc[deptId].employees.push(emp);
      return acc;
    }, {} as Record<string, { id: string; name: string; employees: typeof employees }>);

    // Sort departments by name
    const sortedDeptIds = Object.keys(grouped).sort((a, b) => 
      grouped[a].name.localeCompare(grouped[b].name, 'uk')
    );

    // Build flat list with hierarchical visual structure
    const resources: DayPilot.ResourceData[] = [];
    
    sortedDeptIds.forEach(deptId => {
      const dept = grouped[deptId];
      
      // Add department as parent (non-selectable, visual only)
      resources.push({
        id: `dept-${deptId}`,
        name: dept.name,
        tags: {
          departmentId: deptId,
          departmentName: dept.name,
          isDepartment: true,
        },
        cssClass: 'dp-resource-department',
      });
      
      // Sort employees within department by CallSign, then by name
      const sortedEmployees = [...dept.employees].sort((a, b) => {
        if (a.callSign && b.callSign) {
          return a.callSign.localeCompare(b.callSign, 'uk');
        }
        if (a.callSign) return -1;
        if (b.callSign) return 1;
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return nameA.localeCompare(nameB, 'uk');
      });

      // Add employees as children with indentation
      sortedEmployees.forEach(emp => {
        // Build name: use callSign if it exists and is not empty, otherwise use firstName + lastName
        let displayName = '';
        if (emp.callSign && emp.callSign.trim() !== '') {
          displayName = emp.callSign;
        } else {
          const firstName = emp.firstName || '';
          const lastName = emp.lastName || '';
          displayName = `${firstName} ${lastName}`.trim() || `Employee ${emp.id.substring(0, 8)}`;
        }

        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || displayName;

        resources.push({
          id: emp.id,
          name: `  ${displayName}`, // Indent with spaces for visual hierarchy
          tags: {
            departmentId: emp.departmentId,
            departmentName: dept.name,
            employeeName: fullName,
            callSign: emp.callSign || '',
            isEmployee: true,
          },
          cssClass: 'dp-resource-employee',
        });
      });
    });

    return resources;
  });

  /** Convert ISO string or Date to DayPilot.Date using local timezone so grid position matches displayed time */
  private toDayPilotDateLocal(isoOrDate: string | Date): DayPilot.Date {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return new DayPilot.Date(d, true);
  }

  // Format time with timezone offset (same approach as schedule-entry-modal)
  // This ensures the server interprets the time correctly as local time
  private formatWithTimezone(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset >= 0 ? '+' : '-';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  }

  // Computed: scheduler events from filtered entries
  schedulerEvents = computed<DayPilot.EventData[]>(() => {
    const filtered = this.filteredEntries();
    const resources = this.schedulerResources();
    
    // Collect all employee IDs (skip department resources)
    const resourceIds = new Set<string>();
    resources.forEach(resource => {
      const resourceId = String(resource.id || '');
      // Only include actual employee resources, not department headers
      if (resource.tags?.isEmployee === true && !resourceId.startsWith('dept-')) {
        resourceIds.add(resourceId);
      }
    });

    return filtered
      .filter(entry => resourceIds.has(entry.employeeId))
      .map((entry) => {
        // Use local time so scheduler cells match displayed hours
        const start = this.toDayPilotDateLocal(entry.startTime);
        const end = this.toDayPilotDateLocal(entry.endTime);

        // Format time for display: local hours only (e.g. "05 - 08")
        const startDate = new Date(entry.startTime);
        const endDate = new Date(entry.endTime);
        const startTimeStr = String(startDate.getHours()).padStart(2, '0');
        const endTimeStr = String(endDate.getHours()).padStart(2, '0');
        const title = `${startTimeStr} - ${endTimeStr}`;

        return {
          id: entry.id,
          text: title,
          start: start,
          end: end,
          resource: entry.employeeId,
          backColor: this.stateColors[entry.state as ScheduleState] || '#6b7280',
          tags: {
            entry: entry,
            state: entry.state,
          },
        };
      });
  });

  // View-dependent options (day/week/year); updated by updateSchedulerConfig()
  // Initialize with day view settings (default view)
  private viewOptions = signal<Partial<DayPilot.SchedulerConfig>>({
    startDate: DayPilot.Date.today(),
    days: 1,
    scale: 'Hour',
    timeHeaders: [
      { groupBy: 'Day', format: 'dddd MMMM d, yyyy' },
      { groupBy: 'Hour', format: 'HH:mm' }
    ],
    cellWidth: 60,
  });

  // Base scheduler options (static; view options and resources/events come from signals/computed)
  private getBaseConfig(): DayPilot.SchedulerConfig {
    return {
      eventHeight: 50,
      rowHeaderWidth: 250,
      rowMarginTop: 2,
      rowMarginBottom: 2,
      durationBarVisible: false,
      timeRangeSelectedHandling: 'Enabled',
      eventMoveHandling: 'Update',
      eventResizeHandling: 'Update',
      onBeforeRowHeaderRender: (args) => {
        // Style department rows differently
        // Access resource data through row.data (which contains the ResourceData)
        const resourceData = args.row.data;
        if (resourceData?.tags?.isDepartment) {
          args.row.cssClass = 'dp-row-department';
          args.row.html = `<strong>${resourceData.name || ''}</strong>`;
        } else if (resourceData?.tags?.isEmployee) {
          args.row.cssClass = 'dp-row-employee';
        }
      },
      onBeforeCellRender: (args: any) => {
        const view = this.currentView();
        if (view === 'week') {
          // Check if this is the last cell of a day (every 24th hour)
          // DayPilot uses start property to identify time slots
          try {
            const start = args.start || args.time;
            if (start) {
              const startDate = start instanceof Date ? start : start.toDate();
              const hour = startDate.getHours();
              const minutes = startDate.getMinutes();
              
              // If it's 23:00 (last hour of day), make border thicker
              if (hour === 23 && minutes === 0) {
                if (args.cell) {
                  args.cell.cssClass = (args.cell.cssClass || '') + ' dp-day-separator';
                } else if (args.cssClass !== undefined) {
                  args.cssClass = (args.cssClass || '') + ' dp-day-separator';
                }
              }
              // If it's 00:00 (first hour of day), make border after it thicker
              if (hour === 0 && minutes === 0) {
                if (args.cell) {
                  args.cell.cssClass = (args.cell.cssClass || '') + ' dp-after-midnight';
                } else if (args.cssClass !== undefined) {
                  args.cssClass = (args.cssClass || '') + ' dp-after-midnight';
                }
              }
            }
          } catch (error) {
            // Ignore errors in cell rendering
          }
        }
      },
      onBeforeTimeHeaderRender: (args) => {
        const view = this.currentView();
        
        // Translate day names to Ukrainian
        const headerText = args.header.text || '';
        const dayNamesMap: Record<string, string> = {
          'Monday': 'Понеділок',
          'Tuesday': 'Вівторок',
          'Wednesday': 'Середа',
          'Thursday': 'Четвер',
          'Friday': 'П\'ятниця',
          'Saturday': 'Субота',
          'Sunday': 'Неділя',
          'Mon': 'Понеділок',
          'Tue': 'Вівторок',
          'Wed': 'Середа',
          'Thu': 'Четвер',
          'Fri': 'П\'ятниця',
          'Sat': 'Субота',
          'Sun': 'Неділя'
        };
        
        const monthNamesMap: Record<string, string> = {
          'January': 'січня', 'February': 'лютого', 'March': 'березня', 'April': 'квітня',
          'May': 'травня', 'June': 'червня', 'July': 'липня', 'August': 'серпня',
          'September': 'вересня', 'October': 'жовтня', 'November': 'листопада', 'December': 'грудня'
        };
        
        // First, check if this is a date header (not hour header)
        if (/^\d{2}:\d{2}$/.test(headerText.trim())) {
          // This is an hour header, hide it in week view
          if (view === 'week') {
            args.header.html = '';
            args.header.cssClass = 'dp-time-header-hour-hidden';
          }
          return;
        }
        
        // Parse the date format: "Wednesday January 28, 2026" or "Wednesday January 28"
        const dateMatch = headerText.match(/(\w+)\s+(\w+)\s+(\d+)(?:\s*,\s*(\d+))?/);
        if (dateMatch) {
          const [, dayNameEn, monthNameEn, day, year] = dateMatch;
          
          // Translate day and month names
          const dayName = dayNamesMap[dayNameEn] || dayNameEn;
          const monthName = monthNamesMap[monthNameEn] || monthNameEn;
          
          // Format to Ukrainian: "Середа 28 січня 2026" or "Середа 28 січня"
          const translatedText = year 
            ? `${dayName} ${day} ${monthName} ${year}`
            : `${dayName} ${day} ${monthName}`;
          
          args.header.html = translatedText;
        } else {
          // If no date match, just translate day/month names
          let translatedText = headerText;
          for (const [en, uk] of Object.entries(dayNamesMap)) {
            translatedText = translatedText.replace(new RegExp(`\\b${en}\\b`, 'gi'), uk);
          }
          for (const [en, uk] of Object.entries(monthNamesMap)) {
            translatedText = translatedText.replace(new RegExp(`\\b${en}\\b`, 'gi'), uk);
          }
          if (translatedText !== headerText) {
            args.header.html = translatedText;
          }
        }
        
      },
      onTimeRangeSelected: async (args) => {
        // Check if the selected resource is a department row
        const resourceId = String(args.resource || '');
        if (resourceId.startsWith('dept-')) {
          args.control.clearSelection();
          return;
        }
        await this.handleTimeRangeSelected(args);
      },
      eventClickHandling: 'Enabled',
      onEventMove: async (args) => {
        await this.handleEventMove(args);
      },
      onEventResize: async (args) => {
        await this.handleEventResize(args);
      },
      onBeforeEventRender: (args) => {
        this.onBeforeEventRender(args);
      },
      onEventClick: async (args) => {
        await this.handleEventClick(args);
      },
    };
  }

  // Scheduler config: base + view options + resources + events so DayPilot syncs them to the control
  config = computed<DayPilot.SchedulerConfig>(() => ({
    ...this.getBaseConfig(),
    ...this.viewOptions(),
    resources: this.schedulerResources(),
    events: this.schedulerEvents(),
  }));

  private isLoadingData = false;
  private lastLoadedRange: { start: Date; end: Date } | null = null;
  private isUpdatingEntry = false;
  private isCreatingQuickEntry = false;
  private lastQuickEntryKey = '';
  private isDestroyed = false;
  private initTimeoutId: any = null;
  private resizeHandler: (() => void) | null = null;
  private resizeTimeoutId: any = null;

  // Helper method to safely access scheduler control
  private getSchedulerControl() {
    if (this.isDestroyed) {
      return null;
    }
    if (!this.scheduler || !this.scheduler.control) {
      return null;
    }
    // Check if control is disposed by trying to access it
    try {
      // Try to access a property to check if disposed
      // If control is disposed, this will throw an error
      this.scheduler.control.visibleStart();
      return this.scheduler.control;
    } catch (error) {
      // Control is disposed or not ready
      if (error instanceof Error && error.message.includes('disposed')) {
        console.warn('Елемент керування розкладом видалено');
      }
      return null;
    }
  }

  // Helper method to safely update scheduler
  private safeUpdateScheduler(updateFn: (control: any) => void): void {
    if (this.isDestroyed) {
      return;
    }
    const control = this.getSchedulerControl();
    if (!control) {
      return;
    }
    try {
      updateFn(control);
    } catch (error) {
      // Ignore disposed errors silently
      if (error instanceof Error && error.message.includes('disposed')) {
        return;
      }
      console.error('Помилка оновлення розкладу:', error);
    }
  }

  constructor() {
    // Resources and events are included in config (computed); DayPilot component syncs config to the control,
    // so no separate effect is needed for control.update({ resources, events }).
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadDepartments(),
      this.loadEmployees()
    ]);
    
    // Initialize scheduler config after data is loaded
    this.updateSchedulerConfig();
  }

  async ngAfterViewInit(): Promise<void> {
    // Clear any pending initialization
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
    }

    // Wait for scheduler to be initialized
    this.initTimeoutId = setTimeout(async () => {
      if (this.isDestroyed) {
        return;
      }

      const control = this.getSchedulerControl();
      if (!control) {
        console.warn('Розклад ще не ініціалізовано, повторна спроба...');
        // Retry after a bit more time (only if not destroyed)
        if (!this.isDestroyed) {
          this.initTimeoutId = setTimeout(() => {
            if (!this.isDestroyed) {
              this.ngAfterViewInit();
            }
          }, 200);
        }
        return;
      }

      try {
        // Ensure scheduler is updated with correct config, resources, and events
        this.safeUpdateScheduler((ctrl) => {
          const config = this.config();
          ctrl.update(config);
        });

        // Wait a bit for scheduler to render with correct config
        await new Promise(resolve => setTimeout(resolve, 150));

        // Load initial schedule data
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();

        await this.loadScheduleDataForRange(from, to);

        if (this.isDestroyed) {
          return;
        }

        const controlAfterLoad = this.getSchedulerControl();
        if (!controlAfterLoad) {
          return;
        }

        // Force update scheduler with events and resources after data is loaded
        // This ensures events are displayed correctly on first load
        this.safeUpdateScheduler((ctrl) => {
          const events = this.schedulerEvents();
          const resources = this.schedulerResources();
          ctrl.update({ events, resources });
        });

        // Recalculate and update cell width after scheduler is fully rendered
        const view = this.currentView();
        setTimeout(() => {
          if (this.isDestroyed) return;
          
          if (view === 'day') {
            const newCellWidth = this.calculateDayCellWidth();
            const currentWidth = this.viewOptions().cellWidth || 60;
            if (Math.abs(newCellWidth - currentWidth) > 5) {
              this.viewOptions.update(options => ({
                ...options,
                cellWidth: newCellWidth
              }));
              this.safeUpdateScheduler((ctrl) => {
                ctrl.update(this.config());
              });
            }
          } else if (view === 'week') {
            const newCellWidth = this.calculateWeekHourCellWidth();
            const currentWidth = this.viewOptions().cellWidth || 5;
            if (Math.abs(newCellWidth - currentWidth) > 1) {
              this.viewOptions.update(options => ({
                ...options,
                cellWidth: newCellWidth
              }));
              this.safeUpdateScheduler((ctrl) => {
                ctrl.update(this.config());
              });
            }
            
            // Apply thick borders between days after rendering
            this.applyWeekDayBorders();
          }
        }, 300);

        // Scroll to 8 AM
        const today = DayPilot.Date.today();
        const scrollTime = today.addHours(8);
        controlAfterLoad.scrollTo(scrollTime);

        // Setup resize handler to recalculate cell width on window resize
        this.setupResizeHandler();
      } catch (error) {
        // Only log if not a disposed error
        if (error instanceof Error && !error.message.includes('disposed')) {
          console.error('Error initializing scheduler:', error);
        }
      }
    }, 300);
  }

  private applyWeekDayBorders(): void {
    // Apply thick borders between days in week view using direct DOM manipulation
    setTimeout(() => {
      if (this.isDestroyed || this.currentView() !== 'week') {
        return;
      }

      try {
        // Find scheduler element - try multiple selectors
        const schedulerElement = document.querySelector('.dp-scheduler') || 
                                 document.querySelector('.schedule-main .dp-scheduler');
        if (!schedulerElement) {
          return;
        }

        // Find all cells in time header rows and body rows
        // DayPilot uses table structure, so we need to find cells in each row
        const timeHeaderRows = schedulerElement.querySelectorAll('.dp-scheduler-time-header-row');
        const bodyRows = schedulerElement.querySelectorAll('.dp-scheduler-row');

        // Process time header cells - each row contains all 168 cells (7 days * 24 hours)
        timeHeaderRows.forEach((row) => {
          const cells = row.querySelectorAll('.dp-scheduler-time-header-cell, td');
          cells.forEach((cell, index) => {
            // Every 24th cell is the end of a day
            if ((index + 1) % 24 === 0) {
              const htmlCell = cell as HTMLElement;
              htmlCell.style.borderRight = '6px solid #000000';
              htmlCell.style.setProperty('border-right-width', '6px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
          });
        });

        // Process body cells - each row contains all 168 cells
        bodyRows.forEach((row) => {
          const cells = row.querySelectorAll('.dp-scheduler-cell, td');
          cells.forEach((cell, index) => {
            const htmlCell = cell as HTMLElement;
            // Every 24th cell is the end of a day - make it very thick
            if ((index + 1) % 24 === 0) {
              htmlCell.style.borderRight = '6px solid #000000';
              htmlCell.style.setProperty('border-right-width', '6px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
            // Every 1st cell of each day (00:00) - make border after it thicker
            if ((index + 1) % 24 === 1 && index > 0) {
              htmlCell.style.borderRight = '4px solid #000000';
              htmlCell.style.setProperty('border-right-width', '4px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
          });
        });
      } catch (error) {
        console.warn('Помилка застосування стилів меж днів:', error);
      }
    }, 500);
  }

  private setupResizeHandler(): void {
    if (this.resizeHandler || typeof window === 'undefined') {
      return;
    }

    this.resizeHandler = () => {
      // Debounce resize events
      if (this.resizeTimeoutId) {
        clearTimeout(this.resizeTimeoutId);
      }

      this.resizeTimeoutId = setTimeout(() => {
        if (this.isDestroyed) {
          return;
        }

        const view = this.currentView();
        const currentWidth = this.viewOptions().cellWidth || (view === 'day' ? 60 : 120);
        let newCellWidth: number;

        if (view === 'day') {
          newCellWidth = this.calculateDayCellWidth();
        } else if (view === 'week') {
          newCellWidth = this.calculateWeekHourCellWidth();
        } else {
          return; // Don't update for year view
        }

        // Update if difference is significant (more than 1px for week view, 5px for day view)
        const threshold = view === 'week' ? 1 : 5;
        if (Math.abs(newCellWidth - currentWidth) > threshold) {
          this.viewOptions.update(options => ({
            ...options,
            cellWidth: newCellWidth
          }));

          // Force scheduler update
          this.safeUpdateScheduler((ctrl) => {
            ctrl.update(this.config());
          });
        }
      }, 250); // Debounce delay
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    
    // Clear any pending timeouts
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    // Remove resize listener
    if (this.resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  setView(view: ScheduleView): void {
    this.currentView.set(view);
    // Reset to today when switching views
    this.currentDate.set(DayPilot.Date.today());
    this.updateSchedulerConfig();
  }

  navigatePrevious(): void {
    const view = this.currentView();
    const current = this.currentDate();
    
    if (view === 'day') {
      this.currentDate.set(current.addDays(-1));
    } else if (view === 'week') {
      this.currentDate.set(current.addDays(-7));
    } else {
      // For year view, go to previous month
      const firstDay = current.firstDayOfMonth();
      const firstDayDate = firstDay.toDate();
      const dayOfMonth = firstDayDate.getDate();
      const prevMonth = firstDay.addDays(-dayOfMonth);
      this.currentDate.set(prevMonth.firstDayOfMonth());
    }
    
    this.updateSchedulerConfig();
  }

  navigateNext(): void {
    const view = this.currentView();
    const current = this.currentDate();
    
    if (view === 'day') {
      this.currentDate.set(current.addDays(1));
    } else if (view === 'week') {
      this.currentDate.set(current.addDays(7));
    } else {
      // For year view, go to next month
      const firstDay = current.firstDayOfMonth();
      const daysInMonth = firstDay.daysInMonth();
      this.currentDate.set(firstDay.addDays(daysInMonth));
    }
    
    this.updateSchedulerConfig();
  }

  navigateToday(): void {
    this.currentDate.set(DayPilot.Date.today());
    this.updateSchedulerConfig();
  }

  // Ukrainian day names
  private ukrainianDays = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
  
  // Ukrainian month names (genitive case)
  private ukrainianMonths = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  
  // Ukrainian month names (nominative case)
  private ukrainianMonthsNominative = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  private formatDateUkrainian(date: DayPilot.Date, includeYear: boolean = true, useNominative: boolean = false): string {
    const jsDate = date.toDate();
    const dayOfWeek = jsDate.getDay();
    const day = jsDate.getDate();
    const month = jsDate.getMonth();
    const year = jsDate.getFullYear();
    
    const dayName = this.ukrainianDays[dayOfWeek];
    const monthName = useNominative 
      ? this.ukrainianMonthsNominative[month]
      : this.ukrainianMonths[month];
    
    if (includeYear) {
      return `${dayName} ${day} ${monthName} ${year}`;
    } else {
      return `${dayName} ${day} ${monthName}`;
    }
  }

  private calculateDayCellWidth(): number {
    try {
      // Get the actual scheduler container element
      const schedulerElement = document.querySelector('.schedule-main');
      if (!schedulerElement) {
        // Fallback: use window width
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const availableWidth = windowWidth - 400; // subtract margins, padding, row header (250px)
        const cellWidth = Math.floor(availableWidth / 24);
        return Math.max(45, cellWidth);
      }

      // Get actual container width
      const containerRect = schedulerElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Subtract padding (1rem = 16px on each side = 32px total)
      // Subtract row header width (250px from config)
      const padding = 32; // 1rem * 2
      const rowHeaderWidth = 250;
      const availableWidth = containerWidth - padding - rowHeaderWidth;
      
      // Calculate cell width for 24 hours
      const cellWidth = Math.floor(availableWidth / 24);
      
      // Minimum 45px for readability, no maximum to allow full width filling
      return Math.max(45, cellWidth);
    } catch (error) {
      console.warn('Не вдалося розрахувати ширину комірки, використовується значення за замовчуванням:', error);
      // Fallback: calculate based on window width
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const availableWidth = windowWidth - 400;
      return Math.max(45, Math.floor(availableWidth / 24));
    }
  }

  private calculateWeekCellWidth(): number {
    try {
      // Get the actual scheduler container element
      const schedulerElement = document.querySelector('.schedule-main');
      if (!schedulerElement) {
        // Fallback: use window width
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const availableWidth = windowWidth - 400; // subtract margins, padding, row header
        const cellWidth = Math.floor(availableWidth / 7);
        return Math.max(100, cellWidth);
      }

      // Get actual container width
      const containerRect = schedulerElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Subtract padding (1rem = 16px on each side = 32px total)
      // Subtract row header width (250px from config)
      const padding = 32;
      const rowHeaderWidth = 250;
      const availableWidth = containerWidth - padding - rowHeaderWidth;
      
      // Calculate cell width for 7 days
      const cellWidth = Math.floor(availableWidth / 7);
      
      // Minimum 100px for readability, no maximum to allow full width filling
      return Math.max(100, cellWidth);
    } catch (error) {
      console.warn('Could not calculate week cell width, using default:', error);
      // Fallback: calculate based on window width
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const availableWidth = windowWidth - 400;
      return Math.max(100, Math.floor(availableWidth / 7));
    }
  }

  private calculateWeekHourCellWidth(): number {
    try {
      // Get the actual scheduler container element
      const schedulerElement = document.querySelector('.schedule-main');
      if (!schedulerElement) {
        // Fallback: use window width
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const availableWidth = windowWidth - 400; // subtract margins, padding, row header
        // For week with hours: 7 days * 24 hours = 168 columns
        // Calculate to fill all available space
        const cellWidth = availableWidth / 168;
        // Use full width to fill the space, minimum 5px
        return Math.max(5, Math.ceil(cellWidth));
      }

      // Get actual container width
      const containerRect = schedulerElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Subtract padding (1rem = 16px on each side = 32px total)
      // Subtract row header width (250px from config)
      const padding = 32;
      const rowHeaderWidth = 250;
      const availableWidth = containerWidth - padding - rowHeaderWidth;
      
      // Calculate cell width for 7 days * 24 hours = 168 columns
      // Use full available width to fill the space completely
      const cellWidth = availableWidth / 168;
      
      // Round up slightly to ensure we fill all available space, minimum 5px
      return Math.max(5, Math.ceil(cellWidth));
    } catch (error) {
      console.warn('Не вдалося розрахувати ширину комірки години тижня, використовується значення за замовчуванням:', error);
      // Fallback: calculate based on window width
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const availableWidth = windowWidth - 400;
      // Use full width to fill space
      return Math.max(5, Math.ceil(availableWidth / 168));
    }
  }

  getCurrentDateDisplay(): string {
    const view = this.currentView();
    const current = this.currentDate();

    if (view === 'day') {
      // Format: "Середа 28 січня 2026"
      return this.formatDateUkrainian(current, true, false);
    } else if (view === 'week') {
      // Format: "Понеділок 26 січня - Неділя 1 лютого 2026"
      const dayOfWeek = current.getDayOfWeek();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = current.addDays(daysToMonday);
      const sunday = monday.addDays(6);
      
      return `${this.formatDateUkrainian(monday, false)} - ${this.formatDateUkrainian(sunday, true)}`;
    } else {
      // Year view (month) - Format: "Січень 2026"
      const jsDate = current.toDate();
      const month = jsDate.getMonth();
      const year = jsDate.getFullYear();
      return `${this.ukrainianMonthsNominative[month]} ${year}`;
    }
  }

  toggleStateFilter(state: ScheduleState): void {
    const current = this.filterStates();
    this.filterStates.set({
      ...current,
      [state]: !current[state],
    });
  }

  toggleQuickFillMode(): void {
    const current = this.isQuickFillMode();
    this.isQuickFillMode.set(!current);
    if (!current) {
      if (this.selectedTemplate() === null) {
        this.selectedTemplate.set(8);
      }
    } else {
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
    // Allow state selection in both quick fill and manual modes
    this.selectedTemplateState.set(state);
  }

  private updateSchedulerConfig(): void {
    const view = this.currentView();
    const current = this.currentDate();

    let startDate: DayPilot.Date;
    let days: number;

    if (view === 'day') {
      // Day view: show selected day from 00:00 to 24:00
      // Calculate cell width to fill available space (24 hours)
      // Use larger cell width to fill the entire width
      startDate = current;
      days = 1;
      
      // Calculate optimal cell width based on available space
      // For 24 hours, we want to fill the width, so use a larger cell width
      // Default to 60px per hour, which gives 1440px total (24 * 60)
      // This will be adjusted by DayPilot to fit available space if needed
      const calculatedCellWidth = this.calculateDayCellWidth();
      
      this.viewOptions.set({
        startDate: startDate,
        days: days,
        scale: 'Hour',
        cellWidth: calculatedCellWidth,
        timeHeaders: [
          { groupBy: 'Day', format: 'dddd MMMM d, yyyy' },
          { groupBy: 'Hour', format: 'HH:mm' }
        ],
      });
    } else if (view === 'week') {
      // Week view: show week containing selected date, from Monday to Sunday
      // Use Hour scale to allow partial day events, but hide hour labels
      const dayOfWeek = current.getDayOfWeek();
      // DayPilot: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Calculate days to Monday (if current is Sunday, go back 6 days; otherwise go to Monday of current week)
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = current.addDays(daysToMonday);
      days = 7;
      
      // Calculate optimal cell width for hours (7 days * 24 hours = 168 columns)
      const calculatedCellWidth = this.calculateWeekHourCellWidth();
      
      this.viewOptions.set({
        startDate: startDate,
        days: days,
        scale: 'Hour', // Use Hour scale to show events in correct time slots
        cellWidth: calculatedCellWidth,
        timeHeaders: [
          { groupBy: 'Day', format: 'dddd MMMM d' }
          // Hour headers are hidden via CSS
        ],
      });
    } else {
      // Year view (month)
      startDate = current.firstDayOfMonth();
      days = startDate.daysInMonth();
      this.viewOptions.set({
        startDate: startDate,
        days: days,
        scale: 'Day',
        timeHeaders: [
          { groupBy: 'Month' },
          { groupBy: 'Day', format: 'd' }
        ],
      });
    }

    // Load data for the new date range after a short delay to let scheduler update
    // Also recalculate cell width for day view after scheduler is rendered
    setTimeout(() => {
      const control = this.getSchedulerControl();
      if (control) {
        const from = startDate.toDate();
        const to = startDate.addDays(days).toDate();
        this.loadScheduleDataForRange(from, to);
        
        // For day and week views, recalculate and update cell width after scheduler is rendered
        if (view === 'day') {
          setTimeout(() => {
            const newCellWidth = this.calculateDayCellWidth();
            const currentWidth = this.viewOptions().cellWidth || 60;
            if (Math.abs(newCellWidth - currentWidth) > 5) { // Update if difference is more than 5px
              this.viewOptions.update(options => ({
                ...options,
                cellWidth: newCellWidth
              }));
              // Force scheduler update
              this.safeUpdateScheduler((ctrl) => {
                ctrl.update(this.config());
              });
            }
          }, 200);
        } else if (view === 'week') {
          setTimeout(() => {
            const newCellWidth = this.calculateWeekHourCellWidth();
            const currentWidth = this.viewOptions().cellWidth || 5;
            if (Math.abs(newCellWidth - currentWidth) > 1) { // Update if difference is more than 1px
              this.viewOptions.update(options => ({
                ...options,
                cellWidth: newCellWidth
              }));
              // Force scheduler update
              this.safeUpdateScheduler((ctrl) => {
                ctrl.update(this.config());
              });
            }
            
            // Apply thick borders between days
            this.applyWeekDayBorders();
          }, 200);
        }
      }
    }, 100);

    // Update scheduler and reload data after view change
    setTimeout(() => {
      if (this.isDestroyed) {
        return;
      }
      this.safeUpdateScheduler((ctrl) => {
        ctrl.update(this.config());
        const from = ctrl.visibleStart().toDate();
        const to = ctrl.visibleEnd().toDate();
        this.loadScheduleDataForRange(from, to);
        
        // Apply week day borders after update
        if (view === 'week') {
          setTimeout(() => {
            this.applyWeekDayBorders();
          }, 300);
        }
      });
    }, 100);
  }

  private async loadDepartments(): Promise<void> {
    try {
      const depts = await firstValueFrom(this.departmentService.getAllDepartments());
      this.departments.set(depts || []);
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
      // Завантажено працівників
      console.log('Завантажено працівників:', employees.length);
      this.employees.set(employees);
    } catch (error) {
      console.error('Помилка завантаження працівників:', error);
    }
  }

  private async loadScheduleDataForRange(start: Date, end: Date): Promise<void> {
    if (this.isLoadingData) {
      return;
    }

    this.isLoadingData = true;
    this.isLoading.set(true);

    try {
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

      // Update scheduler explicitly to ensure events are displayed
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.safeUpdateScheduler((ctrl) => {
            const events = this.schedulerEvents();
            const resources = this.schedulerResources();
            ctrl.update({ events, resources });
          });
        }, 50);
      });
    } catch (error) {
      console.error('Помилка завантаження даних розкладу:', error);
      this.toastService.error('Помилка завантаження графіка');
    } finally {
      this.isLoading.set(false);
      setTimeout(() => {
        this.isLoadingData = false;
      }, 100);
    }
  }

  private calculateShiftEnd(startTime: Date, durationHours: number): Date {
    return new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  }

  private async handleTimeRangeSelected(args: DayPilot.SchedulerTimeRangeSelectedArgs): Promise<void> {
    // Use toDateLocal() to get local time, matching the grid cells
    const start = args.start.toDateLocal();
    const end = args.end.toDateLocal();
    const resourceId = String(args.resource);

    if (!resourceId) {
      this.toastService.warning('Виберіть працівника для створення запису');
      args.control.clearSelection();
      return;
    }

    // Prevent creating events on department rows
    if (resourceId.startsWith('dept-')) {
      this.toastService.warning('Неможливо створити подію в рядку підрозділу. Виберіть працівника.');
      args.control.clearSelection();
      return;
    }

    // Find employee to get department
    const employee = this.employees().find(e => e.id === resourceId);
    if (!employee) {
      this.toastService.error('Не вдалося знайти працівника');
      args.control.clearSelection();
      return;
    }

    if (!employee.departmentId) {
      this.toastService.error('Працівник не має призначеного відділу. Будь ласка, призначте відділ працівнику перед створенням графіка.');
      args.control.clearSelection();
      return;
    }

    // Quick Fill Mode: Create entry immediately with template duration
    if (this.isQuickFillMode() && this.selectedTemplate() !== null) {
      const preciseStart = new Date(start);
      preciseStart.setSeconds(0, 0);

      const entryKey = `${resourceId}-${preciseStart.toISOString()}-${this.selectedTemplate()}`;

      if (this.isCreatingQuickEntry || this.lastQuickEntryKey === entryKey) {
        args.control.clearSelection();
        return;
      }

      this.isCreatingQuickEntry = true;
      this.lastQuickEntryKey = entryKey;

      const templateHours = this.selectedTemplate()!;
      const endTime = this.calculateShiftEnd(preciseStart, templateHours);
      const selectedState = this.selectedTemplateState();

      await this.createQuickTemplateEntry({
        employeeId: resourceId,
        startTime: this.formatWithTimezone(preciseStart),
        endTime: this.formatWithTimezone(endTime),
        state: selectedState,
        departmentId: employee.departmentId,
      });

      args.control.clearSelection();

      setTimeout(() => {
        this.isCreatingQuickEntry = false;
        this.lastQuickEntryKey = '';
      }, 1000);

      return;
    }

    // Validate time range
    if (end.getTime() <= start.getTime()) {
      this.toastService.warning('Час закінчення повинен бути після часу початку');
      args.control.clearSelection();
      return;
    }

    // Create entry directly without modal (quick fill mode or default behavior)
    if (this.isQuickFillMode() && this.selectedTemplate() !== null) {
      const templateHours = this.selectedTemplate()!;
      const templateState = this.selectedTemplateState();
      
      const create: ScheduleEntryCreate = {
        employeeId: resourceId,
        departmentId: employee.departmentId,
        state: templateState,
        startTime: this.formatWithTimezone(start),
        endTime: this.formatWithTimezone(end),
      };

      await this.createQuickTemplateEntry(create);
    } else {
      // For non-quick-fill mode, create entry with selected state (or default to OnWork)
      const selectedState = this.selectedTemplateState();
      const create: ScheduleEntryCreate = {
        employeeId: resourceId,
        departmentId: employee.departmentId,
        state: selectedState,
        startTime: this.formatWithTimezone(start),
        endTime: this.formatWithTimezone(end),
      };

      await this.createScheduleEntry(create);
    }

    args.control.clearSelection();
  }

  private async handleEventClick(args: DayPilot.SchedulerEventClickArgs): Promise<void> {
    // Delete button click is handled by area onClick handler
    // Ignore clicks on the event itself
    args.preventDefault();
  }

  private async handleEventMove(args: DayPilot.SchedulerEventMoveArgs): Promise<void> {
    if (this.isUpdatingEntry) {
      // Вже оновлюється запис, пропускаємо переміщення
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        console.warn('Немає даних запису в тегах події');
        return;
      }

      // Use args.newStart/newEnd which contain the target position set by user
      // Convert to local time so hours match the grid cells
      const newStartDate = args.newStart.toDateLocal();
      const newEndDate = args.newEnd.toDateLocal();
      const newResourceId = String(args.newResource || event.resource());

      // Prevent moving events to department rows
      if (newResourceId.startsWith('dept-')) {
        this.toastService.warning('Неможливо перемістити подію в рядок підрозділу. Виберіть рядок працівника.');
        const control = this.getSchedulerControl();
        if (control) {
          await this.loadScheduleDataForRange(
            control.visibleStart().toDate(),
            control.visibleEnd().toDate()
          );
        }
        return;
      }

      // Format time with timezone offset (same approach as schedule-entry-modal)
      // This ensures the server interprets the time correctly as local time
      const formatWithTimezone = (date: Date): string => {
        const offset = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? '+' : '-';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      };

      const newStartISO = formatWithTimezone(newStartDate);
      const newEndISO = formatWithTimezone(newEndDate);

      // Переміщення події

      // Validate time range
      if (newEndDate.getTime() <= newStartDate.getTime()) {
        this.toastService.warning('Час закінчення повинен бути після часу початку');
        const control = this.getSchedulerControl();
        if (control) {
          await this.loadScheduleDataForRange(
            control.visibleStart().toDate(),
            control.visibleEnd().toDate()
          );
        }
        return;
      }

      // Find employee to get department if resource changed
      let departmentId = entry.departmentId;
      let employeeId = entry.employeeId;

      if (newResourceId && newResourceId !== entry.employeeId) {
        const employee = this.employees().find(e => e.id === newResourceId);
        if (!employee) {
          this.toastService.error('Не вдалося знайти працівника');
          const control = this.getSchedulerControl();
          if (control) {
            await this.loadScheduleDataForRange(
              control.visibleStart().toDate(),
              control.visibleEnd().toDate()
            );
          }
          return;
        }
        if (!employee.departmentId) {
          this.toastService.error('Працівник не має призначеного відділу. Будь ласка, призначте відділ працівнику.');
          const control = this.getSchedulerControl();
          if (control) {
            await this.loadScheduleDataForRange(
              control.visibleStart().toDate(),
              control.visibleEnd().toDate()
            );
          }
          return;
        }
        departmentId = employee.departmentId;
        employeeId = newResourceId;
      }

      // Confirm the move immediately so DayPilot doesn't revert it
      args.loaded();

      const update: ScheduleEntryUpdate = {
        id: entry.id,
        employeeId: employeeId,
        startTime: newStartISO,
        endTime: newEndISO,
        state: entry.state,
        departmentId: departmentId,
      };

      // Save to server and update local state (non-blocking)
      this.updateScheduleEntryWithoutReload(update).catch(error => {
        console.error('Помилка збереження переміщення:', error);
        this.toastService.error('Помилка збереження переміщення');
      });
    } catch (error: any) {
      console.error('Помилка в handleEventMove:', error);
      this.toastService.error('Помилка переміщення події');
      
      // Still confirm to prevent DayPilot from reverting
      args.loaded();
    } finally {
      // Reset flag after a delay
      setTimeout(() => {
        this.isUpdatingEntry = false;
      }, 300);
    }
  }

  private async handleEventResize(args: DayPilot.SchedulerEventResizeArgs): Promise<void> {
    if (this.isUpdatingEntry) {
      // Вже оновлюється запис, пропускаємо зміну розміру
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        console.warn('Немає даних запису в тегах події');
        return;
      }

      // Use args.newStart/newEnd which contain the target position set by user
      // Convert to local time so hours match the grid cells
      const newStartDate = args.newStart.toDateLocal();
      const newEndDate = args.newEnd.toDateLocal();

      // Format time with timezone offset (same approach as schedule-entry-modal)
      // This ensures the server interprets the time correctly as local time
      const formatWithTimezone = (date: Date): string => {
        const offset = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? '+' : '-';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
      };

      const newStartISO = formatWithTimezone(newStartDate);
      const newEndISO = formatWithTimezone(newEndDate);

      // Зміна розміру події

      // Validate time range
      if (newEndDate.getTime() <= newStartDate.getTime()) {
        this.toastService.warning('Час закінчення повинен бути після часу початку');
        const control = this.getSchedulerControl();
        if (control) {
          await this.loadScheduleDataForRange(
            control.visibleStart().toDate(),
            control.visibleEnd().toDate()
          );
        }
        return;
      }

      // Confirm the resize immediately so DayPilot doesn't revert it
      args.loaded();

      const update: ScheduleEntryUpdate = {
        id: entry.id,
        employeeId: entry.employeeId,
        startTime: newStartISO,
        endTime: newEndISO,
        state: entry.state,
        departmentId: entry.departmentId,
      };

      // Save to server and update local state (non-blocking)
      this.updateScheduleEntryWithoutReload(update).catch(error => {
        console.error('Помилка збереження зміни розміру:', error);
        this.toastService.error('Помилка збереження зміни розміру');
      });
    } catch (error: any) {
      console.error('Помилка в handleEventResize:', error);
      this.toastService.error('Помилка зміни розміру події');
      
      // Still confirm to prevent DayPilot from reverting
      args.loaded();
    } finally {
      // Reset flag after a delay
      setTimeout(() => {
        this.isUpdatingEntry = false;
      }, 300);
    }
  }


  private onBeforeEventRender(args: DayPilot.SchedulerBeforeEventRenderArgs): void {
    const entry = args.data.tags?.entry as ScheduleEntry;
    if (!entry) {
      return;
    }

    const state = entry.state as ScheduleState;
    const color = this.stateColors[state] || '#6b7280';

    args.data.backColor = color;
    args.data.borderColor = 'darker';

    // Only delete button (X) in top-right corner
    args.data.areas = [
      {
        top: 2,
        right: 2,
        width: 18,
        height: 18,
        backColor: '#ef4444',
        borderRadius: '50%',
        verticalAlignment: 'center',
        horizontalAlignment: 'center',
        fontColor: '#ffffff',
        text: '×',
        cssClass: 'dp-event-delete-btn',
        id: `delete-${entry.id}`,
        onClick: () => {
          this.entryToDelete.set(entry);
          this.isDeleteModalOpen.set(true);
        },
      }
    ];
  }

  // Delete confirmation modal handlers
  confirmDelete(): void {
    const entry = this.entryToDelete();
    if (entry) {
      this.deleteScheduleEntry(entry.id);
    }
    this.closeDeleteModal();
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.entryToDelete.set(null);
  }

  // Helper methods for delete modal
  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find(e => e.id === employeeId);
    if (!employee) return 'Невідомий працівник';
    
    if (employee.callSign && employee.callSign.trim() !== '') {
      return employee.callSign;
    }
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    return `${firstName} ${lastName}`.trim() || `Працівник ${employeeId.substring(0, 8)}`;
  }

  getStateLabel(state: string): string {
    const labels: Record<string, string> = {
      'OnWork': 'Робота',
      'Training': 'Навчання',
      'Vacation': 'Відпустка',
      'Illness': 'Лікарняний',
      'Rest': 'Вихідний',
    };
    return labels[state] || state;
  }

  formatTimeRange(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startStr = start.toLocaleString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endStr = end.toLocaleString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${startStr} - ${endStr}`;
  }

  private async createScheduleEntry(create: ScheduleEntryCreate): Promise<void> {
    try {
      const result = await firstValueFrom(this.scheduleService.createOrUpdate(create));
      this.toastService.success('Запис створено');

      const savedEntry = ((result as any).entry || result) as ScheduleEntry | null;
      if (savedEntry && savedEntry.id) {
        const currentEntries = this.scheduleEntries();
        const existingIndex = currentEntries.findIndex(e => e.id === savedEntry.id);
        const newEntries = [...currentEntries];
        if (existingIndex >= 0) {
          newEntries[existingIndex] = savedEntry;
        } else {
          newEntries.push(savedEntry);
        }
        this.scheduleEntries.set(newEntries);

        // Update scheduler
        const control = this.getSchedulerControl();
        if (control) {
          const events = this.schedulerEvents();
          control.update({ events });
        }
      }

      // Reload data from server
      const control = this.getSchedulerControl();
      if (control) {
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
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

      const entryData = (result as any).entry;
      const savedEntry = (entryData || result) as ScheduleEntry | null;
      if (savedEntry && savedEntry.id) {
        const currentEntries = this.scheduleEntries();
        const existingIndex = currentEntries.findIndex(e => e.id === savedEntry.id);

        if (existingIndex === -1) {
          const newEntries = [...currentEntries, savedEntry];
          this.scheduleEntries.set(newEntries);

          // Update scheduler
          const control = this.getSchedulerControl();
          if (control) {
            const events = this.schedulerEvents();
            control.update({ events });
          }
        }
      }

      // Reload data from server
      const control = this.getSchedulerControl();
      if (control) {
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error: any) {
      console.error('Помилка створення швидкого шаблонного запису:', error);
      const errorMessage = error?.error?.message || 'Помилка створення запису';
      this.toastService.error(errorMessage);
    }
  }

  private async deleteScheduleEntry(id: string): Promise<void> {
    try {
      // Remove from local state immediately
      const currentEntries = this.scheduleEntries();
      const filteredEntries = currentEntries.filter(e => e.id !== id);
      this.scheduleEntries.set(filteredEntries);

      // Update scheduler
      const control = this.getSchedulerControl();
      if (control) {
        const events = this.schedulerEvents();
        control.update({ events });
      }

      // Delete from server
      await firstValueFrom(this.scheduleService.delete(id));
      this.toastService.success('Запис видалено');

      // Reload data from server
      const control1 = this.getSchedulerControl();
      if (control1) {
        const from = control1.visibleStart().toDate();
        const to = control1.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      this.toastService.error('Помилка видалення запису');

      // Revert by reloading data
      const control2 = this.getSchedulerControl();
      if (control2) {
        const from = control2.visibleStart().toDate();
        const to = control2.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    }
  }

  private async updateScheduleEntryWithoutReload(update: ScheduleEntryUpdate): Promise<void> {
    try {
      // Оновлення запису без перезавантаження
      
      const result = await firstValueFrom(
        this.scheduleService.createOrUpdate(update)
      );

      // Update local entry immediately using server response (if available) or update data
      const currentEntries = this.scheduleEntries();
      const entryIndex = currentEntries.findIndex(e => e.id === update.id);

      if (entryIndex !== -1) {
        // Use server response if available (check both direct properties and nested entry)
        const serverEntry = (result as any)?.entry || (result as any);
        const savedStartTime = (serverEntry?.startTime || update.startTime) as string;
        const savedEndTime = (serverEntry?.endTime || update.endTime) as string;
        const startTime = new Date(savedStartTime);
        const endTime = new Date(savedEndTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const updatedEntry: ScheduleEntry = {
          ...currentEntries[entryIndex],
          startTime: savedStartTime,
          endTime: savedEndTime,
          hours: hours,
          employeeId: update.employeeId,
          departmentId: update.departmentId,
          state: update.state,
        };

        const newEntries = [...currentEntries];
        newEntries[entryIndex] = updatedEntry;
        this.scheduleEntries.set(newEntries);

        // Запис оновлено локально
        
        // DayPilot already updated the event with 'Update' mode, but may have used UTC.
        // After saving, update the event with correct local time so position matches displayed hours.
        // Use a delay to let DayPilot finish its internal update first.
        requestAnimationFrame(() => {
          setTimeout(() => {
            const control = this.getSchedulerControl();
            if (control && !this.isDestroyed) {
              try {
                // Build event with local time from saved entry
                const start = this.toDayPilotDateLocal(updatedEntry.startTime);
                const end = this.toDayPilotDateLocal(updatedEntry.endTime);
                const startDate = new Date(updatedEntry.startTime);
                const endDate = new Date(updatedEntry.endTime);
                const startTimeStr = String(startDate.getHours()).padStart(2, '0');
                const endTimeStr = String(endDate.getHours()).padStart(2, '0');
                const title = `${startTimeStr} - ${endTimeStr}`;

                const existingEvent = control.events.find(updatedEntry.id);
                if (existingEvent) {
                  // Оновлення події DayPilot
                  existingEvent.data.start = start;
                  existingEvent.data.end = end;
                  existingEvent.data.text = title;
                  existingEvent.data.resource = updatedEntry.employeeId;
                  control.events.update(existingEvent);
                } else {
                  console.warn('Подію не знайдено в DayPilot:', updatedEntry.id);
                }
              } catch (error) {
                if (error instanceof Error && !error.message.includes('disposed')) {
                  console.error('Помилка оновлення події розкладу:', error);
                }
              }
            }
          }, 100);
        });
      }
    } catch (error: any) {
      console.error('Помилка оновлення запису графіка:', error);
      const errorMessage = error?.error?.message || 'Помилка оновлення графіка';
      this.toastService.error(errorMessage);

      // Revert by reloading data
      const control = this.getSchedulerControl();
      if (control) {
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    }
  }

  private async updateScheduleEntry(update: ScheduleEntryUpdate, showNotification: boolean = true): Promise<void> {
    if (this.isUpdatingEntry) {
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const result = await firstValueFrom(
        this.scheduleService.createOrUpdate(update)
      );

      if (showNotification) {
        this.toastService.success('Графік оновлено');
      }

      // Update local entry
      const currentEntries = this.scheduleEntries();
      const entryIndex = currentEntries.findIndex(e => e.id === update.id);

      if (entryIndex !== -1) {
        const startTime = new Date(update.startTime);
        const endTime = new Date(update.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const updatedEntry: ScheduleEntry = {
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

        // Update scheduler
        this.safeUpdateScheduler((ctrl) => {
          const events = this.schedulerEvents();
          ctrl.update({ events });
        });
      }

      // Reload data from server
      const control1 = this.getSchedulerControl();
      if (control1) {
        const from = control1.visibleStart().toDate();
        const to = control1.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error: any) {
      console.error('Помилка оновлення запису розкладу:', error);
      const errorMessage = error?.error?.message || 'Помилка оновлення графіка';
      this.toastService.error(errorMessage);

      // Revert by reloading data
      const control2 = this.getSchedulerControl();
      if (control2) {
        const from = control2.visibleStart().toDate();
        const to = control2.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } finally {
      setTimeout(() => {
        this.isUpdatingEntry = false;
      }, 300);
    }
  }
}
