import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { PaymentType, UtilityPaymentCreate, PreviousMonthPayment } from '../../../shared/models/utility-payment.model';
import { UtilityPaymentService } from '../utility-payment.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-utility-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './utility-payment-form.component.html',
  styleUrl: './utility-payment-form.component.css',
})
export class UtilityPaymentFormComponent {
  private fb = inject(FormBuilder);
  private utilityPaymentService = inject(UtilityPaymentService);
  private toastService = inject(ToastService);

  departments = input.required<Department[]>();
  employees = input.required<Employee[]>();
  paymentType = input.required<PaymentType>();

  paymentSaved = output<void>();

  form: FormGroup;
  isTwoZoneMeter = signal(false);
  selectedBillImage = signal<File | null>(null);
  billImagePreview = signal<string | null>(null);
  isSubmitting = signal(false);
  
  // Previous month payments
  previousMonthPayments = signal<PreviousMonthPayment[]>([]);
  selectedPreviousPaymentId = signal<string | null>(null);
  
  // Track previous payment type to detect changes
  private previousPaymentType = signal<PaymentType | null>(null);

  // Signal to track form values for computed calculation
  private formValues = signal({
    currentValue: 0,
    previousValue: 0,
    currentValueNight: 0,
    previousValueNight: 0,
    pricePerUnit: 0,
    pricePerUnitNight: 0,
  });

  // Computed signal for total amount calculation
  totalAmount = computed(() => {
    const values = this.formValues();
    const current = values.currentValue ?? 0;
    const previous = values.previousValue ?? 0;
    const currentNight = values.currentValueNight ?? 0;
    const previousNight = values.previousValueNight ?? 0;
    const pricePerUnit = values.pricePerUnit ?? 0;
    const pricePerUnitNight = values.pricePerUnitNight ?? 0;

    if (this.isTwoZoneMeter() && this.paymentType() === PaymentType.Electricity) {
      const dayConsumption = current - previous;
      const nightConsumption = currentNight - previousNight;
      const dayAmount = dayConsumption * pricePerUnit;
      const nightAmount = nightConsumption * (pricePerUnitNight || pricePerUnit);
      return dayAmount + nightAmount;
    } else {
      const consumption = current - previous;
      return consumption * pricePerUnit;
    }
  });

