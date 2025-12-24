import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../employees/employee.service';
import { DepartmentService } from '../departments/department.service';
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
  private destroyRef = inject(DestroyRef);

  mode = signal<ScheduleMode>('Daily');
  selectedDate = signal<string>(new Date().toISOString().slice(0, 10));
  selectedDepartmentId = signal<number | null>(null);

  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);

  // Map: key `${employeeId}|${isoDate}` -> DayEntry
  private entries = new Map<string, DayEntry>();

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

  setMode(m: ScheduleMode) {
    this.mode.set(m);
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
  }

  updateState(empId: number, isoDate: string, state: WorkingState) {
    const entry = this.getEntry(empId, isoDate);
    entry.state = state;
    // If not working state, zero-out hours
    if (state !== 'OnWork') entry.hours = 0;
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
