import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../employees/employee.service';
import { DepartmentService } from '../departments/department.service';
import { ScheduleService, ScheduleEntry, ScheduleEntryPayload } from './schedule.service';
import { Employee as EmployeeModel } from '../../shared/models/employee.model';
import { Department } from '../../shared/models/department.model';

export type ScheduleMode = 'hour' | 'day' | 'week' | 'month';
export type WorkingState = 'OnWork' | 'Rest' | 'Vacation' | 'Illness';

interface DayEntry {
  hours: number; // 0..24
  state: WorkingState;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class ScheduleComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private scheduleService = inject(ScheduleService);
  private destroyRef = inject(DestroyRef);

  mode = signal<ScheduleMode>('day');
  selectedDate = signal<string>(new Date().toISOString().slice(0, 10));
  selectedDepartmentId = signal<number>(0);
  selectedPositionId = signal<string>('');

  departments = signal<Department[]>([]);
  employees = signal<EmployeeModel[]>([]);

  // Map: key `${employeeId}|${isoDate}` -> DayEntry
  entries = new Map<string, DayEntry>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal state
  showEditModal = signal<boolean>(false);
  editingEmployeeId = signal<number | null>(null);
  editingDate = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDepartments();
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => {
        this.departments.set(depts);
        // Auto-select first department
        if (depts.length > 0) {
          this.selectedDepartmentId.set(depts[0].id);
          this.loadEmployees();
          this.loadScheduleEntries();
        }
      },
      error: (err: Error) => console.error(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onDepartmentChange(depId: string) {
    const id = depId ? parseInt(depId, 10) : 0;
    this.selectedDepartmentId.set(id);
    this.loadEmployees();
    this.loadScheduleEntries();
  }

  onDateChange(newDate: string) {
    this.selectedDate.set(newDate);
    this.loadScheduleEntries();
  }

  private loadEmployees() {
    const depId = this.selectedDepartmentId();
    if (!depId || depId === 0) {
      this.employees.set([]);
      return;
    }
    const sub = this.employeeService.getEmployeesByDepartment(depId, 1, 100).subscribe({
      next: (res) => this.employees.set(res.items),
      error: (err: Error) => console.error(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadScheduleEntries() {
    const deptId = this.selectedDepartmentId();
    if (!deptId || deptId === 0) return;

    const mode = this.mode();
    let startDate = this.selectedDate();
    let endDate = this.selectedDate();

    // Calculate date range based on mode
    if (mode === 'day') {
      const start = new Date(startDate);
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffToMonday);
      startDate = start.toISOString().slice(0, 10);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      endDate = end.toISOString().slice(0, 10);
    } else if (mode === 'week') {
      const cur = new Date(startDate);
      const y = cur.getFullYear();
      const m = cur.getMonth();
      startDate = new Date(y, m, 1).toISOString().slice(0, 10);
      endDate = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    } else if (mode === 'month') {
      const cur = new Date(startDate);
      const y = cur.getFullYear();
      startDate = new Date(y, 0, 1).toISOString().slice(0, 10);
      endDate = new Date(y, 11, 31).toISOString().slice(0, 10);
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const sub = this.scheduleService.getEntries(deptId, startDate, endDate).subscribe({
      next: (apiEntries: ScheduleEntry[]) => {
        this.entries.clear();
        apiEntries.forEach((entry) => {
          const key = this.keyFor(entry.employeeId, entry.date.split('T')[0]);
          this.entries.set(key, { hours: entry.hours, state: entry.state });
        });
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        console.error(err.message);
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  setMode(m: ScheduleMode) {
    this.mode.set(m);
    this.loadScheduleEntries(); // Reload with new date range
  }

  keyFor(empId: number, isoDate: string) {
    return `${empId}|${isoDate}`;
  }

  getEntry(empId: number, isoDate: string): DayEntry {
    const key = this.keyFor(empId, isoDate);
    if (!this.entries.has(key)) {
      this.entries.set(key, { hours: 0, state: 'Rest' });
    }
    return this.entries.get(key)!;
  }

  updateHours(empId: number, isoDate: string, hours: number) {
    const normalized = Math.max(0, Math.min(24, Math.floor(hours)));
    const entry = this.getEntry(empId, isoDate);
    entry.hours = normalized;
    // If hours > 0 and state is Rest, flip to OnWork for convenience
    if (normalized > 0 && entry.state === 'Rest') entry.state = 'OnWork';

    // Save to API
    this.saveEntryToApi(empId, isoDate, entry);
  }

  updateState(empId: number, isoDate: string, state: WorkingState) {
    const entry = this.getEntry(empId, isoDate);
    entry.state = state;
    // If not working state, zero-out hours
    if (state !== 'OnWork') entry.hours = 0;

    // Save to API
    this.saveEntryToApi(empId, isoDate, entry);
  }

  private saveEntryToApi(empId: number, isoDate: string, entry: DayEntry) {
    const deptId = this.selectedDepartmentId();
    if (!deptId) return;

    const payload: ScheduleEntryPayload = {
      employeeId: empId,
      date: isoDate,
      hours: entry.hours,
      state: entry.state,
      departmentId: deptId,
    };

    const sub = this.scheduleService.saveEntry(payload).subscribe({
      next: () => {
        // Successfully saved
      },
      error: (err: Error) => {
        console.error('Error saving entry:', err.message);
        this.errorMessage.set(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  // Derived summaries
  weekDays = computed(() => {
    const start = new Date(this.selectedDate());
    // Set to Monday
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7; // 0=Sunday -> 6
    start.setDate(start.getDate() - diffToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  });

  monthDays = computed(() => {
    const cur = new Date(this.selectedDate());
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const first = new Date(y, m, 1);
    const next = new Date(y, m + 1, 1);
    const days = Math.round((+next - +first) / (1000 * 60 * 60 * 24));
    return Array.from({ length: days }, (_, i) => new Date(y, m, i + 1).toISOString().slice(0, 10));
  });

  yearMonths = computed(() => {
    const cur = new Date(this.selectedDate());
    const y = cur.getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(y, i, 1).toISOString().slice(0, 10));
  });

  // Timeline columns based on zoom level
  timelineColumns = computed(() => {
    const mode = this.mode();
    const baseDate = new Date(this.selectedDate());
    baseDate.setHours(0, 0, 0, 0);

    if (mode === 'hour') {
      // 24 hours starting from selected date
      return Array.from({ length: 24 }, (_, i) => {
        const d = new Date(baseDate);
        d.setHours(i);
        return d;
      });
    } else if (mode === 'day') {
      // 7 days (week view)
      const day = baseDate.getDay();
      const diffToMonday = (day + 6) % 7;
      baseDate.setDate(baseDate.getDate() - diffToMonday);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        return d;
      });
    } else if (mode === 'week') {
      // 4-5 weeks (month view)
      const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const day = firstOfMonth.getDay();
      const diffToMonday = (day + 6) % 7;
      firstOfMonth.setDate(firstOfMonth.getDate() - diffToMonday);
      return Array.from({ length: 35 }, (_, i) => {
        const d = new Date(firstOfMonth);
        d.setDate(firstOfMonth.getDate() + i);
        return d;
      });
    } else {
      // month
      // 12 months
      const firstOfYear = new Date(baseDate.getFullYear(), 0, 1);
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(firstOfYear);
        d.setMonth(i);
        return d;
      });
    }
  });

  // Filtered employees by position
  filteredEmployees = computed(() => {
    const posId = this.selectedPositionId();
    const emps = this.employees();
    if (!posId) return emps;
    return emps.filter((e) => e.positionName === posId);
  });

  // Get unique positions from employees
  availablePositions = computed(() => {
    const emps = this.employees();
    const positions = new Map<number, string>();
    emps.forEach((e) => {
      if (e.positionId && e.positionName) {
        positions.set(e.positionId, e.positionName);
      }
    });
    return Array.from(positions.entries()).map(([id, title]) => ({ id, title }));
  });

  onCellClick(empId: number, colDate: string) {
    this.openEditModal(empId, colDate);
  }

  openEditModal(empId: number, isoDate: string) {
    this.editingEmployeeId.set(empId);
    this.editingDate.set(isoDate);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingEmployeeId.set(null);
    this.editingDate.set(null);
  }

  getEditingEntry() {
    const empId = this.editingEmployeeId();
    const date = this.editingDate();
    if (empId && date) {
      return this.getEntry(empId, date.slice(0, 10));
    }
    return { hours: 0, state: 'Rest' as WorkingState };
  }

  updateEditingEntry(hours: number, state: WorkingState) {
    const empId = this.editingEmployeeId();
    const date = this.editingDate();
    if (empId && date) {
      const isoDate = date.slice(0, 10);
      this.updateHours(empId, isoDate, hours);
      this.updateState(empId, isoDate, state);
      this.closeEditModal();
    }
  }

  exportToCSV() {
    const employees = this.filteredEmployees();
    const entries = Array.from(this.entries.entries());
    
    let csv = 'Employee,Date,State,Hours\n';
    entries.forEach(([key, entry]) => {
      const [empIdStr, isoDate] = key.split('|');
      const empId = parseInt(empIdStr, 10);
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        csv += `"${emp.firstName} ${emp.lastName}",${isoDate},${entry.state},${entry.hours}\n`;
      }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onDragStart(empId: number, isoDate: string, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `${empId}|${isoDate}`);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(targetDate: string, event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('text/plain');
    if (!data) return;
    
    const [empIdStr, sourceDate] = data.split('|');
    const empId = parseInt(empIdStr, 10);
    const targetIsoDate = targetDate.slice(0, 10);

    if (sourceDate !== targetIsoDate) {
      const entry = this.getEntry(empId, sourceDate);
      this.entries.delete(`${empId}|${sourceDate}`);
      this.entries.set(`${empId}|${targetIsoDate}`, entry);
      
      this.saveEntryToApi(empId, sourceDate, { hours: 0, state: 'Rest' });
      this.saveEntryToApi(empId, targetIsoDate, entry);
    }
  }

  trackByEmployeeId(index: number, emp: EmployeeModel) {
    return emp.id;
  }

  trackByColumn(index: number, date: Date) {
    return date.getTime();
  }

  getIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
