import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../../employees/employee.service';
import { FuelPaymentFormComponent } from '../fuel-payment-form/fuel-payment-form.component';
import { FuelStatisticsComponent } from '../fuel-statistics/fuel-statistics.component';
import { FuelPaymentArchiveComponent } from '../fuel-payment-archive/fuel-payment-archive.component';

@Component({
  selector: 'app-fuel-page',
  standalone: true,
  imports: [
    CommonModule,
    FuelPaymentFormComponent,
    FuelStatisticsComponent,
    FuelPaymentArchiveComponent,
  ],
  templateUrl: './fuel-page.component.html',
  styleUrl: './fuel-page.component.css',
})
export class FuelPageComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);

  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);

  activeFuelSubTab = signal<'entry' | 'statistics' | 'archive'>('entry');

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
    this.employeeService
      .getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc')
      .subscribe({
        next: (res) => this.employees.set(res.items),
        error: (err) => console.error('Error loading employees:', err),
      });
  }

  setFuelSubTab(tab: 'entry' | 'statistics' | 'archive'): void {
    this.activeFuelSubTab.set(tab);
  }

  onPaymentSaved(): void {
    // Hook for future enhancements (e.g., reload archive/statistics)
    console.log('Fuel payment saved successfully');
  }
}

