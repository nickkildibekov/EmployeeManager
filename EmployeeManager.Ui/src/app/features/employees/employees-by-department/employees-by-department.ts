import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../employee.service';
import { DepartmentService } from '../../departments/department.service';
import { PositionService } from '../../positions/position.service';
import { EmployeeListComponent } from '../employee-list/employee-list';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';

@Component({
  selector: 'app-employees-by-department',
  standalone: true,
  imports: [CommonModule, EmployeeListComponent],
  templateUrl: './employees-by-department.html',
  styleUrls: ['./employees-by-department.css'],
})
export class EmployeesByDepartmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private positionService = inject(PositionService);

  department = signal<Department | undefined>(undefined);
  positions = signal<Position[] | undefined>(undefined);

  // pagination & search
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  search = signal('');

  isLoading = signal(false);
  error = signal('');

  // Expose Math for template
  Math = Math;

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    if (!idParam) {
      this.error.set('Invalid department id');
      return;
    }

    this.loadDepartment(idParam);
    this.loadPositions(idParam);
    this.loadEmployees(idParam);
  }

  private loadDepartment(depId: number) {
    this.departmentService.getDepartmentById(depId).subscribe({
      next: (d) => this.department.set(d),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  private loadPositions(depId: number) {
    this.positionService.getPositionsByDepartmentId(depId).subscribe({
      next: (p) => this.positions.set(p),
      error: (err: Error) => this.positions.set([]),
    });
  }

  loadEmployees(depId: number) {
    this.isLoading.set(true);
    this.employeeService
      .getEmployeesByDepartment(depId, this.page(), this.pageSize(), this.search())
      .subscribe({
        next: (res) => {
          // set a minimal department object so EmployeeListComponent can consume employees
          const dep =
            this.department() ||
            ({
              id: depId,
              name: '',
              description: '',
              positions: [],
              employees: [],
              equipments: [],
            } as Department);
          dep.employees = res.items;
          this.department.set(dep);
          this.total.set(res.total);
        },
        error: (err: Error) => this.error.set(err.message),
        complete: () => this.isLoading.set(false),
      });
  }

  onSearch(term: string) {
    this.search.set(term);
    this.page.set(1);
    const depId = this.getDepId();
    if (depId) this.loadEmployees(depId);
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    const depId = this.getDepId();
    if (depId) this.loadEmployees(depId);
  }

  private getDepId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return isNaN(id) ? null : id;
  }

  handleAdd(payload: any) {
    const depId = this.getDepId();
    if (!depId) return;
    const createPayload = { ...payload, departmentId: depId };
    this.employeeService.addEmployee(createPayload).subscribe({
      next: () => this.loadEmployees(depId),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  handleDelete(employeeId: number) {
    const depId = this.getDepId();
    if (!depId) return;
    this.employeeService.deleteEmployee(employeeId).subscribe({
      next: () => this.loadEmployees(depId),
      error: (err: Error) => this.error.set(err.message),
    });
  }
}
