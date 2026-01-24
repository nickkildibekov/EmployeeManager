import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';
import { Employee } from '../../../shared/models/employee.model';
import { Equipment } from '../../../shared/models/equipment.model';
import { EquipmentCreationPayload, EquipmentUpdatePayload } from '../../../shared/models/payloads';
import { getDepartmentDisplayName, formatDateDDMMYYYY } from '../../../shared/utils/display.utils';
import { EquipmentService } from '../equipment.service';
import { ToastService } from '../../../shared/services/toast.service';
import { EquipmentCategoryModalComponent } from '../equipment-category-modal/equipment-category-modal.component';

@Component({
  selector: 'app-equipment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, EquipmentCategoryModalComponent],
  templateUrl: './equipment-modal.component.html',
  styleUrl: './equipment-modal.component.css',
})
export class EquipmentModalComponent implements OnChanges {
  @Input() isOpen = signal(false);
  @Input() equipment: Equipment | null = null;
  @Input() departments: Department[] = [];
  @Input() categories: EquipmentCategory[] = [];
  @Input() employees: Employee[] = [];
  
  @Output() save = new EventEmitter<EquipmentCreationPayload | EquipmentUpdatePayload>();
  @Output() close = new EventEmitter<void>();
  @Output() categoryAdded = new EventEmitter<EquipmentCategory>();

  private equipmentService = inject(EquipmentService);
  private toastService = inject(ToastService);

  isCategoryModalOpen = signal(false);

  editedEquipment = signal<EquipmentCreationPayload | EquipmentUpdatePayload>({
    name: '',
    serialNumber: '',
    purchaseDate: '',
    status: 'Used',
    measurement: 'Unit',
    amount: 1,
    description: '',
    categoryId: '',
    departmentId: null,
    responsibleEmployeeId: null,
  });

  isEditMode = signal(false);
  selectedImageFile: File | null = null;
  imagePreview = signal<string | null>(null);

