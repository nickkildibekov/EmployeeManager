import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { Specialization } from '../../../shared/models/specialization.model';
import { Employee } from '../../../shared/models/employee.model';
import { NewEmployeeData, EmployeeUpdateData } from '../../../shared/models/payloads';
import { getDepartmentDisplayName, getPositionDisplayName, getSpecializationDisplayName } from '../../../shared/utils/display.utils';

@Component({
  selector: 'app-employee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-modal.component.html',
  styleUrl: './employee-modal.component.css',
})
export class EmployeeModalComponent implements OnChanges {
  @Input() isOpen = signal(false);
  @Input() employee: Employee | null = null;
  @Input() departments: Department[] = [];
  @Input() positions: Position[] = [];
  @Input() specializations: Specialization[] = [];
  @Input() formPositions: Position[] = [];

  // Computed property to filter out Reserve department to avoid duplication
  filteredDepartments = computed(() => {
    return this.departments.filter(d => d.name !== 'Reserve' && d.name !== 'Резерв' && d.name !== 'Global Reserve');
  });

  @Output() save = new EventEmitter<NewEmployeeData | EmployeeUpdateData>();
  @Output() close = new EventEmitter<void>();
  @Output() departmentChange = new EventEmitter<string | null>();

  editedEmployee = signal<NewEmployeeData | EmployeeUpdateData>({
    firstName: '',
    lastName: '',
    callSign: null,
    phoneNumber: '',
    birthDate: null,
    positionId: null,
    departmentId: null,
    specializationId: '',
  });

  isEditMode = signal(false);

  constructor() {
    // Effect to set default values when lists are loaded and modal is open for new employee
    effect(() => {
      const isOpen = this.isOpen();
      const hasEmployee = this.employee !== null && this.employee !== undefined;
      const positions = this.positions;
      const specializations = this.specializations;
      const positionsLoaded = positions.length > 0;
      const specializationsLoaded = specializations.length > 0;
      
      // Only set defaults if modal is open, no employee (new mode), and lists are loaded
      if (isOpen && !hasEmployee && positionsLoaded && specializationsLoaded) {
        this.setDefaultsIfNeeded();
      }
    });
  }

