import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { PaymentType } from '../../../shared/models/utility-payment.model';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { UtilityPaymentFormComponent } from '../utility-payment-form/utility-payment-form.component';
import { UtilityStatisticsComponent } from '../utility-statistics/utility-statistics.component';
import { UtilityPaymentArchiveComponent } from '../utility-payment-archive/utility-payment-archive.component';
import { FuelPaymentFormComponent } from '../../fuel/fuel-payment-form/fuel-payment-form.component';
import { FuelStatisticsComponent } from '../../fuel/fuel-statistics/fuel-statistics.component';
import { FuelPaymentArchiveComponent } from '../../fuel/fuel-payment-archive/fuel-payment-archive.component';

@Component({
  selector: 'app-utilities-page',
  standalone: true,
  imports: [CommonModule, UtilityPaymentFormComponent, UtilityStatisticsComponent, UtilityPaymentArchiveComponent, FuelPaymentFormComponent, FuelStatisticsComponent, FuelPaymentArchiveComponent],
  templateUrl: './utilities-page.component.html',
  styleUrl: './utilities-page.component.css',
})
export class UtilitiesPageComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);

  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);

  // Tab management
  activeMainTab = signal<'utilities' | 'fuel'>('utilities');
  activeUtilitiesSubTab = signal<'entry' | 'statistics' | 'archive'>('entry');
  activeFuelSubTab = signal<'entry' | 'statistics' | 'archive'>('entry');

  // Payment type for utilities
  selectedPaymentType = signal<PaymentType>(PaymentType.Electricity);

  paymentTypes = [
    { value: PaymentType.Electricity, label: 'Електроенергія' },
    { value: PaymentType.Gas, label: 'Газ' },
    { value: PaymentType.Water, label: 'Вода' },
    { value: PaymentType.Rent, label: 'Оренда' },
  ];

  ngOnInit(): void {
    this.loadDepartments();
    this.loadEmployees();
  }

  private loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err) => console.error('Error loading departments:', err),
    });
  }

  private loadEmployees(): void {
    this.employeeService.getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc').subscribe({
      next: (res) => this.employees.set(res.items),
      error: (err) => console.error('Error loading employees:', err),
    });
  }

  setMainTab(tab: 'utilities' | 'fuel'): void {
    this.activeMainTab.set(tab);
  }

  setUtilitiesSubTab(tab: 'entry' | 'statistics' | 'archive'): void {
    this.activeUtilitiesSubTab.set(tab);
  }

  setFuelSubTab(tab: 'entry' | 'statistics' | 'archive'): void {
    this.activeFuelSubTab.set(tab);
  }

  onPaymentSaved(): void {
    // Reload data or show success message
    console.log('Payment saved successfully');
  }
}
