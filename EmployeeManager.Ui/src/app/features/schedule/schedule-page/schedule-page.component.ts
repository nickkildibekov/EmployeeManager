import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayPilot, DayPilotModule, DayPilotSchedulerComponent } from '@daypilot/daypilot-lite-angular';
import { firstValueFrom } from 'rxjs';
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

  currentView = signal<ScheduleView>('day');
  currentDate = signal<DayPilot.Date>(DayPilot.Date.today());

  scheduleEntries = signal<ScheduleEntry[]>([]);
  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);
  isLoading = signal(false);

  filterStates = signal<Record<ScheduleState, boolean>>({
    Training: true,
    OnWork: true,
    Rest: true,
    Vacation: true,
    Illness: true,
  });

  isQuickFillMode = signal<boolean>(false);
  selectedTemplate = signal<number | null>(null);
  selectedTemplateState = signal<ScheduleState>('OnWork');

  isDeleteModalOpen = signal(false);
  entryToDelete = signal<ScheduleEntry | null>(null);
  private stateColors: Record<ScheduleState, string> = {
    Training: '#3b82f6',
    OnWork: '#10b981',
    Rest: '#6b7280',
    Vacation: '#f59e0b',
    Illness: '#ef4444',
  };

  filteredEntries = computed(() => {
    const entries = this.scheduleEntries();
    const filters = this.filterStates();

    return entries.filter((entry) => {
      return filters[entry.state as ScheduleState];
    });
  });

  schedulerResources = computed(() => {
    const employees = this.employees();
    const departments = this.departments();

    if (employees.length === 0) {
      return [];
    }

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

    const sortedDeptIds = Object.keys(grouped).sort((a, b) => 
      grouped[a].name.localeCompare(grouped[b].name, 'uk')
    );

    const resources: DayPilot.ResourceData[] = [];
    
    sortedDeptIds.forEach(deptId => {
      const dept = grouped[deptId];
      
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

      sortedEmployees.forEach(emp => {
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
          name: `  ${displayName}`,
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

  private toDayPilotDateLocal(isoOrDate: string | Date): DayPilot.Date {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return new DayPilot.Date(d, true);
  }

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

  schedulerEvents = computed<DayPilot.EventData[]>(() => {
    const filtered = this.filteredEntries();
    const resources = this.schedulerResources();
    
    const resourceIds = new Set<string>();
    resources.forEach(resource => {
      const resourceId = String(resource.id || '');
      if (resource.tags?.isEmployee === true && !resourceId.startsWith('dept-')) {
        resourceIds.add(resourceId);
      }
    });

    return filtered
      .filter(entry => resourceIds.has(entry.employeeId))
      .map((entry) => {
        const start = this.toDayPilotDateLocal(entry.startTime);
        const end = this.toDayPilotDateLocal(entry.endTime);

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
        const resourceData = args.row.data;
        if (resourceData?.tags?.isDepartment) {
          args.row.cssClass = 'dp-row-department';
          const deptName = resourceData.name || '';
          args.row.html = `<span class="dp-resource-department">📁 ${deptName}</span>`;
        } else if (resourceData?.tags?.isEmployee) {
          args.row.cssClass = 'dp-row-employee';
          const empName = resourceData.name?.trim() || '';
          args.row.html = `<span class="dp-resource-employee">👤 ${empName}</span>`;
        }
      },
      onBeforeCellRender: (args: any) => {
        const view = this.currentView();
        if (view === 'week') {
          try {
            const start = args.start || args.time;
            if (start) {
              const startDate = start instanceof Date ? start : start.toDate();
              const hour = startDate.getHours();
              const minutes = startDate.getMinutes();
              
              if (hour === 23 && minutes === 0) {
                if (args.cell) {
                  args.cell.cssClass = (args.cell.cssClass || '') + ' dp-day-separator';
                } else if (args.cssClass !== undefined) {
                  args.cssClass = (args.cssClass || '') + ' dp-day-separator';
                }
              }
              if (hour === 0 && minutes === 0) {
                if (args.cell) {
                  args.cell.cssClass = (args.cell.cssClass || '') + ' dp-after-midnight';
                } else if (args.cssClass !== undefined) {
                  args.cssClass = (args.cssClass || '') + ' dp-after-midnight';
                }
              }
            }
          } catch (error) {
          }
        }
      },
      onBeforeTimeHeaderRender: (args) => {
        const view = this.currentView();
        
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
        
        if (/^\d{2}:\d{2}$/.test(headerText.trim())) {
          if (view === 'week') {
            args.header.html = '';
            args.header.cssClass = 'dp-time-header-hour-hidden';
          }
          return;
        }
        
        const dateMatch = headerText.match(/(\w+)\s+(\w+)\s+(\d+)(?:\s*,\s*(\d+))?/);
        if (dateMatch) {
          const [, dayNameEn, monthNameEn, day, year] = dateMatch;
          
          const dayName = dayNamesMap[dayNameEn] || dayNameEn;
          const monthName = monthNamesMap[monthNameEn] || monthNameEn;
          
          const translatedText = year 
            ? `${dayName} ${day} ${monthName} ${year}`
            : `${dayName} ${day} ${monthName}`;
          
          args.header.html = translatedText;
        } else {
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

  private getSchedulerControl() {
    if (this.isDestroyed) {
      return null;
    }
    if (!this.scheduler || !this.scheduler.control) {
      return null;
    }
    try {
      this.scheduler.control.visibleStart();
      return this.scheduler.control;
    } catch (error) {
      return null;
    }
  }
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
      if (error instanceof Error && error.message.includes('disposed')) {
        return;
      }
    }
  }

  constructor() {}

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadDepartments(),
      this.loadEmployees()
    ]);
    
    this.updateSchedulerConfig();
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
    }
    this.initTimeoutId = setTimeout(async () => {
      if (this.isDestroyed) {
        return;
      }

      const control = this.getSchedulerControl();
      if (!control) {
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
        this.safeUpdateScheduler((ctrl) => {
          const config = this.config();
          ctrl.update(config);
        });

        await new Promise(resolve => setTimeout(resolve, 150));

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

        this.safeUpdateScheduler((ctrl) => {
          const events = this.schedulerEvents();
          const resources = this.schedulerResources();
          ctrl.update({ events, resources });
        });

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
            
            this.applyWeekDayBorders();
          }
        }, 300);

        const today = DayPilot.Date.today();
        const scrollTime = today.addHours(8);
        controlAfterLoad.scrollTo(scrollTime);

        this.setupResizeHandler();
      } catch (error) {
        if (error instanceof Error && !error.message.includes('disposed')) {
        }
      }
    }, 300);
  }

  private applyWeekDayBorders(): void {
    setTimeout(() => {
      if (this.isDestroyed || this.currentView() !== 'week') {
        return;
      }

      try {
        const schedulerElement = document.querySelector('.dp-scheduler') || 
                                 document.querySelector('.schedule-main .dp-scheduler');
        if (!schedulerElement) {
          return;
        }

        const timeHeaderRows = schedulerElement.querySelectorAll('.dp-scheduler-time-header-row');
        const bodyRows = schedulerElement.querySelectorAll('.dp-scheduler-row');

        timeHeaderRows.forEach((row) => {
          const cells = row.querySelectorAll('.dp-scheduler-time-header-cell, td');
          cells.forEach((cell, index) => {
            if ((index + 1) % 24 === 0) {
              const htmlCell = cell as HTMLElement;
              htmlCell.style.borderRight = '6px solid #000000';
              htmlCell.style.setProperty('border-right-width', '6px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
          });
        });

        bodyRows.forEach((row) => {
          const cells = row.querySelectorAll('.dp-scheduler-cell, td');
          cells.forEach((cell, index) => {
            const htmlCell = cell as HTMLElement;
            if ((index + 1) % 24 === 0) {
              htmlCell.style.borderRight = '6px solid #000000';
              htmlCell.style.setProperty('border-right-width', '6px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
            if ((index + 1) % 24 === 1 && index > 0) {
              htmlCell.style.borderRight = '4px solid #000000';
              htmlCell.style.setProperty('border-right-width', '4px', 'important');
              htmlCell.style.setProperty('border-right-color', '#000000', 'important');
              htmlCell.style.setProperty('border-right-style', 'solid', 'important');
            }
          });
        });
      } catch (error) {
      }
    }, 500);
  }

  private setupResizeHandler(): void {
    if (this.resizeHandler || typeof window === 'undefined') {
      return;
    }

    this.resizeHandler = () => {
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

        const threshold = view === 'week' ? 1 : 5;
        if (Math.abs(newCellWidth - currentWidth) > threshold) {
          this.viewOptions.update(options => ({
            ...options,
            cellWidth: newCellWidth
          }));

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
    
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    
    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }
    
    if (this.resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  setView(view: ScheduleView): void {
    this.currentView.set(view);
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

  private ukrainianDays = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
  
  private ukrainianMonths = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  
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
      const schedulerElement = document.querySelector('.schedule-main');
      if (!schedulerElement) {
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const availableWidth = windowWidth - 400;
        const cellWidth = Math.floor(availableWidth / 24);
        return Math.max(45, cellWidth);
      }

      const containerRect = schedulerElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      const padding = 32;
      const rowHeaderWidth = 250;
      const availableWidth = containerWidth - padding - rowHeaderWidth;
      
      const cellWidth = Math.floor(availableWidth / 24);
      
      return Math.max(45, cellWidth);
    } catch (error) {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const availableWidth = windowWidth - 400;
      return Math.max(45, Math.floor(availableWidth / 24));
    }
  }

  private calculateWeekHourCellWidth(): number {
    try {
      const schedulerElement = document.querySelector('.schedule-main');
      if (!schedulerElement) {
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const availableWidth = windowWidth - 400;
        const cellWidth = availableWidth / 168;
        return Math.max(5, Math.ceil(cellWidth));
      }

      const containerRect = schedulerElement.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      const padding = 32;
      const rowHeaderWidth = 250;
      const availableWidth = containerWidth - padding - rowHeaderWidth;
      
      const cellWidth = availableWidth / 168;
      
      return Math.max(5, Math.ceil(cellWidth));
    } catch (error) {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const availableWidth = windowWidth - 400;
      return Math.max(5, Math.ceil(availableWidth / 168));
    }
  }

  getCurrentDateDisplay(): string {
    const view = this.currentView();
    const current = this.currentDate();

    if (view === 'day') {
      return this.formatDateUkrainian(current, true, false);
    } else if (view === 'week') {
      const dayOfWeek = current.getDayOfWeek();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = current.addDays(daysToMonday);
      const sunday = monday.addDays(6);
      
      return `${this.formatDateUkrainian(monday, false)} - ${this.formatDateUkrainian(sunday, true)}`;
    } else {
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
    this.selectedTemplateState.set(state);
  }

  private updateSchedulerConfig(): void {
    const view = this.currentView();
    const current = this.currentDate();

    let startDate: DayPilot.Date;
    let days: number;

    if (view === 'day') {
      startDate = current;
      days = 1;
      
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
      const dayOfWeek = current.getDayOfWeek();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = current.addDays(daysToMonday);
      days = 7;
      
      const calculatedCellWidth = this.calculateWeekHourCellWidth();
      
      this.viewOptions.set({
        startDate: startDate,
        days: days,
        scale: 'Hour',
        cellWidth: calculatedCellWidth,
        timeHeaders: [
          { groupBy: 'Day', format: 'dddd MMMM d' }
        ],
      });
    } else {
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

    setTimeout(() => {
      const control = this.getSchedulerControl();
      if (control) {
        const from = startDate.toDate();
        const to = startDate.addDays(days).toDate();
        this.loadScheduleDataForRange(from, to);
        
        if (view === 'day') {
          setTimeout(() => {
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
          }, 200);
        } else if (view === 'week') {
          setTimeout(() => {
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
            
            this.applyWeekDayBorders();
          }, 200);
        }
      }
    }, 100);

    setTimeout(() => {
      if (this.isDestroyed) {
        return;
      }
      this.safeUpdateScheduler((ctrl) => {
        ctrl.update(this.config());
        const from = ctrl.visibleStart().toDate();
        const to = ctrl.visibleEnd().toDate();
        this.loadScheduleDataForRange(from, to);
        
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
    }
  }

  private async loadEmployees(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.employeeService.getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc')
      );
      const employees = response?.items || [];
      this.employees.set(employees);
    } catch (error) {
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

      const entriesMap = new Map<string, ScheduleEntry>();
      (entries || []).forEach(entry => {
        if (entry.id && !entriesMap.has(entry.id)) {
          entriesMap.set(entry.id, entry);
        }
      });
      const uniqueEntries = Array.from(entriesMap.values());

      this.scheduleEntries.set(uniqueEntries);
      this.lastLoadedRange = { start: new Date(start), end: new Date(end) };

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
    const start = args.start.toDateLocal();
    const end = args.end.toDateLocal();
    const resourceId = String(args.resource);

    if (!resourceId) {
      this.toastService.warning('Виберіть працівника для створення запису');
      args.control.clearSelection();
      return;
    }

    if (resourceId.startsWith('dept-')) {
      this.toastService.warning('Неможливо створити подію в рядку підрозділу. Виберіть працівника.');
      args.control.clearSelection();
      return;
    }

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

    if (end.getTime() <= start.getTime()) {
      this.toastService.warning('Час закінчення повинен бути після часу початку');
      args.control.clearSelection();
      return;
    }

    if (this.isQuickFillMode() && this.selectedTemplate() !== null) {
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
    args.preventDefault();
  }

  private async handleEventMove(args: DayPilot.SchedulerEventMoveArgs): Promise<void> {
    if (this.isUpdatingEntry) {
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        return;
      }

      const newStartDate = args.newStart.toDateLocal();
      const newEndDate = args.newEnd.toDateLocal();
      const newResourceId = String(args.newResource || event.resource());

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

      args.loaded();

      const update: ScheduleEntryUpdate = {
        id: entry.id,
        employeeId: employeeId,
        startTime: newStartISO,
        endTime: newEndISO,
        state: entry.state,
        departmentId: departmentId,
      };

      this.updateScheduleEntryWithoutReload(update).catch(() => {
        this.toastService.error('Помилка збереження переміщення');
      });
    } catch (error: any) {
      this.toastService.error('Помилка переміщення події');
      args.loaded();
    } finally {
      setTimeout(() => {
        this.isUpdatingEntry = false;
      }, 300);
    }
  }

  private async handleEventResize(args: DayPilot.SchedulerEventResizeArgs): Promise<void> {
    if (this.isUpdatingEntry) {
      return;
    }

    this.isUpdatingEntry = true;

    try {
      const event = args.e;
      const entry = event.data.tags?.entry as ScheduleEntry;

      if (!entry) {
        return;
      }

      const newStartDate = args.newStart.toDateLocal();
      const newEndDate = args.newEnd.toDateLocal();
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

      args.loaded();

      const update: ScheduleEntryUpdate = {
        id: entry.id,
        employeeId: entry.employeeId,
        startTime: newStartISO,
        endTime: newEndISO,
        state: entry.state,
        departmentId: entry.departmentId,
      };

      this.updateScheduleEntryWithoutReload(update).catch(() => {
        this.toastService.error('Помилка збереження зміни розміру');
      });
    } catch (error: any) {
      this.toastService.error('Помилка зміни розміру події');
      args.loaded();
    } finally {
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

        const control = this.getSchedulerControl();
        if (control) {
          const events = this.schedulerEvents();
          control.update({ events });
        }
      }
      const control = this.getSchedulerControl();
      if (control) {
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error: any) {
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

          const control = this.getSchedulerControl();
          if (control) {
            const events = this.schedulerEvents();
            control.update({ events });
          }
        }
      }
      const control = this.getSchedulerControl();
      if (control) {
        const from = control.visibleStart().toDate();
        const to = control.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Помилка створення запису';
      this.toastService.error(errorMessage);
    }
  }

  private async deleteScheduleEntry(id: string): Promise<void> {
    try {
      const currentEntries = this.scheduleEntries();
      const filteredEntries = currentEntries.filter(e => e.id !== id);
      this.scheduleEntries.set(filteredEntries);

      const control = this.getSchedulerControl();
      if (control) {
        const events = this.schedulerEvents();
        control.update({ events });
      }

      await firstValueFrom(this.scheduleService.delete(id));
      this.toastService.success('Запис видалено');

      const control1 = this.getSchedulerControl();
      if (control1) {
        const from = control1.visibleStart().toDate();
        const to = control1.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error) {
      this.toastService.error('Помилка видалення запису');

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
      const result = await firstValueFrom(
        this.scheduleService.createOrUpdate(update)
      );

      const currentEntries = this.scheduleEntries();
      const entryIndex = currentEntries.findIndex(e => e.id === update.id);

      if (entryIndex !== -1) {
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

        requestAnimationFrame(() => {
          setTimeout(() => {
            const control = this.getSchedulerControl();
            if (control && !this.isDestroyed) {
              try {
                const start = this.toDayPilotDateLocal(updatedEntry.startTime);
                const end = this.toDayPilotDateLocal(updatedEntry.endTime);
                const startDate = new Date(updatedEntry.startTime);
                const endDate = new Date(updatedEntry.endTime);
                const startTimeStr = String(startDate.getHours()).padStart(2, '0');
                const endTimeStr = String(endDate.getHours()).padStart(2, '0');
                const title = `${startTimeStr} - ${endTimeStr}`;

                const existingEvent = control.events.find(updatedEntry.id);
                if (existingEvent) {
                  existingEvent.data.start = start;
                  existingEvent.data.end = end;
                  existingEvent.data.text = title;
                  existingEvent.data.resource = updatedEntry.employeeId;
                  control.events.update(existingEvent);
                }
              } catch (error) {
              }
            }
          }, 100);
        });
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Помилка оновлення графіка';
      this.toastService.error(errorMessage);

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

        this.safeUpdateScheduler((ctrl) => {
          const events = this.schedulerEvents();
          ctrl.update({ events });
        });
      }
      const control1 = this.getSchedulerControl();
      if (control1) {
        const from = control1.visibleStart().toDate();
        const to = control1.visibleEnd().toDate();
        await this.loadScheduleDataForRange(from, to);
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Помилка оновлення графіка';
      this.toastService.error(errorMessage);

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
