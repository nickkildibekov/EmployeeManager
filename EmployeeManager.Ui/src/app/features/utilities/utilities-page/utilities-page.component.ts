import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { PaymentType } from '../../../shared/models/utility-payment.model';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { UtilityPaymentFormComponent } from '../utility-payment-form/utility-payment-form.component';
import { UtilityStatisticsComponent } from '../utility-statistics/utility-statistics.component';
import { UtilityPaymentArchiveComponent } from '../utility-payment-archive/utility-payment-archive.component';

@Component({
  selector: 'app-utilities-page',
  standalone: true,
  imports: [
    CommonModule,
    UtilityPaymentFormComponent,
    UtilityStatisticsComponent,
    UtilityPaymentArchiveComponent,
  ],
  templateUrl: './utilities-page.component.html',
  styleUrl: './utilities-page.component.css',
})
export class UtilitiesPageComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);

  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);

  // Sub-tab management for utilities
  activeUtilitiesSubTab = signal<'entry' | 'statistics' | 'archive'>('entry');

  // Payment type for utilities
  selectedPaymentType = signal<PaymentType>(PaymentType.Electricity);

  paymentTypes = [
    { value: PaymentType.Electricity, label: 'Електроенергія' },
    { value: PaymentType.Gas, label: 'Газ' },
    { value: PaymentType.Water, label: 'Вода' },
    { value: PaymentType.Rent, label: 'Оренда' },
  ];

  // Expose enum to template
  readonly PaymentTypeEnum = PaymentType;

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

  setUtilitiesSubTab(tab: 'entry' | 'statistics' | 'archive'): void {
    this.activeUtilitiesSubTab.set(tab);
  }

  onPaymentSaved(): void {
    // Reload data or show success message
    console.log('Payment saved successfully');
  }
}
