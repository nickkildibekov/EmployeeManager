import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Employee } from '../../../shared/models/employee.model';
import { EmployeeUpdateData } from '../../../shared/models/payloads';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);

  employee = signal<Employee | undefined>(undefined);
  departments = signal<Department[]>([]);
  positions = signal<Position[]>([]);

  editedEmployee = signal<EmployeeUpdateData>({
    id: 0,
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: 0,
  });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  employeeId: number | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();

    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
            this.error.set('Employee Id is missing or invalid!');
            this.toastService.error('Employee Id is missing or invalid!');
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
      });
    }
  }

  saveEmployee(): void {
    const emp = this.editedEmployee();
    if (!emp.firstName.trim() || !emp.lastName.trim() || !emp.phoneNumber.trim()) {
      this.toastService.warning('Please fill all required fields.');
      return;
    }

    this.isSaving.set(true);

    this.employeeService.updateEmployee(emp).subscribe({
      next: (updatedEmp) => {
        this.employee.set(updatedEmp);
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.toastService.success('Employee updated successfully');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.isSaving.set(false);
      },
    });
  }

  deleteEmployee(): void {
    if (!this.toastService.confirm('Are you sure you want to delete this employee?')) return;

    const id = this.employeeId;
    if (!id) return;

    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.navigationService.afterDelete('Employee', '/employees');
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
