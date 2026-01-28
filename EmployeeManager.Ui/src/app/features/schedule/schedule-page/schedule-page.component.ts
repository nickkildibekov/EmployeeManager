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

  // Computed: resources (employees) for scheduler - flat list sorted by department
  schedulerResources = computed(() => {
    const employees = this.employees();
    const departments = this.departments();

    if (employees.length === 0) {
      return [];
    }

    // Group by department
    const grouped = employees.reduce((acc, emp) => {
      const dept = departments.find(d => d.id === emp.departmentId);
      const deptName = dept?.name || 'Без відділу';
      if (!acc[deptName]) {
        acc[deptName] = [];
      }
      acc[deptName].push(emp);
      return acc;
    }, {} as Record<string, typeof employees>);

    // Sort departments by name
    const sortedDepts = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'uk'));

    // Sort employees within each department by CallSign, then by name
    sortedDepts.forEach(deptName => {
      grouped[deptName].sort((a, b) => {
        if (a.callSign && b.callSign) {
          return a.callSign.localeCompare(b.callSign, 'uk');
        }
        if (a.callSign) return -1;
        if (b.callSign) return 1;
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return nameA.localeCompare(nameB, 'uk');
      });
    });

    // Flatten to flat list with department info in tags
    const resources = sortedDepts.flatMap((deptName) =>
      grouped[deptName].map(emp => {
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

        return {
          id: emp.id,
          name: displayName,
          tags: {
            departmentId: emp.departmentId,
            departmentName: deptName,
            employeeName: fullName,
            callSign: emp.callSign || '',
          },
        };
      })
    );

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
    const resourceIds = new Set(resources.map(r => r.id));

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
  private viewOptions = signal<Partial<DayPilot.SchedulerConfig>>({
    startDate: DayPilot.Date.today(),
    days: DayPilot.Date.today().daysInMonth(),
    scale: 'Hour',
    timeHeaders: [
      { groupBy: 'Month' },
      { groupBy: 'Day', format: 'dddd MMMM d, yyyy' },
      { groupBy: 'Hour', format: 'HH:mm' }
    ],
    cellWidth: 45,
  });

  // Base scheduler options (static; view options and resources/events come from signals/computed)
  private getBaseConfig(): DayPilot.SchedulerConfig {
    return {
      eventHeight: 50,
      rowHeaderWidth: 200,
      rowMarginTop: 2,
      rowMarginBottom: 2,
      durationBarVisible: false,
      timeRangeSelectedHandling: 'Enabled',
      eventMoveHandling: 'Update',
      eventResizeHandling: 'Update',
      onTimeRangeSelected: async (args) => {
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
        console.warn('Scheduler control is disposed');
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
      console.error('Error updating scheduler:', error);
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
        console.warn('Scheduler not initialized yet, retrying...');
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
        // Load initial schedule data; resources/events come from config (computed) and are synced by DayPilot
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

        // Scroll to 8 AM
        const today = DayPilot.Date.today();
        const firstDay = today.firstDayOfMonth();
        const scrollTime = firstDay.addHours(8);
        controlAfterLoad.scrollTo(scrollTime);
      } catch (error) {
        // Only log if not a disposed error
        if (error instanceof Error && !error.message.includes('disposed')) {
          console.error('Error initializing scheduler:', error);
        }
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    
    // Clear any pending timeouts
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
  }

  setView(view: ScheduleView): void {
    this.currentView.set(view);
    this.updateSchedulerConfig();
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
    if (!this.isQuickFillMode()) {
      return;
    }
    this.selectedTemplateState.set(state);
  }

  private updateSchedulerConfig(): void {
    const view = this.currentView();
    const today = DayPilot.Date.today();

    if (view === 'day') {
      this.viewOptions.set({
        startDate: today,
        days: 1,
        scale: 'Hour',
        cellWidth: 45,
        timeHeaders: [
          { groupBy: 'Day', format: 'dddd MMMM d, yyyy' },
          { groupBy: 'Hour', format: 'HH:mm' }
        ],
      });
    } else if (view === 'week') {
      const dayOfWeek = today.getDayOfWeek();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = today.addDays(daysToMonday);
      this.viewOptions.set({
        startDate: monday,
        days: 7,
        scale: 'Day',
        timeHeaders: [
          { groupBy: 'Week', format: 'Week of MMMM d, yyyy' },
          { groupBy: 'Day', format: 'dddd MMMM d' }
        ],
      });
    } else {
      this.viewOptions.set({
        startDate: today.firstDayOfMonth(),
        days: today.daysInMonth(),
        scale: 'Day',
        timeHeaders: [
          { groupBy: 'Month' },
          { groupBy: 'Day', format: 'd' }
        ],
      });
    }

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
      console.log('👥 Loaded employees:', {
        count: employees.length,
        employees: employees.map(e => ({ 
          id: e.id, 
          firstName: e.firstName, 
          lastName: e.lastName, 
          callSign: e.callSign,
          name: e.callSign || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'No name',
          departmentId: e.departmentId 
        }))
      });
      this.employees.set(employees);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
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

      // Update scheduler - effect will handle the update automatically
      // No need to manually update here as effect will trigger
    } catch (error) {
      console.error('Error loading schedule data:', error);
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
      // For non-quick-fill mode, create entry with default state
      const create: ScheduleEntryCreate = {
        employeeId: resourceId,
        departmentId: employee.departmentId,
        state: 'OnWork',
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
      console.log('⏸️ Already updating entry, skipping move');
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        console.warn('⚠️ No entry data in event tags');
        return;
      }

      // Use args.newStart/newEnd which contain the target position set by user
      // Convert to local time so hours match the grid cells
      const newStartDate = args.newStart.toDateLocal();
      const newEndDate = args.newEnd.toDateLocal();
      const newResourceId = String(args.newResource || event.resource());

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

      console.log('🔄 Moving event:', {
        entryId: entry.id,
        oldResource: entry.employeeId,
        newResource: newResourceId,
        newStart: newStartISO,
        newEnd: newEndISO,
        newStartLocal: `${newStartDate.getHours().toString().padStart(2, '0')}:${newStartDate.getMinutes().toString().padStart(2, '0')}`,
        newEndLocal: `${newEndDate.getHours().toString().padStart(2, '0')}:${newEndDate.getMinutes().toString().padStart(2, '0')}`
      });

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
        console.error('Failed to save move:', error);
        this.toastService.error('Помилка збереження переміщення');
      });
    } catch (error: any) {
      console.error('❌ Error in handleEventMove:', error);
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
      console.log('⏸️ Already updating entry, skipping resize');
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        console.warn('⚠️ No entry data in event tags');
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

      console.log('🔄 Resizing event:', {
        entryId: entry.id,
        oldStart: entry.startTime,
        oldEnd: entry.endTime,
        newStart: newStartISO,
        newEnd: newEndISO,
        newStartLocal: `${newStartDate.getHours().toString().padStart(2, '0')}:${newStartDate.getMinutes().toString().padStart(2, '0')}`,
        newEndLocal: `${newEndDate.getHours().toString().padStart(2, '0')}:${newEndDate.getMinutes().toString().padStart(2, '0')}`
      });

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
        console.error('Failed to save resize:', error);
        this.toastService.error('Помилка збереження зміни розміру');
      });
    } catch (error: any) {
      console.error('❌ Error in handleEventResize:', error);
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
      console.error('Error creating quick template entry:', error);
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
      console.log('💾 Updating entry without reload:', update.id);
      
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

        console.log('✅ Entry updated locally:', {
          id: updatedEntry.id,
          startTime: updatedEntry.startTime,
          endTime: updatedEntry.endTime,
          startLocal: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
          endLocal: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
        });
        
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
                  console.log('🔄 Updating DayPilot event:', {
                    id: updatedEntry.id,
                    oldStart: existingEvent.data.start.toString(),
                    oldEnd: existingEvent.data.end.toString(),
                    newStart: start.toString(),
                    newEnd: end.toString(),
                    newText: title
                  });
                  
                  // Update existing event with correct local time position
                  existingEvent.data.start = start;
                  existingEvent.data.end = end;
                  existingEvent.data.text = title;
                  existingEvent.data.resource = updatedEntry.employeeId;
                  control.events.update(existingEvent);
                  
                  console.log('✅ DayPilot event updated');
                } else {
                  console.warn('⚠️ Event not found in DayPilot:', updatedEntry.id);
                }
              } catch (error) {
                if (error instanceof Error && !error.message.includes('disposed')) {
                  console.error('Error updating scheduler event:', error);
                }
              }
            }
          }, 100);
        });
      }
    } catch (error: any) {
      console.error('❌ Error updating schedule entry:', error);
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
      console.error('Error updating schedule entry:', error);
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
