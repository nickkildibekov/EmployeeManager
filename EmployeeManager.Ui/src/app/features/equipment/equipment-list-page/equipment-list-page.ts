import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EquipmentService } from '../equipment.service';
import { DepartmentService } from '../../departments/department.service';
import { Equipment } from '../../../shared/models/equipment.model';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCreationPayload } from '../../../shared/models/payloads';

@Component({
  selector: 'app-equipment-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment-list-page.html',
  styleUrls: ['./equipment-list-page.css'],
})
export class EquipmentListPageComponent implements OnInit {
  private equipmentService = inject(EquipmentService);
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  equipment = signal<Equipment[]>([]);
  departments = signal<Department[]>([]);

  selectedDepartmentId = signal<number | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);

  newEquipment = signal<EquipmentCreationPayload>({
    name: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    isWork: true,
    description: '',
    categoryId: 0,
    departmentId: 0,
  });

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadEquipment();
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => this.error.set(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  loadEquipment() {
    this.isLoading.set(true);
    const sub = this.equipmentService
      .getEquipmentByDepartment(
        this.selectedDepartmentId() || 0,
        this.page(),
        this.pageSize(),
        this.searchTerm()
      )
      .subscribe({
        next: (res) => {
          this.equipment.set(res.items);
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
    this.loadEquipment();
  }

  onDepartmentChange(depId: string) {
    const id = depId ? parseInt(depId, 10) : null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadEquipment();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadEquipment();
  }

  toggleAddForm() {
    this.isAddFormVisible.update((v) => !v);
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  resetForm() {
    this.newEquipment.set({
      name: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      isWork: true,
      description: '',
      categoryId: 0,
      departmentId: 0,
    });
  }

  isFormValid(): boolean {
    const eq = this.newEquipment();
    return !!(eq.name.trim() && eq.departmentId !== null);
  }

  addEquipment() {
    if (!this.isFormValid()) return;

    const eq = this.newEquipment();
    this.equipmentService.addEquipment(eq).subscribe({
      next: () => {
        this.resetForm();
        this.isAddFormVisible.set(false);
        this.page.set(1);
        this.loadEquipment();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  deleteEquipment(id: number) {
    if (!confirm('Are you sure?')) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: () => this.loadEquipment(),
      error: (err: Error) => this.error.set(err.message),
    });
  }
openEquipment(id: number) {
    this.router.navigate(['/equipment', id]);
  }

  
  getDepartmentName(depId: number | null): string {
    if (!depId) return 'N/A';
    const dep = this.departments().find((d) => d.id === depId);
    return dep ? dep.name : 'Unknown';
  }
}
