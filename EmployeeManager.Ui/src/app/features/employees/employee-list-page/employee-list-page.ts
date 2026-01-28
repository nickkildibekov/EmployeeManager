import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { SpecializationService } from '../specialization.service';
import { Employee } from '../../../shared/models/employee.model';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { Specialization } from '../../../shared/models/specialization.model';
import { NewEmployeeData, EmployeeUpdateData } from '../../../shared/models/payloads';
import { EmployeeModalComponent } from '../employee-modal/employee-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog';
import { getDepartmentDisplayName, getPositionDisplayName } from '../../../shared/utils/display.utils';

@Component({
  selector: 'app-employee-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeModalComponent, ConfirmationDialogComponent],
  templateUrl: './employee-list-page.html',
  styleUrls: ['./employee-list-page.css'],
})
export class EmployeeListPageComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private positionService = inject(PositionService);
  private specializationService = inject(SpecializationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  dialogService = inject(DialogService);

  employees = signal<Employee[]>([]);
  departments = signal<Department[]>([]);
  positions = signal<Position[]>([]);
  specializations = signal<Specialization[]>([]);
  // Positions available for the add form, filtered by selected department
  formPositions = signal<Position[]>([]);

  selectedDepartmentId = signal<string | null>(null);
  selectedPositionId = signal<string | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  sortBy = signal<'callSign' | 'firstName' | 'lastName' | 'phoneNumber' | 'department' | 'position' | ''>('');
  sortOrder = signal<'asc' | 'desc'>('asc');

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);

  isModalOpen = signal(false);
  selectedEmployee = signal<Employee | null>(null);

  newEmployee = signal<NewEmployeeData>({
    firstName: '',
    lastName: '',
    callSign: null,
    phoneNumber: '',
    birthDate: null,
    positionId: null,
    departmentId: null,
    specializationId: '',
  });

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
    this.loadSpecializations();
    this.loadEmployees();
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
      next: (specs) => {
        this.specializations.set(specs);
        // Set default specialization if available
        if (specs.length > 0 && !this.newEmployee().specializationId) {
          this.newEmployee.update(emp => ({ ...emp, specializationId: specs[0].id }));
        }
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadPositionsForDepartment(depId: string | null) {
    const sub = this.positionService.getPositionsByDepartmentId(depId).subscribe({
      next: (pos) => this.formPositions.set(pos),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.formPositions.set([]);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  loadEmployees() {
    this.isLoading.set(true);
    const sub = this.employeeService
      .getEmployeesByDepartment(
        this.selectedDepartmentId(),
        this.page(),
        this.pageSize(),
        this.searchTerm(),
        this.selectedPositionId(),
        this.sortBy(),
        this.sortOrder()
      )
      .subscribe({
        next: (res) => {
          this.employees.set(res.items);
          this.total.set(res.total);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
        complete: () => this.isLoading.set(false),
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadEmployees();
  }

  onDepartmentChange(depId: string) {
    const id = depId || null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadEmployees();
  }

  onPositionChange(posId: string) {
    const id = posId || null;
    this.selectedPositionId.set(id);
    this.page.set(1);
    this.loadEmployees();
  }

  toggleSort(column: 'callSign' | 'firstName' | 'lastName' | 'phoneNumber' | 'department' | 'position') {
    if (this.sortBy() === column) {
      this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.loadEmployees();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadEmployees();
  }

  openAddModal() {
    this.selectedEmployee.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(employee: Employee) {
    this.selectedEmployee.set(employee);
    if (employee.departmentId) {
      this.loadPositionsForDepartment(employee.departmentId);
    } else {
      this.formPositions.set([]);
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedEmployee.set(null);
    this.formPositions.set([]);
  }

  onModalDepartmentChange(departmentId: string | null) {
    if (departmentId) {
      this.loadPositionsForDepartment(departmentId);
    } else {
      this.formPositions.set([]);
    }
  }

  onEmployeeSave(data: NewEmployeeData | EmployeeUpdateData) {
    if ('id' in data) {
      // Update existing employee
      this.employeeService.updateEmployee(data as EmployeeUpdateData).subscribe({
        next: () => {
          this.closeModal();
          this.loadEmployees();
          this.toastService.success('Співробітника успішно оновлено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    } else {
      // Create new employee
      this.employeeService.addEmployee(data as NewEmployeeData).subscribe({
        next: () => {
          this.closeModal();
          this.page.set(1);
          this.loadEmployees();
          this.toastService.success('Співробітника успішно створено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    }
  }

  async confirmDelete(employee: Employee): Promise<void> {
    const isFromReserve = employee.departmentName === 'Reserve' || employee.departmentName === 'Резерв';
    
    const confirmed = await this.dialogService.confirm({
      title: 'Видалити співробітника',
      message: isFromReserve 
        ? `Ви впевнені, що хочете остаточно видалити співробітника "${employee.firstName} ${employee.lastName}"? Цю дію неможливо скасувати.`
        : `Ви впевнені, що хочете перемістити співробітника "${employee.firstName} ${employee.lastName}" в резерв?`,
      confirmText: isFromReserve ? 'Видалити' : 'Перемістити в резерв',
      cancelText: 'Скасувати',
      variant: isFromReserve ? 'danger' : 'warning',
    });
    
    if (!confirmed) return;

    this.employeeService.deleteEmployee(employee.id).subscribe({
      next: (result) => {
        this.loadEmployees();
        this.toastService.success(isFromReserve 
          ? 'Співробітника успішно видалено' 
          : 'Співробітника переміщено в резерв');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  openEmployee(id: string) {
    this.router.navigate(['/employees', id]);
  }

  getDepartmentDisplayName(name: string | null | undefined): string {
    if (!name) return 'Резерв';
    if (name === 'Reserve' || name === 'Global Reserve') return 'Резерв';
    return name;
  }

  getPositionDisplayName(title: string | null | undefined): string {
    if (!title) return 'Не вказано';
    if (title === 'Unemployed') return 'Без Посади';
    return title;
  }
}
