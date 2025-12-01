import { Component, signal } from '@angular/core';
import { DepartmentListComponent } from './features/departments/department-list/department-list';

@Component({
  selector: 'app-root',
  imports: [DepartmentListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('EmployeeManager.Ui');
}
