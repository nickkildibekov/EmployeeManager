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
import { NewEmployeeData } from '../../../shared/models/payloads';

@Component({
  selector: 'app-employee-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  private dialogService = inject(DialogService);

  employees = signal<Employee[]>([]);
  departments = signal<Department[]>([]);
  positions = signal<Position[]>([]);
  specializations = signal<Specialization[]>([]);
  // Positions available for the add form, filtered by selected department
  formPositions = signal<Position[]>([]);

  selectedDepartmentId = signal<number | null>(null);
  selectedPositionId = signal<number | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  sortBy = signal<'firstName' | 'lastName' | 'phoneNumber' | 'department' | 'position' | ''>('');
  sortOrder = signal<'asc' | 'desc'>('asc');

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);

  newEmployee = signal<NewEmployeeData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: null,
    specializationId: 0,
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
        if (specs.length > 0 && this.newEmployee().specializationId === 0) {
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

  private loadPositionsForDepartment(depId: number) {
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
        this.selectedDepartmentId() ?? 0,
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
    const id = depId ? parseInt(depId, 10) : null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadEmployees();
  }

  onPositionChange(posId: string) {
    const id = posId ? parseInt(posId, 10) : null;
    this.selectedPositionId.set(id);
    this.page.set(1);
    this.loadEmployees();
  }

  toggleSort(column: 'firstName' | 'lastName' | 'phoneNumber' | 'department' | 'position') {
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

  toggleAddForm() {
    this.isAddFormVisible.update((v) => !v);
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  resetForm() {
    const defaultSpecId = this.specializations().length > 0 ? this.specializations()[0].id : 0;
    this.newEmployee.set({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      positionId: null,
      departmentId: null,
      specializationId: defaultSpecId,
    });
    this.formPositions.set([]);
  }

  isFormValid(): boolean {
    const emp = this.newEmployee();
    return !!(
      emp.firstName.trim() &&
      emp.lastName.trim() &&
      emp.phoneNumber.trim() &&
      emp.specializationId > 0
    );
  }

  addEmployee() {
    if (!this.isFormValid()) return;

    const emp = this.newEmployee();
    this.employeeService.addEmployee(emp).subscribe({
      next: () => {
        this.resetForm();
        this.isAddFormVisible.set(false);
        this.page.set(1);
        this.selectedDepartmentId.set(null);
        this.selectedPositionId.set(null);
        this.loadEmployees();
        this.toastService.success('Співробітника успішно створено');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  // Add form: when user selects the department, populate positions and enable the dropdown
  onNewDepartmentChange(value: string) {
    const id = value ? parseInt(value, 10) : null;
    const current = this.newEmployee();
    // Update department and clear previously selected position
    this.newEmployee.set({
      ...current,
      departmentId: id,
      positionId: null,
    });
    if (id) {
      this.loadPositionsForDepartment(id);
    } else {
      this.formPositions.set([]);
    }
  }

  async deleteEmployee(id: number): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Ви впевнені, що хочете видалити цього співробітника?'
    );
    if (!confirmed) return;

    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.loadEmployees();
        this.toastService.success('Співробітника успішно видалено');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  openEmployee(id: number) {
    this.router.navigate(['/employees', id]);
  }
}
