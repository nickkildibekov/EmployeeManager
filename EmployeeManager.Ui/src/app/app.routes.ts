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
    path: 'employees/:id',
    loadComponent: () =>
      import('./features/employees/employee/employee').then((m) => m.EmployeeComponent),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./features/departments/department-list/department-list').then(
        (m) => m.DepartmentListComponent
      ),
  },
  {
    path: 'departments/:id',
    loadComponent: () =>
      import('./features/departments/department/department').then((m) => m.DepartmentComponent),
  },
  {
    path: 'positions',
    loadComponent: () =>
      import('./features/positions/position-list/position-list').then(
        (m) => m.PositionListComponent
      ),
  },
  {
    path: 'positions/:depId',
    loadComponent: () =>
      import('./features/positions/position-list/position-list').then(
        (m) => m.PositionListComponent
      ),
  },
  { path: '**', redirectTo: 'departments' },
];