  constructor() {
    // Set default payment month to current month (YYYY-MM format)
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    this.form = this.fb.group({
      departmentId: ['', Validators.required],
      responsibleEmployeeId: [null],
      paymentMonth: [defaultMonth, Validators.required],
      previousPaymentId: [null], // For selecting which previous payment to use
      previousValue: [null],
      currentValue: [null, Validators.required],
      previousValueNight: [null],
      currentValueNight: [null],
      pricePerUnit: [0, [Validators.required, Validators.min(0.01)]],
      pricePerUnitNight: [0],
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

    // Watch for department and payment month changes to load previous month payments
    // Subscribe to valueChanges instead of using effect() since form values are not signals
    this.form.get('departmentId')?.valueChanges.subscribe(() => {
      this.checkAndLoadPreviousPayments();
    });

    this.form.get('paymentMonth')?.valueChanges.subscribe(() => {
      this.checkAndLoadPreviousPayments();
    });

    // Watch for paymentType changes (it's an input signal)
    effect(() => {
      const paymentType = this.paymentType();
      const previousType = this.previousPaymentType();
      
      // If payment type changed (not initial load), reset the form
      if (previousType !== null && previousType !== paymentType) {
        this.resetForm();
      }
      
      // Update previous payment type
      this.previousPaymentType.set(paymentType);
      
      if (paymentType !== undefined && paymentType !== null) {
        this.checkAndLoadPreviousPayments();
      }
    });

    // Also check on initial load if values are already set
    setTimeout(() => {
      this.checkAndLoadPreviousPayments();
    }, 0);
    
    // Watch for selected previous payment change
    effect(() => {
      const selectedId = this.selectedPreviousPaymentId();
      if (selectedId) {
        this.applySelectedPreviousPayment(selectedId);
      }
    });
  }

  private updateFormValues(): void {
    const formValue = this.form.value;
    this.formValues.set({
      currentValue: formValue.currentValue ?? 0,
      previousValue: formValue.previousValue ?? 0,
      currentValueNight: formValue.currentValueNight ?? 0,
      previousValueNight: formValue.previousValueNight ?? 0,
      pricePerUnit: formValue.pricePerUnit ?? 0,
      pricePerUnitNight: formValue.pricePerUnitNight ?? 0,
    });
  }

  private checkAndLoadPreviousPayments(): void {
    const departmentId = this.form.get('departmentId')?.value;
    const paymentMonth = this.form.get('paymentMonth')?.value;
    const paymentType = this.paymentType();
    
    if (departmentId && paymentMonth && paymentType) {
      this.loadPreviousMonthPayments(departmentId, paymentType, paymentMonth);
    } else {
      // Clear previous payments if required fields are missing
      this.previousMonthPayments.set([]);
      this.selectedPreviousPaymentId.set(null);
      this.form.patchValue({ previousPaymentId: null }, { emitEvent: false });
    }
  }

  private async loadPreviousMonthPayments(departmentId: string, paymentType: PaymentType, paymentMonth: string): Promise<void> {
    try {
      console.log('Loading previous month payments:', { departmentId, paymentType, paymentMonth });
      const payments = await this.utilityPaymentService.getLatest(departmentId, paymentType, paymentMonth).toPromise();
      console.log('Received payments:', payments);
      
      if (payments && payments.length > 0) {
        this.previousMonthPayments.set(payments);
        
        // Auto-select the first (most recent) payment if none selected
        if (!this.selectedPreviousPaymentId() && payments.length > 0) {
          const firstPaymentId = payments[0].id;
          this.selectedPreviousPaymentId.set(firstPaymentId);
          this.form.patchValue({ previousPaymentId: firstPaymentId }, { emitEvent: false });
          // Apply the selected payment immediately after setting it
          this.applySelectedPreviousPayment(firstPaymentId);
        }
      } else {
        console.log('No previous payments found for:', { departmentId, paymentType, paymentMonth });
        this.previousMonthPayments.set([]);
        this.selectedPreviousPaymentId.set(null);
        this.form.patchValue({ previousPaymentId: null }, { emitEvent: false });
      }
    } catch (error) {
      // Log error for debugging
      console.error('Error loading previous month payments:', error);
      this.previousMonthPayments.set([]);
      this.selectedPreviousPaymentId.set(null);
    }
  }

  private applySelectedPreviousPayment(paymentId: string): void {
    const payment = this.previousMonthPayments().find(p => p.id === paymentId);
    if (!payment) return;

    // Always update fields when user selects a different payment record
    const updates: any = {
      previousValue: payment.currentValue ?? null, // Use currentValue from previous month as previousValue
      previousValueNight: payment.currentValueNight ?? null,
      pricePerUnit: payment.pricePerUnit ?? 0,
      pricePerUnitNight: payment.pricePerUnitNight ?? 0,
    };

    this.form.patchValue(updates, { emitEvent: false });
    // Manually update formValues after patchValue with emitEvent: false
    this.updateFormValues();
  }

  onPreviousPaymentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedPreviousPaymentId.set(value || null);
    this.form.patchValue({ previousPaymentId: value || null }, { emitEvent: false });
    if (value) {
      // Apply immediately when user manually selects a payment
      this.applySelectedPreviousPayment(value);
    } else {
      // Clear fields if user deselects
      this.form.patchValue({
        previousValue: null,
        previousValueNight: null,
        pricePerUnit: 0,
        pricePerUnitNight: 0
      }, { emitEvent: false });
      this.updateFormValues();
    }
  }

  onTwoZoneMeterChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.isTwoZoneMeter.set(checked);
    
    if (checked) {
      this.form.get('previousValueNight')?.setValidators([Validators.required]);
      this.form.get('currentValueNight')?.setValidators([Validators.required]);
      this.form.get('pricePerUnitNight')?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      this.form.get('previousValueNight')?.clearValidators();
      this.form.get('currentValueNight')?.clearValidators();
      this.form.get('pricePerUnitNight')?.clearValidators();
      this.form.patchValue({
        previousValueNight: null,
        currentValueNight: null,
        pricePerUnitNight: 0,
      });
    }
    this.form.get('previousValueNight')?.updateValueAndValidity();
    this.form.get('currentValueNight')?.updateValueAndValidity();
    this.form.get('pricePerUnitNight')?.updateValueAndValidity();
  }

  onBillImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      this.selectedBillImage.set(null);
      this.billImagePreview.set(null);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toastService.error('Розмір файлу не повинен перевищувати 10 МБ');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Файл повинен бути зображенням');
      return;
    }

    this.selectedBillImage.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.billImagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  clearBillImage(): void {
    this.selectedBillImage.set(null);
    this.billImagePreview.set(null);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  private resetForm(): void {
    // Set default payment month to current month (YYYY-MM format)
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Clear validators for night fields before reset
    this.form.get('previousValueNight')?.clearValidators();
    this.form.get('currentValueNight')?.clearValidators();
    this.form.get('pricePerUnitNight')?.clearValidators();
    
    this.form.reset({
      departmentId: '',
      responsibleEmployeeId: null,
      paymentMonth: defaultMonth,
      previousPaymentId: null,
      previousValue: null,
      currentValue: null,
      previousValueNight: null,
      currentValueNight: null,
      pricePerUnit: 0,
      pricePerUnitNight: 0,
      totalAmount: 0,
    });
    
    // Update validators after reset
    this.form.get('previousValueNight')?.updateValueAndValidity();
    this.form.get('currentValueNight')?.updateValueAndValidity();
    this.form.get('pricePerUnitNight')?.updateValueAndValidity();
    
    this.selectedBillImage.set(null);
    this.billImagePreview.set(null);
    this.isTwoZoneMeter.set(false);
    this.selectedPreviousPaymentId.set(null);
    this.previousMonthPayments.set([]);
    
    // Clear file input
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    
    // Update formValues after reset
    this.updateFormValues();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    // Validate current value >= previous value
    const current = this.form.get('currentValue')?.value;
    const previous = this.form.get('previousValue')?.value;
    
    if (previous !== null && current !== null && current < previous) {
      this.toastService.error('Поточні не можуть бути меншими за попередні');
      return;
    }

    // Validate night values if two-zone meter
    if (this.isTwoZoneMeter() && this.paymentType() === PaymentType.Electricity) {
      const currentNight = this.form.get('currentValueNight')?.value;
      const previousNight = this.form.get('previousValueNight')?.value;
      
      if (previousNight !== null && currentNight !== null && currentNight < previousNight) {
        this.toastService.error('Поточні (ніч) не можуть бути меншими за попередні (ніч)');
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      const formValue = this.form.value;
      const paymentData: UtilityPaymentCreate = {
        departmentId: formValue.departmentId,
        responsibleEmployeeId: formValue.responsibleEmployeeId || null,
        paymentType: this.paymentType(),
        previousValue: formValue.previousValue ?? null,
        currentValue: formValue.currentValue ?? null,
        previousValueNight: this.isTwoZoneMeter() ? (formValue.previousValueNight ?? null) : null,
        currentValueNight: this.isTwoZoneMeter() ? (formValue.currentValueNight ?? null) : null,
        pricePerUnit: formValue.pricePerUnit,
        pricePerUnitNight: this.isTwoZoneMeter() ? (formValue.pricePerUnitNight ?? null) : null,
        totalAmount: this.totalAmount(),
        paymentMonth: formValue.paymentMonth,
      };

      await this.utilityPaymentService.create(paymentData, this.selectedBillImage() ?? undefined).toPromise();
      
      this.toastService.success('Платіж успішно збережено');
      this.resetForm();
      this.paymentSaved.emit();
    } catch (error: any) {
      // Handle different error types
      let errorMessage = 'Помилка при збереженні платежу';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getPaymentTypeName(): string {
    const typeNames: Record<PaymentType, string> = {
      [PaymentType.Electricity]: 'Електроенергія',
      [PaymentType.Gas]: 'Газ',
      [PaymentType.Water]: 'Вода',
      [PaymentType.Rent]: 'Оренда',
    };
    return typeNames[this.paymentType()] || 'Невідомо';
  }

  getPriceUnitName(): string {
    const type = this.paymentType();
    switch (type) {
      case PaymentType.Electricity:
        return 'Ціна за КілоВат';
      case PaymentType.Gas:
      case PaymentType.Water:
        return 'Ціна за КубоМетр';
      case PaymentType.Rent:
        return 'Ціна';
      default:
        return 'Ціна за одиницю';
    }
  }
}
