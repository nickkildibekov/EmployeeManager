import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Equipment as EquipmentModel } from '../../../shared/models/equipment.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';
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
  categories = signal<EquipmentCategory[]>([]);

  isAddingNewCategory = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  editedEquipment = signal<
    EquipmentUpdatePayload & { departmentName?: string; categoryName?: string }
  >({
    id: 0,
    name: '',
    serialNumber: '',
    purchaseDate: '',
    status: 'Used',
    measurement: 'Unit',
    amount: 1,
    description: '',
    departmentId: null,
    categoryId: null,
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
      (eq.departmentId ?? 0) > 0 &&
      (eq.categoryId ?? 0) > 0 &&
      eq.purchaseDate.length > 0 &&
      !!eq.status
    );
  });

  equipmentId: number | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadCategories();

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
            status: eq.status,
            measurement: eq.measurement,
            amount: eq.amount,
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

  private loadCategories() {
    const sub = this.equipmentService.getAllCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  toggleAddNewCategory() {
    this.isAddingNewCategory.update((val) => !val);
    if (this.isAddingNewCategory()) {
      this.editedEquipment().categoryId = null;
    }
    this.newCategoryName.set('');
    this.newCategoryDescription.set('');
  }

  async createAndSelectCategory() {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.toastService.error('Category name is required');
      return;
    }

    try {
      const newCategory = await this.equipmentService
        .createCategory(name, this.newCategoryDescription())
        .toPromise();

      if (newCategory) {
        this.categories.update((cats) => [...cats, newCategory]);
        this.editedEquipment().categoryId = newCategory.id;
        this.isAddingNewCategory.set(false);
        this.newCategoryName.set('');
        this.newCategoryDescription.set('');
        this.toastService.success('Category created successfully');
      }
    } catch (err: any) {
      this.error.set(err.message);
      this.toastService.error(err.message);
    }
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
        status: current.status,
        measurement: current.measurement,
        amount: current.amount,
        description: current.description,
        departmentId:
          current.departmentId && current.departmentId > 0 ? current.departmentId : null,
        categoryId: current.categoryId && current.categoryId > 0 ? current.categoryId : null,
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
      status: eq.status,
      measurement: eq.measurement,
      amount: eq.amount,
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
    this.navigationService.goBackToList('equipment');
  }

  onEditMeasurementChange(measurement: 'Unit' | 'Meter' | 'Liter') {
    const current = Number(this.editedEquipment().amount || 1);
    if (measurement === 'Unit') {
      this.editedEquipment().amount = Math.max(1, Math.floor(current));
    } else {
      this.editedEquipment().amount = Math.max(0.01, Math.round(current * 100) / 100);
    }
  }

  onEditAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = Number(input.value);
    if (!isFinite(val)) {
      val = this.editedEquipment().measurement === 'Unit' ? 1 : 0.01;
    }
    if (this.editedEquipment().measurement === 'Unit') {
      val = Math.max(1, Math.floor(val));
    } else {
      val = Math.max(0.01, Math.round(val * 100) / 100);
    }
    this.editedEquipment().amount = val;
  }
}
