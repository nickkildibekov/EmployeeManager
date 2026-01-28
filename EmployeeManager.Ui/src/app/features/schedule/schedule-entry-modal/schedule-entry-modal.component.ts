import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleEntry, ScheduleEntryCreate, ScheduleEntryUpdate, ScheduleState } from '../../../shared/models/schedule-entry.model';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';

@Component({
  selector: 'app-schedule-entry-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-entry-modal.component.html',
  styleUrl: './schedule-entry-modal.component.css',
})
export class ScheduleEntryModalComponent {
  @Input() isOpen = signal(false);
  @Input() entry: ScheduleEntry | null = null;
  @Input() departments: Department[] = [];
  @Input() employees: Employee[] = [];
  @Input() selectedEmployeeId: string | null = null;
  @Input() selectedDepartmentId: string | null = null;
  @Input() startTime: Date | null = null;
  @Input() endTime: Date | null = null;

  @Output() save = new EventEmitter<ScheduleEntryCreate | ScheduleEntryUpdate>();
  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  editedEntry = signal<ScheduleEntryCreate | ScheduleEntryUpdate>({
    employeeId: '',
    startTime: '',
    endTime: '',
    state: 'OnWork',
    departmentId: '',
  });

  isEditMode = computed(() => this.entry !== null && this.entry.id !== undefined);

  // Available states with Ukrainian labels
  states: { value: ScheduleState; label: string; color: string }[] = [
    { value: 'OnWork', label: 'Робота', color: '#10b981' },
    { value: 'Training', label: 'Навчання', color: '#3b82f6' },
    { value: 'Rest', label: 'Вихідний', color: '#6b7280' },
    { value: 'Vacation', label: 'Відпустка', color: '#f59e0b' },
    { value: 'Illness', label: 'Лікарняний', color: '#ef4444' },
  ];

  // Computed: filtered employees based on selected department
  filteredEmployees = computed(() => {
    const deptId = this.editedEntry().departmentId;
    if (!deptId) {
      return this.employees;
    }
    return this.employees.filter(emp => emp.departmentId === deptId);
  });

  // Computed: check if form is valid
  isValid = computed(() => {
    const entry = this.editedEntry();
    return !!(
      entry.employeeId &&
      entry.departmentId &&
      entry.startTime &&
      entry.endTime &&
      entry.state &&
      this.isTimeRangeValid(entry.startTime, entry.endTime)
    );
  });

  // Computed: check if time range is invalid
  isTimeRangeInvalid = computed(() => {
    const entry = this.editedEntry();
    if (!entry.startTime || !entry.endTime) {
      return false;
    }
    return !this.isTimeRangeValid(entry.startTime, entry.endTime);
  });

  // Computed: duration in hours
  durationHours = computed(() => {
    const entry = this.editedEntry();
    if (!entry.startTime || !entry.endTime) {
      return 0;
    }
    if (!this.isTimeRangeValid(entry.startTime, entry.endTime)) {
      return 0;
    }
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
  });

  constructor() {
    // Watch for modal opening and update form
    effect(() => {
      const isOpen = this.isOpen();
      const entry = this.entry;
      const startTime = this.startTime;
      const endTime = this.endTime;
      const selectedEmployeeId = this.selectedEmployeeId;
      const selectedDepartmentId = this.selectedDepartmentId;

      if (isOpen) {
        // Use setTimeout to ensure inputs are set
        setTimeout(() => {
          this.updateFormFromInputs();
        }, 0);
      }
    });
  }

  private updateFormFromInputs(): void {
    if (!this.isOpen()) {
      return;
    }

    const entry: ScheduleEntryCreate | ScheduleEntryUpdate = {
      employeeId: this.selectedEmployeeId || this.entry?.employeeId || '',
      startTime: this.startTime?.toISOString() || this.entry?.startTime || '',
      endTime: this.endTime?.toISOString() || this.entry?.endTime || '',
      state: this.entry?.state || 'OnWork',
      departmentId: this.selectedDepartmentId || this.entry?.departmentId || '',
    };

    // If editing, add id
    if (this.isEditMode() && this.entry) {
      (entry as ScheduleEntryUpdate).id = this.entry.id;
    }

    // If employee is selected but department is not, get department from employee
    if (entry.employeeId && !entry.departmentId) {
      const employee = this.employees.find(e => e.id === entry.employeeId);
      if (employee?.departmentId) {
        entry.departmentId = employee.departmentId;
      }
    }

    this.editedEntry.set(entry);
  }

  onDelete(): void {
    if (this.isEditMode() && this.entry) {
      if (confirm(`Видалити запис для ${this.entry.employeeName}?`)) {
        this.delete.emit(this.entry.id);
        this.onClose();
      }
    }
  }

  onEmployeeChange(employeeId: string): void {
    const employee = this.employees.find(e => e.id === employeeId);
    const current = this.editedEntry();
    
    this.editedEntry.set({
      ...current,
      employeeId,
      departmentId: employee?.departmentId || current.departmentId,
    });
  }

  onDepartmentChange(departmentId: string): void {
    const current = this.editedEntry();
    this.editedEntry.set({
      ...current,
      departmentId,
    });
  }

  onStateChange(state: ScheduleState): void {
    const current = this.editedEntry();
    this.editedEntry.set({
      ...current,
      state,
    });
  }

  onStartTimeChange(value: string): void {
    const current = this.editedEntry();
    this.editedEntry.set({
      ...current,
      startTime: value,
    });
  }

  onEndTimeChange(value: string): void {
    const current = this.editedEntry();
    this.editedEntry.set({
      ...current,
      endTime: value,
    });
  }

  onSave(): void {
    if (!this.isValid()) {
      return;
    }

    const entry = this.editedEntry();
    
    // Parse datetime-local input (which is in local time)
    // Format: "YYYY-MM-DDTHH:mm" (local time, no timezone)
    const startTimeStr = entry.startTime;
    const endTimeStr = entry.endTime;

    // Convert datetime-local format to ISO string without timezone conversion
    // datetime-local gives us local time, we need to send it as-is
    const startDate = new Date(startTimeStr);
    const endDate = new Date(endTimeStr);

    // Validate time range using absolute timestamp comparison (allows overnight shifts)
    if (endDate.getTime() <= startDate.getTime()) {
      return; // Invalid time range (end timestamp <= start timestamp)
    }

    // Format as ISO string with local timezone offset
    // This ensures the time is interpreted correctly by the server
    const formatWithTimezone = (date: Date): string => {
      // Get timezone offset in minutes
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

    const saveData: ScheduleEntryCreate | ScheduleEntryUpdate = {
      ...entry,
      startTime: formatWithTimezone(startDate),
      endTime: formatWithTimezone(endDate),
    };

    this.save.emit(saveData);
  }

  onClose(): void {
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDateTimeLocal(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('uk-UA');
    } catch {
      return dateString;
    }
  }

  isTimeRangeValid(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) {
      return false;
    }
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      // Validate using absolute timestamp comparison (not just day comparison)
      // This allows overnight shifts where end time is on next day
      // Only invalid if end timestamp is less than or equal to start timestamp
      return end.getTime() > start.getTime();
    } catch {
      return false;
    }
  }

  // Expose Math to template
  Math = Math;
}