  constructor() {
    // Watch for modal opening and equipment changes
    effect(() => {
      const isOpen = this.isOpen();
      const equipment = this.equipment;
      
      // When modal opens, update form based on equipment
      if (isOpen) {
        // Use setTimeout to ensure equipment is set after modal opens
        setTimeout(() => {
          this.updateFormFromEquipment();
        }, 0);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only process when modal is open
    if (!this.isOpen()) {
      return;
    }

    // Check if equipment input changed or modal just opened
    const equipmentChanged = changes['equipment'] && (changes['equipment'].previousValue !== changes['equipment'].currentValue);
    const isOpenChanged = changes['isOpen'] && changes['isOpen'].currentValue === true && !changes['isOpen'].previousValue;
    
    // When modal opens, always check equipment to determine edit/add mode
    if (equipmentChanged || isOpenChanged) {
      this.updateFormFromEquipment();
    }
  }

  private updateFormFromEquipment(): void {
    const hasEquipment = this.equipment !== null && 
                        this.equipment !== undefined && 
                        this.equipment.id !== undefined && 
                        this.equipment.id !== null &&
                        this.equipment.id !== '';
    
    if (hasEquipment) {
      // Editing existing equipment
      this.isEditMode.set(true);
      this.editedEquipment.set({
        id: this.equipment.id,
        name: this.equipment.name,
        serialNumber: this.equipment.serialNumber || '',
        purchaseDate: this.equipment.purchaseDate ? this.formatDateForInput(this.equipment.purchaseDate) : '',
        status: this.equipment.status,
        measurement: this.equipment.measurement,
        amount: this.equipment.amount,
        description: this.equipment.description || '',
        categoryId: this.equipment.categoryId || '',
        departmentId: this.equipment.departmentId,
        responsibleEmployeeId: this.equipment.responsibleEmployeeId ?? null,
        imageData: this.equipment.imageData,
      });
      if (this.equipment.imageData) {
        this.imagePreview.set(this.equipment.imageData);
      } else {
        this.imagePreview.set(null);
      }
    } else {
      // Adding new equipment
      this.isEditMode.set(false);
      this.resetForm();
    }
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  // Display date in dd/MM/yyyy format for UI
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
    event.preventDefault(); // prevent native text selection
    this.openDatePicker(input);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedImageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const base64 = e.target.result as string;
          this.imagePreview.set(base64);
          this.editedEquipment.update(eq => ({ ...eq, imageData: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.selectedImageFile = null;
    this.imagePreview.set(null);
    this.editedEquipment.update(eq => ({ ...eq, imageData: undefined }));
  }

  onNameChange(value: string): void {
    this.editedEquipment.update(eq => ({ ...eq, name: value }));
  }

  onSerialNumberChange(value: string): void {
    this.editedEquipment.update(eq => ({ ...eq, serialNumber: value || undefined }));
  }

  onDescriptionChange(value: string): void {
    this.editedEquipment.update(eq => ({ ...eq, description: value }));
  }

  onPurchaseDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editedEquipment.update(eq => ({ ...eq, purchaseDate: target.value }));
  }

  onAmountChange(value: string): void {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      this.editedEquipment.update(eq => ({ ...eq, amount: numValue }));
    }
  }

  onDepartmentChange(value: string | null): void {
    this.editedEquipment.update(eq => ({ ...eq, departmentId: value }));
  }

  onCategoryChange(value: string): void {
    if (value === '-1' || value === '') {
      // Special value for "Add" option - open modal
      // Use setTimeout to reset after select closes
      setTimeout(() => {
        this.openCategoryModal();
        this.editedEquipment.update(eq => ({ ...eq, categoryId: '' }));
      }, 0);
    } else {
      this.editedEquipment.update(eq => ({ ...eq, categoryId: value || '' }));
    }
  }

  onStatusChange(status: 'Used' | 'NotUsed' | 'Broken'): void {
    this.editedEquipment.update(eq => ({ ...eq, status }));
  }

  onMeasurementChange(measurement: 'Unit' | 'Meter' | 'Liter'): void {
    this.editedEquipment.update(eq => ({ ...eq, measurement }));
  }

  onResponsibleEmployeeChange(value: string | null): void {
    this.editedEquipment.update(eq => ({ ...eq, responsibleEmployeeId: value }));
  }

  isFormValid(): boolean {
    const eq = this.editedEquipment();
    return !!(
      eq.name.trim() &&
      eq.purchaseDate &&
      eq.categoryId &&
      eq.amount > 0
    );
  }

  onSave(): void {
    if (this.isFormValid()) {
      const eq = this.editedEquipment();
      // Ensure responsibleEmployeeId is explicitly set (null or string, not undefined)
      const payload = {
        ...eq,
        responsibleEmployeeId: eq.responsibleEmployeeId ?? null,
      };
      this.save.emit(payload);
      this.resetForm();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.editedEquipment.set({
      name: '',
      serialNumber: '',
      purchaseDate: '',
      status: 'Used',
      measurement: 'Unit',
      amount: 1,
      description: '',
      categoryId: '',
      departmentId: null,
      responsibleEmployeeId: null,
    });
    this.selectedImageFile = null;
    this.imagePreview.set(null);
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getDepartmentDisplayName(name: string): string {
    return getDepartmentDisplayName(name);
  }

  openCategoryModal(): void {
    this.isCategoryModalOpen.set(true);
  }

  closeCategoryModal(): void {
    this.isCategoryModalOpen.set(false);
  }

  onCategorySave(categoryData: { name: string; description: string }): void {
    this.equipmentService.createCategory(categoryData.name, categoryData.description).subscribe({
      next: (newCategory) => {
        this.categoryAdded.emit(newCategory);
        this.editedEquipment.update(eq => ({ ...eq, categoryId: newCategory.id }));
        this.closeCategoryModal();
        this.toastService.success('Категорію успішно створено');
      },
      error: (err: Error) => {
        this.toastService.error(err.message);
      },
    });
  }
}
