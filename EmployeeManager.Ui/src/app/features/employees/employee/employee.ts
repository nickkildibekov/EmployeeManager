import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, take } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Employee } from '../../../shared/models/employee.model';
import { EmployeeUpdateData, NewEmployeeData } from '../../../shared/models/payloads';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { SpecializationService } from '../specialization.service';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { Specialization } from '../../../shared/models/specialization.model';
import { getDepartmentDisplayName, getPositionDisplayName, getSpecializationDisplayName, formatDateDDMMYYYY } from '../../../shared/utils/display.utils';
import { EmployeeModalComponent } from '../employee-modal/employee-modal.component';

@Component({
  selector: 'app-employee',
  imports: [CommonModule, FormsModule, EmployeeModalComponent],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class EmployeeComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private positionService = inject(PositionService);
  private specializationService = inject(SpecializationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  employee = signal<Employee | undefined>(undefined);
  departments = signal<Department[]>([]);
  allDepartmentsWithPositions = signal<Department[]>([]); // Store all departments with positions for filtering
  positions = signal<Position[]>([]);
  specializations = signal<Specialization[]>([]);

  // Employee modal state
  isModalOpen = signal(false);
  selectedEmployeeForModal = signal<Employee | null>(null);
  formPositions = signal<Position[]>([]);



  isFetching = signal(false);
  isSaving = signal(false);
  error = signal('');

  employeeId: string | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
    this.loadSpecializations();

    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          if (!id) {
            const errorMsg = 'ID співробітника відсутній або недійсний!';
            this.error.set(errorMsg);
            this.toastService.error(errorMsg);
            this.isFetching.set(false);
            return [];
          }

          this.employeeId = id;
          this.isFetching.set(true);
          return this.employeeService.getEmployee(id);
        })
      )
      .subscribe({
        next: (emp) => {
          this.employee.set(emp);
          
          // Check if employee's department is Reserve - if so, set departmentId to null
          // We need to check this by comparing with departmentName from API
          let departmentId = emp.departmentId;
          if (emp.departmentName && (emp.departmentName === 'Reserve' || emp.departmentName === 'Резерв' || emp.departmentName === 'Global Reserve')) {
            departmentId = null; // Set to null so it shows as "Резерв" option in select
          }
          
          // Ensure positionId is set - if null, find Unemployed position
          let positionId = emp.positionId;
          if (!positionId) {
            const allPositions = this.positions();
            const unemployedPosition = allPositions.find(p => p.title === 'Unemployed' || p.title === 'Без Посади');
            positionId = unemployedPosition ? unemployedPosition.id : null;
          }
          
          this.isFetching.set(false);
        },
        error: (error: Error) => {
          this.error.set(error.message);
          this.toastService.error(error.message);
          this.isFetching.set(false);
        },
      });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => {
        // Store all departments with positions for filtering
        this.allDepartmentsWithPositions.set(depts);
        // Filter out Reserve department to avoid duplication (it's represented by null option)
        const filtered = depts.filter(d => d.name !== 'Reserve' && d.name !== 'Резерв' && d.name !== 'Global Reserve');
        this.departments.set(filtered);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadPositions() {
    const sub = this.positionService.getAllPositions().subscribe({
      next: (pos) => this.positions.set(pos),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadSpecializations() {
    const sub = this.specializationService.getAllSpecializations().subscribe({
      next: (specs) => this.specializations.set(specs),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  getDepartmentDisplayName(departmentId: string | null): string {
    if (departmentId === null) return 'Резерв';
    const dept = this.departments().find(d => d.id === departmentId);
    return dept ? getDepartmentDisplayName(dept.name) : 'Резерв';
  }

  getDepartmentDisplayNameFromEmployee(): string {
    const emp = this.employee();
    if (!emp) return 'Резерв';
    // Use departmentName from API if available, otherwise find by ID
    if (emp.departmentName) {
      return getDepartmentDisplayName(emp.departmentName);
    }
    return this.getDepartmentDisplayName(emp.departmentId);
  }

  getPositionDisplayName(positionId: string | null): string {
    if (positionId === null) return 'Без Посади';
    const pos = this.positions().find(p => p.id === positionId);
    return pos ? getPositionDisplayName(pos.title) : 'Без Посади';
  }

  getPositionDisplayNameFromEmployee(): string {
    const emp = this.employee();
    if (!emp) return 'Без Посади';
    // Use positionName from API if available, otherwise find by ID
    if (emp.positionName) {
      return getPositionDisplayName(emp.positionName);
    }
    return this.getPositionDisplayName(emp.positionId);
  }

  getSpecializationDisplayName(specializationName: string | null | undefined): string {
    return getSpecializationDisplayName(specializationName);
  }

  formatDateForDisplay(dateString: string | null | undefined): string {
    return formatDateDDMMYYYY(dateString);
  }

  toggleEditMode(): void {
    // Open edit modal instead of inline editing
    const emp = this.employee();
    if (emp) {
      this.openEditModal(emp);
    }
  }

  openEditModal(employee: Employee): void {
    // Store employee for modal before opening
    this.selectedEmployeeForModal.set(employee);
    if (employee.departmentId) {
      this.loadPositionsForDepartment(employee.departmentId);
    } else {
      this.formPositions.set([]);
    }
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedEmployeeForModal.set(null);
    this.formPositions.set([]);
  }

  private loadPositionsForDepartment(departmentId: string): void {
    const allDepts = this.allDepartmentsWithPositions();
    const dept = allDepts.find(d => d.id === departmentId);
    if (dept && dept.positions) {
      this.formPositions.set(dept.positions);
    } else {
      this.formPositions.set([]);
    }
  }

  onModalDepartmentChange(departmentId: string | null): void {
    if (departmentId) {
      this.loadPositionsForDepartment(departmentId);
    } else {
      this.formPositions.set([]);
    }
  }

  onEmployeeSave(data: NewEmployeeData | EmployeeUpdateData): void {
    if ('id' in data) {
      // Update existing employee
      this.employeeService.updateEmployee(data as EmployeeUpdateData).subscribe({
        next: (updatedEmp) => {
          this.employee.set(updatedEmp);
          this.closeModal();
          this.toastService.success('Співробітника успішно оновлено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    }
  }


  async deleteEmployee(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Видалити співробітника',
      message: 'Ви впевнені, що хочете видалити цього співробітника? Цю дію неможливо скасувати.',
      confirmText: 'Видалити',
      variant: 'danger',
    });
    if (!confirmed) return;

    const id = this.employeeId;
    if (!id) return;

    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.navigationService.afterDelete('employee');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  goBack(): void {
    this.navigationService.goBack('/employees');
  }
}
