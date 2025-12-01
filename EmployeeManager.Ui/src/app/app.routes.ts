import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'employees', pathMatch: 'full' },
  {
    path: 'employees',
    loadComponent: () =>
      import('./features/employees/employee-list/employee-list').then((m) => m.EmployeeList),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./features/departments/department-list/department-list').then(
        (m) => m.DepartmentList
      ),
  },
  {
    path: 'positions',
    loadComponent: () =>
      import('./features/positions/position-list/position-list').then((m) => m.PositionList),
  },
  { path: '**', redirectTo: 'employees' },
];
