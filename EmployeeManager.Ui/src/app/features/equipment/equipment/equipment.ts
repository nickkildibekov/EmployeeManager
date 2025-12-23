import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
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
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  equipment = signal<EquipmentModel | undefined>(undefined);
  departments = signal<Department[]>([]);

  editedEquipment = signal<
    EquipmentUpdatePayload & { departmentName?: string; categoryName?: string }
  >({
    id: 0,
    name: '',
    serialNumber: '',
    purchaseDate: '',
    isWork: true,
    description: '',
    departmentId: null,
    categoryId: 0,
    departmentName: '',
    categoryName: '',
  });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  isFormValid = computed(() => {
    const eq = this.editedEquipment();
    return (
      eq.name.trim().length > 0 &&
      eq.serialNumber.trim().length > 0 &&
      (eq.departmentId ?? 0) > 0 &&
      eq.categoryId > 0 &&
      eq.purchaseDate.length > 0
    );
  });

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
            this.toastService.error('Equipment Id is missing or invalid!');
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
            purchaseDate: (eq.purchaseDate || '').slice(0, 10),
            isWork: eq.isWork,
            description: eq.description,
            departmentId: eq.departmentId && eq.departmentId > 0 ? eq.departmentId : null,
            categoryId: eq.categoryId,
            departmentName: eq.departmentName,
            categoryName: eq.categoryName,
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

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.equipment()) {
      const current = this.equipment()!;
      this.editedEquipment.set({
        id: current.id,
        name: current.name,
        serialNumber: current.serialNumber,
        purchaseDate: (current.purchaseDate || '').slice(0, 10),
        isWork: current.isWork,
        description: current.description,
        departmentId: current.departmentId && current.departmentId > 0 ? current.departmentId : null,
        categoryId: current.categoryId,
        departmentName: current.departmentName,
        categoryName: current.categoryName,
      });
    }
  }

  saveEquipment(): void {
    const eq = this.editedEquipment();
    if (!this.isFormValid()) {
      this.error.set(
        'Please fill all required fields (name, serial, category, department, purchase date).'
      );
      this.toastService.error(
        'Please fill all required fields (name, serial, category, department, purchase date).'
      );
      return;
    }

    this.isSaving.set(true);
    this.error.set('');

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
        const merged =
          updatedEq ||
          ({
            ...payload,
            departmentName: eq.departmentName,
            categoryName: eq.categoryName,
          } as unknown as EquipmentModel);
        this.equipment.set(merged);
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.toastService.success('Equipment updated successfully');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.isSaving.set(false);
      },
    });
  }

  async deleteEquipment(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Equipment',
      message: 'Are you sure you want to delete this equipment? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    const id = this.equipmentId;
    if (!id) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: () => {
        this.navigationService.afterDelete('equipment');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  goBack(): void {
    this.navigationService.goBack('/equipment');
  }
}
