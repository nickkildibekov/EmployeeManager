import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { Equipment as EquipmentModel } from '../../../shared/models/equipment.model';
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

  editedEquipment = signal<EquipmentModel>({
    id: 0,
    name: '',
    serialNumber: '',
    purchaseDate: '',
    isWork: true,
    description: '',
    departmentId: 0,
    category: '',
    categoryId: 0,
  });

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
          this.editedEquipment.set(eq);
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
      this.editedEquipment.set(this.equipment()!);
    }
  }

  saveEquipment(): void {
    const eq = this.editedEquipment();
    if (!eq.name.trim()) {
      alert('Please fill all required fields.');
      return;
    }

    this.isSaving.set(true);

    this.equipmentService.updateEquipment(eq).subscribe({
      next: (updatedEq) => {
        this.equipment.set(updatedEq);
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
