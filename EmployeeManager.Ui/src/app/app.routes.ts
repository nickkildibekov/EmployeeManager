import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'employees',
    loadComponent: () =>
      import('./features/employees/employee-list-page/employee-list-page').then(
        (m) => m.EmployeeListPageComponent
      ),
  },
  {
    path: 'employees/:id',
    loadComponent: () =>
      import('./features/employees/employee/employee').then((m) => m.EmployeeComponent),
  },
  {
    path: 'departments/:id/employees',
    loadComponent: () =>
      import('./features/employees/employees-by-department/employees-by-department').then(
        (m) => m.EmployeesByDepartmentComponent
      ),
  },
  {
    path: 'departments/:id/positions',
    loadComponent: () =>
      import('./features/positions/positions-by-department/positions-by-department').then(
        (m) => m.PositionsByDepartmentComponent
      ),
  },
  {
    path: 'departments/:id/equipment',
    loadComponent: () =>
      import('./features/equipment/equipment-by-department/equipment-by-department').then(
        (m) => m.EquipmentByDepartmentComponent
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
    path: 'departments/:id',
    loadComponent: () =>
      import('./features/departments/department/department').then((m) => m.DepartmentComponent),
  },
  {
    path: 'positions',
    loadComponent: () =>
      import('./features/positions/position-list-page/position-list-page').then(
        (m) => m.PositionListPageComponent
      ),
  },
  {
    path: 'positions/:id',
    loadComponent: () =>
      import('./features/positions/position/position').then((m) => m.PositionComponent),
  },
  {
    path: 'equipment',
    loadComponent: () =>
      import('./features/equipment/equipment-list-page/equipment-list-page').then(
        (m) => m.EquipmentListPageComponent
      ),
  },
  {
    path: 'equipment/:id',
    loadComponent: () =>
      import('./features/equipment/equipment/equipment').then((m) => m.Equipment),
  },
  { path: '**', redirectTo: 'home' },
];
