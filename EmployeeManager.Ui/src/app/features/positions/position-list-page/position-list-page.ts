import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PositionService } from '../position.service';
import { DepartmentService } from '../../departments/department.service';
import { Position } from '../../../shared/models/position.model';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { PositionCreationPayload } from '../../../shared/models/payloads';

@Component({
  selector: 'app-position-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './position-list-page.html',
  styleUrls: ['./position-list-page.css'],
})
export class PositionListPageComponent implements OnInit {
  private positionService = inject(PositionService);
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  positions = signal<Position[]>([]);
  departments = signal<Department[]>([]);

  selectedDepartmentId = signal<number | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);

  newPosition = signal<PositionCreationPayload>({
    title: '',
    departmentId: null,
  });

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => this.error.set(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  loadPositions() {
    this.isLoading.set(true);
    const sub = this.positionService
      .getPositionsByDepartmentIdWithPagination(
        this.selectedDepartmentId() ?? 0,
        this.page(),
        this.pageSize(),
        this.searchTerm()
      )
      .subscribe({
        next: (res) => {
          this.positions.set(res.items);
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
    this.loadPositions();
  }

  onDepartmentChange(depId: string) {
    const id = depId ? parseInt(depId, 10) : null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadPositions();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadPositions();
  }

  toggleAddForm() {
    this.isAddFormVisible.update((v) => !v);
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  resetForm() {
    this.newPosition.set({
      title: '',
      departmentId: null,
    });
  }

  isFormValid(): boolean {
    const pos = this.newPosition();
    return !!(pos.title.trim() && pos.departmentId !== null);
  }

  addPosition() {
    if (!this.isFormValid()) return;

    const pos = this.newPosition();
    this.positionService.addPosition(pos).subscribe({
      next: () => {
        this.resetForm();
        this.isAddFormVisible.set(false);
        this.page.set(1);
        this.loadPositions();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  deletePosition(id: number) {
    if (!confirm('Are you sure?')) return;

    this.positionService.deletePosition(id).subscribe({
      next: () => this.loadPositions(),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  getDepartmentName(depId: number | null): string {
    if (!depId) return 'N/A';
    const dep = this.departments().find((d) => d.id === depId);
    return dep ? dep.name : 'Unknown';
  }

  openPosition(id: number) {
    this.router.navigate(['/positions', id]);
  }

  getEmployeeCount(posId: number): number {
    const dept = this.departments().find(d => d.id === this.selectedDepartmentId());
    if (!dept || !dept.employees) return 0;
    return dept.employees.filter(e => e.positionId === posId).length;
  }
}