  // Computed property to ensure employee's current position is always available in the select
  availablePositions = computed(() => {
    const emp = this.employee;
    const editedEmp = this.editedEmployee();
    
    // For new employees, always use all positions (not filtered by department)
    if (!emp) {
      return this.positions;
    }
    
    // For editing existing employee, use formPositions if available (filtered by department), otherwise all positions
    const basePositions = this.formPositions.length > 0 ? this.formPositions : this.positions;
    const currentPositionId = editedEmp.positionId || emp.positionId;
    if (!currentPositionId) return basePositions;
    
    // Check if current position is already in the list
    const hasCurrentPosition = basePositions.some(p => p.id === currentPositionId);
    if (hasCurrentPosition) return basePositions;
    
    // If current position is not in the list, add it
    if (emp.positionName) {
      const missingPosition: Position = {
        id: currentPositionId,
        title: emp.positionName
      };
      return [...basePositions, missingPosition];
    }
    
    return basePositions;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] || changes['isOpen'] || changes['positions'] || changes['specializations']) {
      // Check if we have an employee object (for editing) or not (for adding)
      const hasEmployee = this.employee !== null && this.employee !== undefined;
      
      if (this.isOpen() && hasEmployee) {
        // Editing existing employee
        this.isEditMode.set(true);
        // Check if employee's department is Reserve - if so, set departmentId to null
        let departmentId = this.employee.departmentId;
        if (this.employee.departmentName && (this.employee.departmentName === 'Reserve' || this.employee.departmentName === 'Резерв' || this.employee.departmentName === 'Global Reserve')) {
          departmentId = null; // Set to null so it shows as "Резерв" option in select
        }
        // Ensure positionId is set - if null, find Unemployed position
        let positionId = this.employee.positionId;
        if (!positionId) {
          const allPositions = this.formPositions.length > 0 ? this.formPositions : this.positions;
          const unemployedPosition = allPositions.find(p => p.title === 'Unemployed' || p.title === 'Без Посади');
          positionId = unemployedPosition ? unemployedPosition.id : null;
        }
        this.editedEmployee.set({
          id: this.employee.id,
          firstName: this.employee.firstName,
          lastName: this.employee.lastName,
          callSign: this.employee.callSign ?? null,
          phoneNumber: this.employee.phoneNumber,
          birthDate: this.employee.birthDate ?? null,
          positionId: positionId,
          departmentId: departmentId,
          specializationId: this.employee.specializationId,
        });
      } else if (this.isOpen() && !hasEmployee) {
        // Adding new employee - initialize with defaults
        this.initializeNewEmployeeForm();
        
        // If lists are loaded after modal opens, set defaults
        if (this.positions.length > 0 && this.specializations.length > 0) {
          this.setDefaultsIfNeeded();
        }
      }
    }
  }

  private setDefaultsIfNeeded(): void {
    const current = this.editedEmployee();
    let needsUpdate = false;
    const updates: Partial<NewEmployeeData | EmployeeUpdateData> = {};
    
    // Only set defaults if they're not already set
    if (current.positionId === null || current.positionId === undefined) {
      const unemployedPosition = this.positions.find(p => p.title === 'Unemployed' || p.title === 'Без Посади');
      if (unemployedPosition) {
        updates.positionId = unemployedPosition.id;
        needsUpdate = true;
      }
    }
    
    if (!current.specializationId || current.specializationId === '') {
      const internSpecialization = this.specializations.find(s => s.name === 'Intern' || s.name === 'Без Спец.');
      const defaultSpecId = internSpecialization ? internSpecialization.id : (this.specializations.length > 0 ? this.specializations[0].id : '');
      if (defaultSpecId) {
        updates.specializationId = defaultSpecId;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      this.editedEmployee.update(e => ({ ...e, ...updates }));
    }
  }

  private initializeNewEmployeeForm(): void {
    this.isEditMode.set(false);
    
    // Find "Intern" specialization (Без Спец.) as default
    const internSpecialization = this.specializations.find(s => s.name === 'Intern' || s.name === 'Без Спец.');
    const defaultSpecId = internSpecialization ? internSpecialization.id : (this.specializations.length > 0 ? this.specializations[0].id : '');
    
    // Set default position to "Unemployed" (Без Посади) if available
    // Check in all positions list (Unemployed should be there)
    const unemployedPosition = this.positions.find(p => p.title === 'Unemployed' || p.title === 'Без Посади');
    const defaultPositionId = unemployedPosition ? unemployedPosition.id : null;
    
    // Set default departmentId to null (which represents Reserve)
    // null will be displayed as "Резерв" in the select dropdown
    this.editedEmployee.set({
      firstName: '',
      lastName: '',
      callSign: null,
      phoneNumber: '',
      birthDate: null,
      positionId: defaultPositionId,
      departmentId: null, // null = Reserve (Резерв)
      specializationId: defaultSpecId,
    });
  }

  formatDateForInput(dateString: string | null | undefined): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  onBirthDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.editedEmployee.update(e => ({
      ...e,
      birthDate: value ? value + 'T00:00:00' : null
    }));
  }

  onDepartmentChange(value: string | null): void {
    const id: string | null = value || null;
    
    this.editedEmployee.update(e => ({
      ...e,
      departmentId: id,
      positionId: null,
    }));
    this.departmentChange.emit(id);
  }

  isFormValid(): boolean {
    const emp = this.editedEmployee();
    return !!(
      emp.callSign?.trim() &&
      emp.phoneNumber.trim() &&
      emp.specializationId
    );
  }

  onSave(): void {
    if (this.isFormValid()) {
      this.save.emit(this.editedEmployee());
    }
  }

  onClose(): void {
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getDepartmentDisplayName(name: string): string {
    return getDepartmentDisplayName(name);
  }

  getPositionDisplayName(title: string): string {
    return getPositionDisplayName(title);
  }

  getSpecializationDisplayName(name: string): string {
    return getSpecializationDisplayName(name);
  }
}
