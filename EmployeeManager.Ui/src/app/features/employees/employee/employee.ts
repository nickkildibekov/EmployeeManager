import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Employee } from '../../../shared/models/employee.model';
import { EmployeeUpdateData } from '../../../shared/models/payloads';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { SpecializationService } from '../specialization.service';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { Specialization } from '../../../shared/models/specialization.model';

@Component({
  selector: 'app-employee',
  imports: [CommonModule, FormsModule],
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
  positions = signal<Position[]>([]);
  specializations = signal<Specialization[]>([]);

  editedEmployee = signal<EmployeeUpdateData>({
    id: 0,
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: null,
    specializationId: 0,
  });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  employeeId: number | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
    this.loadSpecializations();

    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
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
          this.editedEmployee.set({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            phoneNumber: emp.phoneNumber,
            positionId: emp.positionId,
            departmentId: emp.departmentId,
            specializationId: emp.specializationId,
          });
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
      next: (depts) => this.departments.set(depts),
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

  getDepartmentDisplayName(departmentId: number | null): string {
    if (departmentId === null) return 'Резерв';
    const dept = this.departments().find(d => d.id === departmentId);
    return dept ? dept.name : 'Невідомо';
  }

  getPositionDisplayName(positionId: number | null): string {
    if (positionId === null) return 'Не вказано';
    const pos = this.positions().find(p => p.id === positionId);
    return pos ? pos.title : 'Невідомо';
  }

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.employee()) {
      const currentEmp = this.employee()!;
      this.editedEmployee.set({
        id: currentEmp.id,
        firstName: currentEmp.firstName,
        lastName: currentEmp.lastName,
        phoneNumber: currentEmp.phoneNumber,
        positionId: currentEmp.positionId,
        departmentId: currentEmp.departmentId,
        specializationId: currentEmp.specializationId,
      });
    }
  }

  saveEmployee(): void {
    const emp = this.editedEmployee();
    if (!emp.firstName.trim() || !emp.lastName.trim() || !emp.phoneNumber.trim()) {
      this.toastService.warning('Будь ласка, заповніть всі обов\'язкові поля.');
      return;
    }

    this.isSaving.set(true);

    this.employeeService.updateEmployee(emp).subscribe({
      next: (updatedEmp) => {
        this.employee.set(updatedEmp);
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.toastService.success('Співробітника успішно оновлено');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.isSaving.set(false);
      },
    });
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
