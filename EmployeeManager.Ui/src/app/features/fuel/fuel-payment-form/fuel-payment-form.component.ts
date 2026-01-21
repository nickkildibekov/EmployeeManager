import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { Equipment } from '../../../shared/models/equipment.model';
import { FuelPaymentCreate, FuelType, LatestFuelPayment } from '../../../shared/models/fuel-payment.model';
import { FuelPaymentService } from '../fuel-payment.service';
import { EquipmentService } from '../../equipment/equipment.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-fuel-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fuel-payment-form.component.html',
  styleUrl: './fuel-payment-form.component.css',
})
export class FuelPaymentFormComponent {
  private fb = inject(FormBuilder);
  private fuelPaymentService = inject(FuelPaymentService);
  private equipmentService = inject(EquipmentService);
  private toastService = inject(ToastService);

  departments = input.required<Department[]>();
  employees = input.required<Employee[]>();

  paymentSaved = output<void>();

  form: FormGroup;
  selectedOdometerImage = signal<File | null>(null);
  odometerImagePreview = signal<string | null>(null);
  isSubmitting = signal(false);
  
  // Equipment list filtered by selected department
  equipmentList = signal<Equipment[]>([]);
  isLoadingEquipment = signal(false);

  // Signal to track form values for computed calculation
  private formValues = signal({
    currentMileage: 0,
    previousMileage: 0,
    pricePerLiter: 0,
  });

  // Computed signal for total amount calculation
  totalAmount = computed(() => {
    const values = this.formValues();
    const current = values.currentMileage ?? 0;
    const previous = values.previousMileage ?? 0;
    const pricePerLiter = values.pricePerLiter ?? 0;

    const mileageDifference = current - previous; // Пробіг в кілометрах
    return mileageDifference * pricePerLiter;
  });

  constructor() {
    // Set default entry date to today
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    this.form = this.fb.group({
      departmentId: ['', Validators.required],
      responsibleEmployeeId: [null],
      equipmentId: ['', Validators.required],
      entryDate: [defaultDate, Validators.required],
      previousMileage: [null, Validators.required],
      currentMileage: [null, Validators.required],
      pricePerLiter: [0, [Validators.required, Validators.min(0.01)]],
      fuelType: [FuelType.Gasoline, Validators.required],
      totalAmount: [0, Validators.required],
    });

    // Initialize formValues with current form values
    this.updateFormValues();

    // Watch form value changes to update formValues signal and totalAmount
    this.form.valueChanges.subscribe(() => {
      this.updateFormValues();
    });

    // Update totalAmount in form when computed signal changes
    effect(() => {
      const total = this.totalAmount();
      this.form.patchValue({ totalAmount: total }, { emitEvent: false });
    });

    // Watch for department changes to load equipment
    this.form.get('departmentId')?.valueChanges.subscribe((departmentId) => {
      if (departmentId) {
        this.loadEquipmentByDepartment(departmentId);
        // Reset equipment selection when department changes
        this.form.patchValue({ equipmentId: '' });
      } else {
        this.equipmentList.set([]);
      }
    });

    // Watch for equipment changes to load latest payment
    this.form.get('equipmentId')?.valueChanges.subscribe((equipmentId) => {
      if (equipmentId) {
        this.loadLatestPayment(equipmentId);
      }
    });
  }

  private updateFormValues(): void {
    const formValue = this.form.value;
    this.formValues.set({
      currentMileage: formValue.currentMileage ?? 0,
      previousMileage: formValue.previousMileage ?? 0,
      pricePerLiter: formValue.pricePerLiter ?? 0,
    });
  }

  private loadEquipmentByDepartment(departmentId: string): void {
    this.isLoadingEquipment.set(true);
    this.equipmentService.getEquipmentByDepartment(departmentId, 1, 1000, '', null, null, null, 'name', 'asc')
      .subscribe({
        next: (response) => {
          this.equipmentList.set(response.items);
          this.isLoadingEquipment.set(false);
        },
        error: (err) => {
          console.error('Error loading equipment:', err);
          this.toastService.error('Помилка завантаження обладнання');
          this.isLoadingEquipment.set(false);
        },
      });
  }

  private loadLatestPayment(equipmentId: string): void {
    this.fuelPaymentService.getLatest(equipmentId).subscribe({
      next: (latest) => {
        if (latest.previousMileage !== null && latest.previousMileage !== undefined) {
          this.form.patchValue({
            previousMileage: latest.previousMileage,
          });
        }
        if (latest.pricePerLiter !== null && latest.pricePerLiter !== undefined) {
          this.form.patchValue({
            pricePerLiter: latest.pricePerLiter,
          });
        }
      },
      error: (err) => {
        console.error('Error loading latest payment:', err);
        // Don't show error if no previous payment exists
      },
    });
  }

  onOdometerImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedOdometerImage.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.odometerImagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  clearOdometerImage(): void {
    this.selectedOdometerImage.set(null);
    this.odometerImagePreview.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;

    // Validate: CurrentMileage should be greater than PreviousMileage
    if (formValue.currentMileage <= formValue.previousMileage) {
      this.toastService.error('Поточний пробіг не може бути меншим або рівним попередньому');
      return;
    }

    this.isSubmitting.set(true);

    const paymentData: FuelPaymentCreate = {
      departmentId: formValue.departmentId,
      responsibleEmployeeId: formValue.responsibleEmployeeId || null,
      equipmentId: formValue.equipmentId,
      entryDate: formValue.entryDate,
      previousMileage: formValue.previousMileage,
      currentMileage: formValue.currentMileage,
      pricePerLiter: formValue.pricePerLiter,
      fuelType: formValue.fuelType,
      totalAmount: this.totalAmount(),
    };

    this.fuelPaymentService.create(paymentData, this.selectedOdometerImage() || undefined).subscribe({
      next: () => {
        this.toastService.success('Дані про паливо успішно збережено');
        this.form.reset();
        this.clearOdometerImage();
        // Reset to default date
        const now = new Date();
        const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.form.patchValue({ entryDate: defaultDate });
        this.paymentSaved.emit();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error saving fuel payment:', err);
        this.toastService.error('Помилка збереження даних про паливо');
        this.isSubmitting.set(false);
      },
    });
  }

  getFuelTypeName(fuelType: FuelType): string {
    return fuelType === FuelType.Gasoline ? 'Бензин' : 'Дізель';
  }

  getMileageDifference(): number {
    const current = this.form.get('currentMileage')?.value ?? 0;
    const previous = this.form.get('previousMileage')?.value ?? 0;
    return current - previous;
  }
}
