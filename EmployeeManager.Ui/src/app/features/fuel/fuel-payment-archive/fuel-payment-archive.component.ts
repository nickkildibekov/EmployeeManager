import { Component, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Department } from '../../../shared/models/department.model';
import { FuelType, FuelPayment, FuelPaymentListResponse } from '../../../shared/models/fuel-payment.model';
import { FuelPaymentService } from '../fuel-payment.service';
import { DepartmentService } from '../../departments/department.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-fuel-payment-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fuel-payment-archive.component.html',
  styleUrl: './fuel-payment-archive.component.css',
})
export class FuelPaymentArchiveComponent implements OnInit {
  private fuelPaymentService = inject(FuelPaymentService);
  private departmentService = inject(DepartmentService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<string | null>(null);
  selectedFuelType = signal<FuelType | null>(null);
  
  payments = signal<FuelPayment[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  isLoading = signal<boolean>(false);

  fuelTypes = [
    { value: FuelType.Gasoline, label: 'Бензин' },
    { value: FuelType.Diesel, label: 'Дізель' },
  ];

  private isInitialized = false;

  constructor() {
    // Reload payments when filters change (after initialization)
    effect(() => {
      if (!this.isInitialized) return;
      
      const departmentId = this.selectedDepartmentId();
      const fuelType = this.selectedFuelType();
      const page = this.currentPage();
      
      // Use untracked to prevent infinite loops when calling loadPayments
      untracked(() => {
        this.loadPayments();
      });
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.isInitialized = true;
    this.loadPayments();
  }

  private loadDepartments(): void {
    this.departmentService.getAllDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (depts) => this.departments.set(depts),
        error: (err) => {
          console.error('Error loading departments:', err);
          this.toastService.error('Помилка завантаження відділів');
        },
      });
  }

  private loadPayments(): void {
    if (this.isLoading()) return;
    
    this.isLoading.set(true);
    
    this.fuelPaymentService
      .getAll(
        this.selectedDepartmentId(),
        this.selectedFuelType(),
        this.currentPage(),
        this.pageSize()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: FuelPaymentListResponse) => {
          this.payments.set(response.items);
          this.totalCount.set(response.total);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading payments:', err);
          this.toastService.error('Помилка завантаження платежів');
          this.isLoading.set(false);
        },
      });
  }

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDepartmentId.set(value || null);
    this.currentPage.set(1); // Reset to first page when filter changes
  }

  onFuelTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedFuelType.set(value ? +value : null);
    this.currentPage.set(1); // Reset to first page when filter changes
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  getFuelTypeName(fuelType: FuelType): string {
    const type = this.fuelTypes.find(t => t.value === fuelType);
    return type?.label || 'Невідомо';
  }

  getMileageDifference(previous: number, current: number): number {
    return current - previous;
  }
}
