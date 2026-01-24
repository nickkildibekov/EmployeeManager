import { Component, DestroyRef, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Department } from '../../../shared/models/department.model';
import { FuelPaymentStatistics, FuelType } from '../../../shared/models/fuel-payment.model';
import { FuelPaymentService } from '../fuel-payment.service';
import { DepartmentService } from '../../departments/department.service';
import { ToastService } from '../../../shared/services/toast.service';
import { formatDateDDMMYYYY } from '../../../shared/utils/display.utils';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-fuel-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fuel-statistics.component.html',
  styleUrl: './fuel-statistics.component.css',
})
export class FuelStatisticsComponent implements OnInit, OnDestroy {
  private fuelPaymentService = inject(FuelPaymentService);
  private departmentService = inject(DepartmentService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<string | null>(null);
  startDate = signal<string>('');
  endDate = signal<string>('');
  isLoading = signal(false);

  statistics = signal<FuelPaymentStatistics | null>(null);

  expensesChart: Chart | null = null;
  dieselChart: Chart | null = null;

  private isInitialized = false;
  private isDestroyed = false;

  fuelTypes = [
    { value: FuelType.Gasoline, label: 'Бензин' },
    { value: FuelType.Diesel, label: 'Дізель' },
  ];
  selectedFuelType = signal<FuelType | null>(null);

  constructor() {
    // Set default dates (last 12 months)
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 12 months ago
    
    this.startDate.set(startDate.toISOString().split('T')[0]);
    this.endDate.set(endDate.toISOString().split('T')[0]);

    // Reload statistics when filters change (after initialization)
    effect(() => {
      if (!this.isInitialized || this.isDestroyed) return;
      
      // Track all filter changes to react to selector changes
      const start = this.startDate();
      const end = this.endDate();
      const departmentId = this.selectedDepartmentId();
      const fuelType = this.selectedFuelType();
      
      if (start && end) {
        // Use untracked to prevent infinite loops when calling loadStatistics
        untracked(() => {
          this.loadStatistics();
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.isInitialized = true;
    this.loadStatistics();
  }

  private loadDepartments(): void {
    if (this.isDestroyed) return;
    
    this.departmentService.getAllDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (depts) => {
          if (!this.isDestroyed) {
            this.departments.set(depts);
          }
        },
        error: (err) => {
          if (this.isDestroyed) return;
          
          console.error('Error loading departments:', err);
          this.toastService.error('Помилка завантаження відділів');
        },
      });
  }

  private loadStatistics(): void {
    if (this.isLoading() || this.isDestroyed) return; // Prevent multiple simultaneous requests
    
    const start = this.startDate();
    const end = this.endDate();
    
    if (!start || !end) return;
    
    this.isLoading.set(true);
    
    this.fuelPaymentService
      .getStatistics(
        this.selectedDepartmentId(),
        this.selectedFuelType(),
        start,
        end
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          if (this.isDestroyed) return;
          
          this.statistics.set(stats);
          this.isLoading.set(false);
          // Use setTimeout to ensure DOM is ready for charts
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.updateCharts();
            }
          }, 100);
        },
        error: (err) => {
          if (this.isDestroyed) return;
          
          console.error('Error loading statistics:', err);
          this.toastService.error('Помилка завантаження статистики');
          this.isLoading.set(false);
        },
      });
  }

  private updateCharts(): void {
    const stats = this.statistics();
    if (!stats) return;

    // Destroy existing charts
    if (this.expensesChart) {
      this.expensesChart.destroy();
      this.expensesChart = null;
    }
    if (this.dieselChart) {
      this.dieselChart.destroy();
      this.dieselChart = null;
    }

    // Завжди два графіки: один для бензину, один для дизеля
    this.createExpensesChart(stats, FuelType.Gasoline, 'fuelExpensesChart', stats.monthlyExpenses);
    this.createExpensesChart(stats, FuelType.Diesel, 'fuelDieselChart', stats.monthlyConsumption);
  }

  private createExpensesChart(
    stats: FuelPaymentStatistics,
    fuelType: FuelType,
    canvasId: string,
    dataPoints: { month: string; value: number }[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    // Створюємо унікальні місяці з обох наборів даних для правильних labels
    const allMonths = new Set<string>();
    stats.monthlyExpenses.forEach((d) => allMonths.add(d.month));
    stats.monthlyConsumption.forEach((d) => allMonths.add(d.month));
    const sortedMonths = Array.from(allMonths).sort();
    const labels = sortedMonths.map((m) => this.formatMonth(m));

    // Створюємо масив даних для всіх місяців
    const dataMap = new Map(dataPoints.map((d) => [d.month, d.value]));
    const data = sortedMonths.map((month) => dataMap.get(month) || 0);

    const fuelTypeName = fuelType === FuelType.Gasoline ? 'Бензин' : 'Дізель';
    const chartColor = fuelType === FuelType.Gasoline 
      ? { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' }
      : { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Витрати палива (л) — ${fuelTypeName}`,
            data,
            borderColor: chartColor.border,
            backgroundColor: chartColor.background,
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Витрати палива (л) — ${fuelTypeName}`,
            color: 'var(--text-primary, #fff)',
          },
          legend: {
            labels: {
              color: 'var(--text-primary, #fff)',
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'var(--text-secondary, #aaa)',
              callback: function (value) {
                return value + ' л';
              },
            },
            grid: {
              color: 'var(--border-color, #444)',
            },
          },
          x: {
            ticks: {
              color: 'var(--text-secondary, #aaa)',
            },
            grid: {
              color: 'var(--border-color, #444)',
            },
          },
        },
      },
    };

    if (fuelType === FuelType.Gasoline) {
      this.expensesChart = new Chart(canvas, config);
    } else {
      this.dieselChart = new Chart(canvas, config);
    }
  }

  private formatMonth(monthString: string): string {
    const [year, month] = monthString.split('-');
    const monthNames = [
      'Січ',
      'Лют',
      'Бер',
      'Кві',
      'Тра',
      'Чер',
      'Лип',
      'Сер',
      'Вер',
      'Жов',
      'Лис',
      'Гру',
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  formatDateForDisplay(dateString: string | null | undefined): string {
    const formatted = formatDateDDMMYYYY(dateString);
    if (!formatted || formatted === 'Не вказано') {
      return '';
    }
    return formatted.replace(/\./g, '/');
  }

  onDateWrapperMouseDown(event: MouseEvent, input: HTMLInputElement | null): void {
    event.preventDefault();
    this.openDatePicker(input);
  }

  // Open native date picker when clicking anywhere on the wrapper
  openDatePicker(input: HTMLInputElement | null): void {
    if (!input) return;
    input.focus();
    (input as any).showPicker?.();
  }

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDepartmentId.set(value || null);
  }

  onFuelTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedFuelType.set(value ? +value : null);
  }

  onStartDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.startDate.set(value);
    
    // Validate: end date should be after start date
    const end = this.endDate();
    if (end && value && value > end) {
      this.toastService.error('Дата "Від" не може бути пізніше дати "По"');
      return;
    }
  }

  onEndDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.endDate.set(value);
    
    // Validate: end date should be after start date
    const start = this.startDate();
    if (start && value && value < start) {
      this.toastService.error('Дата "По" не може бути раніше дати "Від"');
      return;
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    
    // Destroy charts to prevent memory leaks
    if (this.expensesChart) {
      this.expensesChart.destroy();
      this.expensesChart = null;
    }
    if (this.dieselChart) {
      this.dieselChart.destroy();
      this.dieselChart = null;
    }
  }
}
