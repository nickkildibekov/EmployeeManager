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
import { EquipmentUpdatePayload, EquipmentCreationPayload } from '../../../shared/models/payloads';
import { EquipmentService } from '../equipment.service';
import { DepartmentService } from '../../departments/department.service';
import { Department } from '../../../shared/models/department.model';
import { EmployeeService } from '../../employees/employee.service';
import { Employee } from '../../../shared/models/employee.model';
import { EquipmentModalComponent } from '../equipment-modal/equipment-modal.component';
import { formatDateDDMMYYYY } from '../../../shared/utils/display.utils';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [CommonModule, FormsModule, EquipmentModalComponent],
  templateUrl: './equipment.html',
  styleUrl: './equipment.css',
})
export class Equipment implements OnInit {
  private equipmentService = inject(EquipmentService);
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  equipment = signal<EquipmentModel | undefined>(undefined);
  departments = signal<Department[]>([]);
  categories = signal<EquipmentCategory[]>([]);
  employees = signal<Employee[]>([]);

  isAddingNewCategory = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  editedEquipment = signal<
    EquipmentUpdatePayload & { departmentName?: string; categoryName?: string; responsibleEmployeeId?: string | null }
  >({
    id: '',
    name: '',
    serialNumber: '',
    purchaseDate: '',
    status: 'Used',
    measurement: 'Unit',
    amount: 1,
    description: '',
    departmentId: null,
    categoryId: null,
    imageData: undefined,
    departmentName: '',
    categoryName: '',
    responsibleEmployeeId: null,
  });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');
  isEquipmentModalOpen = signal(false);

  isFormValid = computed(() => {
    const eq = this.editedEquipment();
    return (
      eq.name.trim().length > 0 &&
      eq.departmentId &&
      eq.categoryId &&
      eq.purchaseDate.length > 0 &&
      !!eq.status
    );
  });

  equipmentId: string | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadCategories();
    this.loadEmployees();

    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          if (!id) {
            this.error.set('Equipment Id is missing or invalid!');
            const errorMsg = 'ID обладнання відсутній або недійсний!';
            this.toastService.error(errorMsg);
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
            departmentId: eq.departmentId || null,
            categoryId: eq.categoryId,
            imageData: eq.imageData,
            departmentName: eq.departmentName,
            categoryName: eq.categoryName,
            responsibleEmployeeId: eq.responsibleEmployeeId ?? null,
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

  private loadEmployees() {
    const sub = this.employeeService.getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc').subscribe({
      next: (res) => this.employees.set(res.items),
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
      this.toastService.error('Назва категорії обов\'язкова');
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
        this.toastService.success('Категорію успішно створено');
      }
    } catch (err: any) {
      this.error.set(err.message);
      this.toastService.error(err.message);
    }
  }

  openEditModal(): void {
    // Ensure equipment is loaded before opening modal
    if (!this.equipment()) {
      this.toastService.error('Обладнання не завантажено');
      return;
    }
    this.isEquipmentModalOpen.set(true);
  }

  closeEquipmentModal(): void {
    this.isEquipmentModalOpen.set(false);
  }

  onCategoryAdded(newCategory: EquipmentCategory) {
    this.categories.update((cats) => [...cats, newCategory]);
  }

  onEquipmentSave(equipmentData: EquipmentCreationPayload | EquipmentUpdatePayload) {
    if ('id' in equipmentData) {
      // Update
      this.equipmentService.updateEquipment(equipmentData as EquipmentUpdatePayload).subscribe({
        next: () => {
          this.closeEquipmentModal();
          // Reload equipment to get updated data
          if (this.equipmentId) {
            this.equipmentService.getEquipmentById(this.equipmentId).subscribe({
              next: (eq) => {
                this.equipment.set(eq);
                this.editedEquipment.set({
                  id: eq.id,
                  name: eq.name,
                  serialNumber: eq.serialNumber || '',
                  purchaseDate: eq.purchaseDate ? eq.purchaseDate.slice(0, 10) : '',
                  status: eq.status,
                  measurement: eq.measurement,
                  amount: eq.amount,
                  description: eq.description || '',
                  departmentId: eq.departmentId || null,
                  categoryId: eq.categoryId || '',
                  imageData: eq.imageData,
                  departmentName: eq.departmentName,
                  categoryName: eq.categoryName,
                  responsibleEmployeeId: eq.responsibleEmployeeId ?? null,
                });
              },
            });
          }
          this.toastService.success('Обладнання успішно оновлено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    }
  }

  async deleteEquipment(): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Ви впевнені, що хочете видалити це обладнання?'
    );
    if (!confirmed) return;

    const id = this.equipmentId;
    if (!id) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: (response: any) => {
        // Check if equipment was moved to Reserve or deleted
        // If response is null, equipment was deleted (204 NoContent)
        // If response has message, equipment was moved to Reserve (200 OK)
        if (response && response.message && response.message.includes('moved to Reserve')) {
          this.toastService.success('Обладнання переміщено до відділу Резерв');
        } else if (response === null) {
          this.toastService.success('Обладнання успішно видалено');
        } else {
          // Fallback message
          this.toastService.success('Операція виконана успішно');
        }
        // Navigate back to equipment list after deletion (same as list page)
        this.router.navigate(['/equipment']);
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

  onEditImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('Розмір зображення не повинен перевищувати 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.editedEquipment().imageData = result; // Base64-encoded image
      this.toastService.success('Зображення вибрано');
    };
    reader.onerror = () => {
      this.toastService.error('Не вдалося прочитати файл зображення');
    };
    reader.readAsDataURL(file);
  }

  clearEditImage() {
    this.editedEquipment().imageData = undefined;
  }

  getResponsibleEmployeeName(): string {
    const eq = this.equipment();
    if (!eq || !eq.responsibleEmployeeId) {
      return 'Не призначено';
    }
    const emp = this.employees().find((e) => e.id === eq.responsibleEmployeeId);
    return emp ? (emp.callSign || 'Не вказано') : 'Не відомо';
  }

  formatDateForDisplay(dateString: string | null | undefined): string {
    const formatted = formatDateDDMMYYYY(dateString);
    if (!formatted || formatted === 'Не вказано') {
      return '';
    }
    return formatted.replace(/\./g, '/');
  }

  // Open native date picker when clicking anywhere on the wrapper
  openDatePicker(input: HTMLInputElement | null): void {
    if (!input) return;
    input.focus();
    (input as any).showPicker?.();
  }

  onDateWrapperMouseDown(event: MouseEvent, input: HTMLInputElement | null): void {
    event.preventDefault();
    this.openDatePicker(input);
  }
}
