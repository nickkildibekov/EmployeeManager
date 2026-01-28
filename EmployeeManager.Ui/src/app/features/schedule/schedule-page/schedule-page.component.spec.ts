import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SchedulePageComponent } from './schedule-page.component';
import { ScheduleService } from '../schedule.service';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DayPilot } from '@daypilot/daypilot-lite-angular';
import { ScheduleEntry, ScheduleState } from '../../../shared/models/schedule-entry.model';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { of, throwError } from 'rxjs';

describe('SchedulePageComponent', () => {
  let component: SchedulePageComponent;
  let fixture: ComponentFixture<SchedulePageComponent>;
  let scheduleService: jasmine.SpyObj<ScheduleService>;
  let departmentService: jasmine.SpyObj<DepartmentService>;
  let employeeService: jasmine.SpyObj<EmployeeService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const mockDepartments: Department[] = [
    { id: '1', name: 'Відділ 1', positions: [], employees: [], equipments: [] },
    { id: '2', name: 'Відділ 2', positions: [], employees: [], equipments: [] }
  ];

  const mockEmployees: Employee[] = [
    {
      id: 'emp1',
      firstName: 'Іван',
      lastName: 'Петренко',
      callSign: 'IP001',
      phoneNumber: '123456789',
      specializationId: '1',
      departmentId: '1',
      positionId: null,
      positionName: null,
      departmentName: null,
      specializationName: null
    },
    {
      id: 'emp2',
      firstName: 'Марія',
      lastName: 'Коваленко',
      callSign: 'MK002',
      phoneNumber: '987654321',
      specializationId: '2',
      departmentId: '1',
      positionId: null,
      positionName: null,
      departmentName: null,
      specializationName: null
    },
    {
      id: 'emp3',
      firstName: 'Олег',
      lastName: 'Сидоренко',
      callSign: null,
      phoneNumber: '555555555',
      specializationId: '1',
      departmentId: '2',
      positionId: null,
      positionName: null,
      departmentName: null,
      specializationName: null
    }
  ];

  const mockScheduleEntries: ScheduleEntry[] = [
    {
      id: 'entry1',
      employeeId: 'emp1',
      departmentId: '1',
      startTime: '2026-01-28T08:00:00',
      endTime: '2026-01-28T16:00:00',
      state: 'OnWork',
      hours: 8
    },
    {
      id: 'entry2',
      employeeId: 'emp2',
      departmentId: '1',
      startTime: '2026-01-28T09:00:00',
      endTime: '2026-01-28T17:00:00',
      state: 'Training',
      hours: 8
    }
  ];

  beforeEach(async () => {
    const scheduleServiceSpy = jasmine.createSpyObj('ScheduleService', [
      'getEntries',
      'createOrUpdate',
      'delete'
    ]);
    const departmentServiceSpy = jasmine.createSpyObj('DepartmentService', [
      'getAllDepartments'
    ]);
    const employeeServiceSpy = jasmine.createSpyObj('EmployeeService', [
      'getEmployeesByDepartment'
    ]);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        SchedulePageComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ScheduleService, useValue: scheduleServiceSpy },
        { provide: DepartmentService, useValue: departmentServiceSpy },
        { provide: EmployeeService, useValue: employeeServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    scheduleService = TestBed.inject(ScheduleService) as jasmine.SpyObj<ScheduleService>;
    departmentService = TestBed.inject(DepartmentService) as jasmine.SpyObj<DepartmentService>;
    employeeService = TestBed.inject(EmployeeService) as jasmine.SpyObj<EmployeeService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    // Setup default return values
    departmentService.getAllDepartments.and.returnValue(of(mockDepartments));
    employeeService.getEmployeesByDepartment.and.returnValue(of({
      items: mockEmployees,
      total: mockEmployees.length
    }));
    scheduleService.getEntries.and.returnValue(of(mockScheduleEntries));
    scheduleService.createOrUpdate.and.returnValue(of({ message: 'Success', id: 'new-id' }));
    scheduleService.delete.and.returnValue(of(void 0));

    fixture = TestBed.createComponent(SchedulePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.currentView()).toBe('day');
      expect(component.isLoading()).toBe(false);
      expect(component.isQuickFillMode()).toBe(false);
      expect(component.selectedTemplate()).toBeNull();
      expect(component.selectedTemplateState()).toBe('OnWork');
      expect(component.isDeleteModalOpen()).toBe(false);
    });

    it('should load departments and employees on init', async () => {
      await component.ngOnInit();
      
      expect(departmentService.getAllDepartments).toHaveBeenCalled();
      expect(employeeService.getEmployeesByDepartment).toHaveBeenCalled();
      expect(component.departments().length).toBe(2);
      expect(component.employees().length).toBe(3);
    });

    it('should handle errors when loading departments', async () => {
      departmentService.getAllDepartments.and.returnValue(throwError(() => new Error('Network error')));
      
      await component.ngOnInit();
      
      expect(departmentService.getAllDepartments).toHaveBeenCalled();
      expect(component.departments().length).toBe(0);
    });

    it('should handle errors when loading employees', async () => {
      employeeService.getEmployeesByDepartment.and.returnValue(throwError(() => new Error('Network error')));
      
      await component.ngOnInit();
      
      expect(employeeService.getEmployeesByDepartment).toHaveBeenCalled();
      expect(component.employees().length).toBe(0);
    });
  });

  describe('View Management', () => {
    it('should set view to day', () => {
      component.setView('day');
      expect(component.currentView()).toBe('day');
    });

    it('should set view to week', () => {
      component.setView('week');
      expect(component.currentView()).toBe('week');
    });

    it('should set view to year', () => {
      component.setView('year');
      expect(component.currentView()).toBe('year');
    });

    it('should update scheduler config when view changes', () => {
      const updateSpy = spyOn(component as any, 'updateSchedulerConfig');
      component.setView('week');
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to previous day in day view', () => {
      const initialDate = component.currentDate();
      component.setView('day');
      component.navigatePrevious();
      
      const newDate = component.currentDate();
      expect(newDate.toDateLocal().getTime()).toBeLessThan(initialDate.toDateLocal().getTime());
    });

    it('should navigate to previous week in week view', () => {
      const initialDate = component.currentDate();
      component.setView('week');
      component.navigatePrevious();
      
      const newDate = component.currentDate();
      expect(newDate.toDateLocal().getTime()).toBeLessThan(initialDate.toDateLocal().getTime());
    });

    it('should navigate to next day in day view', () => {
      const initialDate = component.currentDate();
      component.setView('day');
      component.navigateNext();
      
      const newDate = component.currentDate();
      expect(newDate.toDateLocal().getTime()).toBeGreaterThan(initialDate.toDateLocal().getTime());
    });

    it('should navigate to next week in week view', () => {
      const initialDate = component.currentDate();
      component.setView('week');
      component.navigateNext();
      
      const newDate = component.currentDate();
      expect(newDate.toDateLocal().getTime()).toBeGreaterThan(initialDate.toDateLocal().getTime());
    });

    it('should navigate to today', () => {
      const today = DayPilot.Date.today();
      component.currentDate.set(today.addDays(5));
      
      component.navigateToday();
      
      const currentDate = component.currentDate();
      expect(currentDate.toString()).toBe(today.toString());
    });
  });

  describe('Date Display Formatting', () => {
    it('should format date for day view in Ukrainian', () => {
      component.setView('day');
      const date = DayPilot.Date.today();
      const display = component.getCurrentDateDisplay();
      
      expect(display).toContain('січня');
      expect(display).toContain('2026');
    });

    it('should format date range for week view in Ukrainian', () => {
      component.setView('week');
      const display = component.getCurrentDateDisplay();
      
      expect(display).toContain(' - ');
      expect(display).toContain('січня');
    });

    it('should format date for year view in Ukrainian', () => {
      component.setView('year');
      const display = component.getCurrentDateDisplay();
      
      expect(display).toContain('Січень');
      expect(display).toContain('2026');
    });
  });

  describe('State Filters', () => {
    it('should toggle state filter', () => {
      const initialState = component.filterStates().Training;
      component.toggleStateFilter('Training');
      
      expect(component.filterStates().Training).toBe(!initialState);
    });

    it('should filter entries based on state filters', () => {
      component.scheduleEntries.set(mockScheduleEntries);
      component.filterStates.set({
        Training: true,
        OnWork: false,
        Rest: true,
        Vacation: true,
        Illness: true
      });
      
      const filtered = component.filteredEntries();
      expect(filtered.length).toBe(1);
      expect(filtered[0].state).toBe('Training');
    });

    it('should show all entries when all filters are enabled', () => {
      component.scheduleEntries.set(mockScheduleEntries);
      component.filterStates.set({
        Training: true,
        OnWork: true,
        Rest: true,
        Vacation: true,
        Illness: true
      });
      
      const filtered = component.filteredEntries();
      expect(filtered.length).toBe(2);
    });
  });

  describe('Quick Fill Mode', () => {
    it('should toggle quick fill mode', () => {
      const initialState = component.isQuickFillMode();
      component.toggleQuickFillMode();
      
      expect(component.isQuickFillMode()).toBe(!initialState);
    });

    it('should set default template when enabling quick fill mode', () => {
      component.selectedTemplate.set(null);
      component.toggleQuickFillMode();
      
      expect(component.selectedTemplate()).toBe(8);
    });

    it('should clear template when disabling quick fill mode', () => {
      component.isQuickFillMode.set(true);
      component.selectedTemplate.set(4);
      component.toggleQuickFillMode();
      
      expect(component.selectedTemplate()).toBeNull();
    });

    it('should select template only in quick fill mode', () => {
      component.isQuickFillMode.set(false);
      component.selectTemplate(4);
      
      expect(component.selectedTemplate()).toBeNull();
    });

    it('should select template when in quick fill mode', () => {
      component.isQuickFillMode.set(true);
      component.selectTemplate(4);
      
      expect(component.selectedTemplate()).toBe(4);
    });

    it('should select template state', () => {
      component.selectTemplateState('Vacation');
      expect(component.selectedTemplateState()).toBe('Vacation');
    });
  });

  describe('Scheduler Resources', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should create scheduler resources from employees and departments', () => {
      const resources = component.schedulerResources();
      
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.some(r => String(r.id).startsWith('dept-'))).toBe(true);
      expect(resources.some(r => r.id === 'emp1')).toBe(true);
    });

    it('should group employees by department', () => {
      const resources = component.schedulerResources();
      const deptResources = resources.filter(r => String(r.id).startsWith('dept-'));
      
      expect(deptResources.length).toBe(2);
    });

    it('should handle employees without department', () => {
      const empWithoutDept: Employee = {
        id: 'emp4',
        firstName: 'Test',
        lastName: 'User',
        callSign: 'TU001',
        phoneNumber: '111111111',
        specializationId: '1',
        departmentId: null,
        positionId: null,
        positionName: null,
        departmentName: null,
        specializationName: null
      };
      
      component.employees.set([...mockEmployees, empWithoutDept]);
      const resources = component.schedulerResources();
      
      expect(resources.some(r => r.id === 'emp4')).toBe(true);
    });
  });

  describe('Scheduler Events', () => {
    beforeEach(async () => {
      await component.ngOnInit();
      component.scheduleEntries.set(mockScheduleEntries);
    });

    it('should convert schedule entries to DayPilot events', () => {
      const events = component.schedulerEvents();
      
      expect(events.length).toBe(2);
      expect(events[0].id).toBe('entry1');
      expect(events[0].resource).toBe('emp1');
    });

    it('should filter events based on state filters', () => {
      component.filterStates.set({
        Training: false,
        OnWork: true,
        Rest: true,
        Vacation: true,
        Illness: true
      });
      
      const events = component.schedulerEvents();
      expect(events.length).toBe(1);
      expect(events[0].id).toBe('entry1');
    });

    it('should handle overnight events correctly', () => {
      const overnightEntry: ScheduleEntry = {
        id: 'entry3',
        employeeId: 'emp1',
        departmentId: '1',
        startTime: '2026-01-28T22:00:00',
        endTime: '2026-01-29T06:00:00',
        state: 'OnWork',
        hours: 8
      };
      
      component.scheduleEntries.set([...mockScheduleEntries, overnightEntry]);
      const events = component.schedulerEvents();
      
      const overnightEvent = events.find(e => e.id === 'entry3');
      expect(overnightEvent).toBeDefined();
    });
  });

  describe('Cell Width Calculation', () => {
    it('should calculate day cell width', () => {
      const width = (component as any).calculateDayCellWidth();
      expect(width).toBeGreaterThan(0);
      expect(width).toBeGreaterThanOrEqual(45);
    });

    it('should calculate week hour cell width', () => {
      const width = (component as any).calculateWeekHourCellWidth();
      expect(width).toBeGreaterThan(0);
      expect(width).toBeGreaterThanOrEqual(5);
    });

    it('should handle errors in cell width calculation gracefully', () => {
      spyOn(document, 'querySelector').and.returnValue(null);
      const width = (component as any).calculateDayCellWidth();
      
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should get employee name by ID', () => {
      const name = component.getEmployeeName('emp1');
      expect(name).toBe('IP001');
    });

    it('should get employee name from firstName and lastName when callSign is empty', () => {
      const name = component.getEmployeeName('emp3');
      expect(name).toContain('Олег');
      expect(name).toContain('Сидоренко');
    });

    it('should return default message for unknown employee', () => {
      const name = component.getEmployeeName('unknown');
      expect(name).toBe('Невідомий працівник');
    });

    it('should get state label in Ukrainian', () => {
      expect(component.getStateLabel('OnWork')).toBe('Робота');
      expect(component.getStateLabel('Training')).toBe('Навчання');
      expect(component.getStateLabel('Vacation')).toBe('Відпустка');
      expect(component.getStateLabel('Illness')).toBe('Лікарняний');
      expect(component.getStateLabel('Rest')).toBe('Вихідний');
    });

    it('should format time range correctly', () => {
      const formatted = component.formatTimeRange(
        '2026-01-28T08:00:00',
        '2026-01-28T16:00:00'
      );
      
      expect(formatted).toContain('08:00');
      expect(formatted).toContain('16:00');
    });
  });

  describe('Delete Modal', () => {
    it('should open delete modal', () => {
      const entry = mockScheduleEntries[0];
      component.entryToDelete.set(entry);
      component.isDeleteModalOpen.set(true);
      
      expect(component.isDeleteModalOpen()).toBe(true);
      expect(component.entryToDelete()).toBe(entry);
    });

    it('should close delete modal', () => {
      component.isDeleteModalOpen.set(true);
      component.entryToDelete.set(mockScheduleEntries[0]);
      
      component.closeDeleteModal();
      
      expect(component.isDeleteModalOpen()).toBe(false);
      expect(component.entryToDelete()).toBeNull();
    });

    it('should confirm delete and call delete service', async () => {
      const entry = mockScheduleEntries[0];
      component.entryToDelete.set(entry);
      component.isDeleteModalOpen.set(true);
      
      await component.confirmDelete();
      
      expect(scheduleService.delete).toHaveBeenCalledWith(entry.id);
      expect(component.isDeleteModalOpen()).toBe(false);
    });
  });

  describe('Event Handling - Time Range Selected', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should prevent creating event on department row', async () => {
      const args = {
        start: DayPilot.Date.today().firstDayOfWeek().addHours(8),
        end: DayPilot.Date.today().firstDayOfWeek().addHours(12),
        resource: 'dept-1',
        control: {
          clearSelection: jasmine.createSpy('clearSelection')
        }
      } as any;

      await (component as any).handleTimeRangeSelected(args);

      expect(toastService.warning).toHaveBeenCalledWith(
        'Неможливо створити подію в рядку підрозділу. Виберіть працівника.'
      );
      expect(args.control.clearSelection).toHaveBeenCalled();
    });

    it('should prevent creating event without resource', async () => {
      const args = {
        start: DayPilot.Date.today().firstDayOfWeek().addHours(8),
        end: DayPilot.Date.today().firstDayOfWeek().addHours(12),
        resource: '',
        control: {
          clearSelection: jasmine.createSpy('clearSelection')
        }
      } as any;

      await (component as any).handleTimeRangeSelected(args);

      expect(toastService.warning).toHaveBeenCalledWith(
        'Виберіть працівника для створення запису'
      );
      expect(args.control.clearSelection).toHaveBeenCalled();
    });

    it('should create entry in quick fill mode', async () => {
      component.isQuickFillMode.set(true);
      component.selectedTemplate.set(8);
      component.selectedTemplateState.set('OnWork');

      const args = {
        start: DayPilot.Date.today().firstDayOfWeek().addHours(8),
        end: DayPilot.Date.today().firstDayOfWeek().addHours(12),
        resource: 'emp1',
        control: {
          clearSelection: jasmine.createSpy('clearSelection')
        }
      } as any;

      await (component as any).handleTimeRangeSelected(args);

      expect(scheduleService.createOrUpdate).toHaveBeenCalled();
      expect(args.control.clearSelection).toHaveBeenCalled();
    });

    it('should validate time range', async () => {
      const args = {
        start: DayPilot.Date.today().firstDayOfWeek().addHours(12),
        end: DayPilot.Date.today().firstDayOfWeek().addHours(8),
        resource: 'emp1',
        control: {
          clearSelection: jasmine.createSpy('clearSelection')
        }
      } as any;

      await (component as any).handleTimeRangeSelected(args);

      expect(toastService.warning).toHaveBeenCalledWith(
        'Час закінчення повинен бути після часу початку'
      );
      expect(args.control.clearSelection).toHaveBeenCalled();
    });
  });

  describe('Event Handling - Event Move', () => {
    beforeEach(async () => {
      await component.ngOnInit();
      component.scheduleEntries.set(mockScheduleEntries);
    });

    it('should prevent moving event to department row', async () => {
      const entry = mockScheduleEntries[0];
      const args = {
        e: {
          id: entry.id,
          resource: entry.employeeId,
          data: { tags: { entry } }
        },
        newStart: DayPilot.Date.today().firstDayOfWeek().addHours(10),
        newEnd: DayPilot.Date.today().firstDayOfWeek().addHours(14),
        newResource: 'dept-1',
        loaded: jasmine.createSpy('loaded')
      } as any;

      spyOn(component as any, 'getSchedulerControl').and.returnValue({
        visibleStart: () => DayPilot.Date.today(),
        visibleEnd: () => DayPilot.Date.today().addDays(1)
      });
      spyOn(component as any, 'loadScheduleDataForRange').and.returnValue(Promise.resolve());

      await (component as any).handleEventMove(args);

      expect(toastService.warning).toHaveBeenCalledWith(
        'Неможливо перемістити подію в рядок підрозділу. Виберіть рядок працівника.'
      );
    });

    it('should update entry when moved to valid resource', async () => {
      const entry = mockScheduleEntries[0];
      const args = {
        e: {
          id: entry.id,
          resource: entry.employeeId,
          data: { tags: { entry } }
        },
        newStart: DayPilot.Date.today().firstDayOfWeek().addHours(10),
        newEnd: DayPilot.Date.today().firstDayOfWeek().addHours(14),
        newResource: 'emp2',
        loaded: jasmine.createSpy('loaded')
      } as any;

      await (component as any).handleEventMove(args);

      expect(args.loaded).toHaveBeenCalled();
      expect(scheduleService.createOrUpdate).toHaveBeenCalled();
    });
  });

  describe('Event Handling - Event Resize', () => {
    beforeEach(async () => {
      await component.ngOnInit();
      component.scheduleEntries.set(mockScheduleEntries);
    });

    it('should validate time range when resizing', async () => {
      const entry = mockScheduleEntries[0];
      const args = {
        e: {
          id: entry.id,
          resource: entry.employeeId,
          data: { tags: { entry } }
        },
        newStart: DayPilot.Date.today().firstDayOfWeek().addHours(14),
        newEnd: DayPilot.Date.today().firstDayOfWeek().addHours(10),
        loaded: jasmine.createSpy('loaded')
      } as any;

      spyOn(component as any, 'getSchedulerControl').and.returnValue({
        visibleStart: () => DayPilot.Date.today(),
        visibleEnd: () => DayPilot.Date.today().addDays(1)
      });
      spyOn(component as any, 'loadScheduleDataForRange').and.returnValue(Promise.resolve());

      await (component as any).handleEventResize(args);

      expect(toastService.warning).toHaveBeenCalledWith(
        'Час закінчення повинен бути після часу початку'
      );
    });

    it('should update entry when resized to valid range', async () => {
      const entry = mockScheduleEntries[0];
      const args = {
        e: {
          id: entry.id,
          resource: entry.employeeId,
          data: { tags: { entry } }
        },
        newStart: DayPilot.Date.today().firstDayOfWeek().addHours(8),
        newEnd: DayPilot.Date.today().firstDayOfWeek().addHours(18),
        loaded: jasmine.createSpy('loaded')
      } as any;

      await (component as any).handleEventResize(args);

      expect(args.loaded).toHaveBeenCalled();
      expect(scheduleService.createOrUpdate).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on destroy', () => {
      spyOn(component as any, 'setupResizeHandler').and.returnValue(() => {});
      component.ngAfterViewInit();
      
      component.ngOnDestroy();
      
      expect((component as any).isDestroyed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when loading schedule data', async () => {
      scheduleService.getEntries.and.returnValue(throwError(() => new Error('Network error')));
      
      await (component as any).loadScheduleDataForRange(new Date(), new Date());
      
      expect(toastService.error).toHaveBeenCalledWith('Помилка завантаження графіка');
      expect(component.isLoading()).toBe(false);
    });

    it('should handle errors when creating entry', async () => {
      scheduleService.createOrUpdate.and.returnValue(throwError(() => new Error('Server error')));
      
      const create: any = {
        employeeId: 'emp1',
        departmentId: '1',
        startTime: '2026-01-28T08:00:00',
        endTime: '2026-01-28T16:00:00',
        state: 'OnWork'
      };
      
      try {
        await (component as any).createScheduleEntry(create);
      } catch (error) {
        // Expected to throw
      }
      
      // Error should be handled internally
      expect(scheduleService.createOrUpdate).toHaveBeenCalled();
    });

    it('should handle errors when deleting entry', async () => {
      scheduleService.delete.and.returnValue(throwError(() => new Error('Delete error')));
      
      try {
        await (component as any).deleteScheduleEntry('entry1');
      } catch (error) {
        // Expected to throw
      }
      
      // Error should be handled internally
      expect(scheduleService.delete).toHaveBeenCalled();
    });
  });
});
