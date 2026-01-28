import { Component, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Department } from '../../../shared/models/department.model';
import { FuelType } from '../../../shared/models/fuel-payment.model';
import { FuelStockEntry } from '../../../shared/models/fuel-stock-entry.model';
import { DepartmentService } from '../../departments/department.service';
import { FuelStockService } from '../fuel-stock.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-fuel-stock-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fuel-stock-archive.component.html',
  styleUrl: './fuel-stock-archive.component.css',
})
export class FuelStockArchiveComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private fuelStockService = inject(FuelStockService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<string | null>(null);
  selectedFuelType = signal<FuelType | null>(null);

  entries = signal<FuelStockEntry[]>([]);
  isLoading = signal<boolean>(false);

  fuelTypes = [
    { value: FuelType.Gasoline, label: 'Бензин' },
    { value: FuelType.Diesel, label: 'Дізель' },
  ];

  private isInitialized = false;

  constructor() {
    // Reload entries when filters change (after initialization)
    effect(() => {
      if (!this.isInitialized) return;
      const departmentId = this.selectedDepartmentId();
      const fuelType = this.selectedFuelType();
      untracked(() => this.loadEntries());
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.isInitialized = true;
    this.loadEntries();
  }

  private loadDepartments(): void {
    this.departmentService
      .getAllDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (depts) => this.departments.set(depts),
        error: (err) => {
          console.error('Error loading departments:', err);
          this.toastService.error('Помилка завантаження відділів');
        },
      });
  }

  private loadEntries(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    this.fuelStockService
      .getAll(this.selectedDepartmentId(), this.selectedFuelType())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.entries.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading fuel stock entries:', err);
          this.toastService.error('Помилка завантаження надходжень палива');
          this.isLoading.set(false);
        },
      });
  }

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDepartmentId.set(value || null);
  }

  onFuelTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedFuelType.set(value ? +value : null);
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
}

