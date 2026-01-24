import { Component, DestroyRef, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Department } from '../../../shared/models/department.model';
import { PaymentType, UtilityPayment, UtilityPaymentListResponse } from '../../../shared/models/utility-payment.model';
import { UtilityPaymentService } from '../utility-payment.service';
import { DepartmentService } from '../../departments/department.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-utility-payment-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utility-payment-archive.component.html',
  styleUrl: './utility-payment-archive.component.css',
})
export class UtilityPaymentArchiveComponent implements OnInit {
  private utilityPaymentService = inject(UtilityPaymentService);
  private departmentService = inject(DepartmentService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<string | null>(null);
  // Payment type is controlled by parent page (Комуналка service tabs)
  paymentType = input<PaymentType | null>(null);
  
  payments = signal<UtilityPayment[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  isLoading = signal<boolean>(false);

  private isInitialized = false;

  constructor() {
    // Reload payments when filters change (after initialization)
    effect(() => {
      if (!this.isInitialized) return;
      
      const departmentId = this.selectedDepartmentId();
      const paymentType = this.paymentType();
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
    
    this.utilityPaymentService
      .getAll(
        this.selectedDepartmentId(),
        this.paymentType(),
        this.currentPage(),
        this.pageSize()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: UtilityPaymentListResponse) => {
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

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  formatMonth(monthString: string): string {
    const date = new Date(monthString);
    return date.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  getPaymentTypeName(paymentType: PaymentType): string {
    switch (paymentType) {
      case PaymentType.Electricity:
        return 'Електроенергія';
      case PaymentType.Gas:
        return 'Газ';
      case PaymentType.Water:
        return 'Вода';
      case PaymentType.Rent:
        return 'Оренда';
      default:
        return 'Невідомо';
    }
  }

  getCurrentPaymentTypeLabel(): string {
    const type = this.paymentType();
    if (type === null || type === undefined) return '';
    return this.getPaymentTypeName(type);
  }
}
