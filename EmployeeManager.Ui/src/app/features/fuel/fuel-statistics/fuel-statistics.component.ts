import { Component, DestroyRef, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Department } from '../../../shared/models/department.model';
import { FuelPaymentStatistics } from '../../../shared/models/fuel-payment.model';
import { FuelPaymentService } from '../fuel-payment.service';
import { DepartmentService } from '../../departments/department.service';
import { ToastService } from '../../../shared/services/toast.service';
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
  mileageChart: Chart | null = null;

  private isInitialized = false;
  private isDestroyed = false;

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
    }
    if (this.mileageChart) {
      this.mileageChart.destroy();
    }

    // Create expenses chart
    this.createExpensesChart(stats);

    // Create mileage chart
    this.createMileageChart(stats);
  }

  private createExpensesChart(stats: FuelPaymentStatistics): void {
    const canvas = document.getElementById('fuelExpensesChart') as HTMLCanvasElement;
    if (!canvas) return;

    const labels = stats.monthlyExpenses.map((d) => this.formatMonth(d.month));
    const data = stats.monthlyExpenses.map((d) => d.value);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Витрати (грн)',
            data,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
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
            text: 'Динаміка витрат на паливо',
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
                return value + ' грн';
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

    this.expensesChart = new Chart(canvas, config);
  }

  private createMileageChart(stats: FuelPaymentStatistics): void {
    const canvas = document.getElementById('fuelMileageChart') as HTMLCanvasElement;
    if (!canvas) return;

    const labels = stats.monthlyConsumption.map((d) => this.formatMonth(d.month));
    const data = stats.monthlyConsumption.map((d) => d.value);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Пробіг (км)',
            data,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
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
            text: 'Динаміка пробігу',
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
                return value + ' км';
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

    this.mileageChart = new Chart(canvas, config);
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

  onDepartmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedDepartmentId.set(value || null);
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
    if (this.mileageChart) {
      this.mileageChart.destroy();
      this.mileageChart = null;
    }
  }
}
