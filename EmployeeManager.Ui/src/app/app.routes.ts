import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'departments', pathMatch: 'full' },
  {
    path: 'employees',
    loadComponent: () =>
      import('./features/employees/employee-list/employee-list').then(
        (m) => m.EmployeeListComponent
      ),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./features/departments/department-list/department-list').then(
        (m) => m.DepartmentListComponent
      ),
  },
  {
    path: 'positions',
    loadComponent: () =>
      import('./features/positions/position-list/position-list').then(
        (m) => m.PositionListComponent
      ),
  },
  { path: '**', redirectTo: 'departments' },
];
