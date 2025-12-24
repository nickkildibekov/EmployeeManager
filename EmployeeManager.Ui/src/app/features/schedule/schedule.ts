import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../employees/employee.service';
import { DepartmentService } from '../departments/department.service';
import { ScheduleService, ScheduleEntry, ScheduleEntryPayload } from './schedule.service';
import { Employee } from '../../shared/models/employee.model';
import { Department } from '../../shared/models/department.model';

export type ScheduleMode = 'Daily' | 'Week' | 'Month' | 'Year';
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

  mode = signal<ScheduleMode>('Daily');
  selectedDate = signal<string>(new Date().toISOString().slice(0, 10));
  selectedDepartmentId = signal<number | null>(null);

  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);

  // Map: key `${employeeId}|${isoDate}` -> DayEntry
  private entries = new Map<string, DayEntry>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDepartments();
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => console.error(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onDepartmentChange(depId: string) {
    const id = depId ? parseInt(depId, 10) : null;
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
    if (!depId) {
      this.employees.set([]);
      return;
    }
    const sub = this.employeeService
      .getEmployeesByDepartment(depId, 1, 100)
      .subscribe({
        next: (res) => this.employees.set(res.items),
        error: (err: Error) => console.error(err.message),
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadScheduleEntries() {
    const deptId = this.selectedDepartmentId();
    if (!deptId) return;

    const mode = this.mode();
    let startDate = this.selectedDate();
    let endDate = this.selectedDate();

    // Calculate date range based on mode
    if (mode === 'Week') {
      const start = new Date(startDate);
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffToMonday);
      startDate = start.toISOString().slice(0, 10);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      endDate = end.toISOString().slice(0, 10);
    } else if (mode === 'Month') {
      const cur = new Date(startDate);
      const y = cur.getFullYear();
      const m = cur.getMonth();
      startDate = new Date(y, m, 1).toISOString().slice(0, 10);
      endDate = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    } else if (mode === 'Year') {
      const cur = new Date(startDate);
      const y = cur.getFullYear();
      startDate = new Date(y, 0, 1).toISOString().slice(0, 10);
      endDate = new Date(y, 11, 31).toISOString().slice(0, 10);
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const sub = this.scheduleService
      .getEntries(deptId, startDate, endDate)
      .subscribe({
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
}
