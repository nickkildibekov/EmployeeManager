import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { Equipment as EquipmentModel } from '../../../shared/models/equipment.model';
import { EquipmentUpdatePayload } from '../../../shared/models/payloads';
import { EquipmentService } from '../equipment.service';
import { DepartmentService } from '../../departments/department.service';
import { Department } from '../../../shared/models/department.model';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment.html',
  styleUrl: './equipment.css',
})
export class Equipment implements OnInit {
  private equipmentService = inject(EquipmentService);
  private departmentService = inject(DepartmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  equipment = signal<EquipmentModel | undefined>(undefined);
  departments = signal<Department[]>([]);

  editedEquipment = signal<EquipmentUpdatePayload & { departmentName?: string; categoryName?: string }>(
    {
      id: 0,
      name: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      isWork: true,
      description: '',
      departmentId: 0,
      categoryId: 0,
      departmentName: '',
      categoryName: '',
    }
  );

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  equipmentId: number | undefined;

  ngOnInit(): void {
    this.loadDepartments();

    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
            this.error.set('Equipment Id is missing or invalid!');
            this.isFetching.set(false);
            return [];
          }

          this.equipmentId = id;
          this.isFetching.set(true);
          return this.equipmentService.getEquipmentById(id);
        })
      )
      .subscribe({
        next: (eq) => {
          this.equipment.set(eq);
          this.editedEquipment.set({
            id: eq.id,
            name: eq.name,
            serialNumber: eq.serialNumber,
            purchaseDate: new Date(eq.purchaseDate).toISOString().split('T')[0],
            isWork: eq.isWork,
            description: eq.description,
            departmentId: eq.departmentId,
            categoryId: eq.categoryId,
            departmentName: eq.departmentName,
            categoryName: eq.categoryName,
          });
          this.isFetching.set(false);
        },
        error: (error: Error) => {
          this.error.set(error.message);
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
      error: (err: Error) => this.error.set(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.equipment()) {
      const current = this.equipment()!;
      this.editedEquipment.set({
        id: current.id,
        name: current.name,
        serialNumber: current.serialNumber,
        purchaseDate: new Date(current.purchaseDate).toISOString().split('T')[0],
        isWork: current.isWork,
        description: current.description,
        departmentId: current.departmentId,
        categoryId: current.categoryId,
        departmentName: current.departmentName,
        categoryName: current.categoryName,
      });
    }
  }

  saveEquipment(): void {
    const eq = this.editedEquipment();
    if (!eq.name.trim()) {
      alert('Please fill all required fields.');
      return;
    }

    this.isSaving.set(true);

    const payload: EquipmentUpdatePayload = {
      id: eq.id,
      name: eq.name,
      serialNumber: eq.serialNumber,
      purchaseDate: eq.purchaseDate,
      isWork: eq.isWork,
      description: eq.description,
      categoryId: eq.categoryId,
      departmentId: eq.departmentId,
    };

    this.equipmentService.updateEquipment(payload).subscribe({
      next: (updatedEq) => {
        const merged = updatedEq || ({
          ...payload,
          departmentName: eq.departmentName,
          categoryName: eq.categoryName,
        } as unknown as EquipmentModel);
        this.equipment.set(merged);
        this.isEditMode.set(false);
        this.isSaving.set(false);
      },
      error: (err: Error) => {
        console.error('Error updating equipment:', err);
        this.error.set(err.message);
        this.isSaving.set(false);
      },
    });
  }

  deleteEquipment(): void {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    const id = this.equipmentId;
    if (!id) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: () => {
        this.router.navigate(['/equipment']);
      },
      error: (err: Error) => {
        console.error('Error deleting equipment:', err);
        this.error.set(err.message);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/equipment']);
  }
}
