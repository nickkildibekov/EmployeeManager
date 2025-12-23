import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { Employee } from '../../../shared/models/employee.model';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
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
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  employees = signal<Employee[]>([]);
  departments = signal<Department[]>([]);
  positions = signal<Position[]>([]);

  selectedDepartmentId = signal<number | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);

  newEmployee = signal<NewEmployeeData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: null,
  });

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
    this.loadEmployees();
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => this.error.set(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadPositions() {
    const sub = this.positionService.getAllPositions().subscribe({
      next: (pos) => this.positions.set(pos),
      error: (err: Error) => this.error.set(err.message),
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
        this.searchTerm()
      )
      .subscribe({
        next: (res) => {
          this.employees.set(res.items);
          this.total.set(res.total);
        },
        error: (err: Error) => this.error.set(err.message),
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
    this.newEmployee.set({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      positionId: null,
      departmentId: null,
    });
  }

  isFormValid(): boolean {
    const emp = this.newEmployee();
    return !!(
      emp.firstName.trim() &&
      emp.lastName.trim() &&
      emp.phoneNumber.trim() &&
      emp.positionId !== null &&
      emp.departmentId !== null
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
        this.loadEmployees();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  deleteEmployee(id: number) {
    if (!confirm('Are you sure?')) return;

    this.employeeService.deleteEmployee(id).subscribe({
      next: () => this.loadEmployees(),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  openEmployee(id: number) {
    this.router.navigate(['/employees', id]);
  }
}
