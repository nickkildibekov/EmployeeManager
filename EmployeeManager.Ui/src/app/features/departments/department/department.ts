import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { Department } from '../../../shared/models/department.model';
import { Employee } from '../../../shared/models/employee.model';
import { Position } from '../../../shared/models/position.model';

import { DepartmentService } from '../department.service';
import { PositionService } from '../../positions/position.service';
import { EmployeeService } from '../../employees/employee.service';

import { PositionListComponent } from '../../positions/position-list/position-list';
import { EmployeeListComponent } from '../../employees/employee-list/employee-list';

interface DepartmentUpdateDTO {
  id: number;
  name: string;
}

interface NewEmployeeData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
}

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [FormsModule, PositionListComponent, EmployeeListComponent],
  templateUrl: './department.html',
  styleUrl: './department.css',
})
export class DepartmentComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private positionService = inject(PositionService);
  private employeeService = inject(EmployeeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  department = signal<Department | undefined>(undefined);
  editedDepartment = signal<DepartmentUpdateDTO>({ id: 0, name: '' });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  departmentId: number | undefined;

  ngOnInit(): void {
    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
            this.error.set('Department Id is missing or invalid!');
            this.isFetching.set(false);
            return [];
          }

          this.departmentId = id;
          this.isFetching.set(true);
          return this.departmentService.getDepartmentById(id);
        })
      )
      .subscribe({
        next: (dept) => {
          this.department.set(dept);
          this.editedDepartment.set({
            id: dept.id,
            name: dept.name,
          });
          this.isFetching.set(false);
        },
        error: (error: Error) => {
          this.error.set(error.message);
          this.isFetching.set(false);
        },
      });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.department()) {
      // Reset edited fields if cancelling edit mode
      const currentDep = this.department()!;
      this.editedDepartment.set({
        id: currentDep.id,
        name: currentDep.name,
      });
    }
  }

  saveDepartment(): void {
    const id = this.departmentId;
    const { name } = this.editedDepartment();
    if (!id || !name.trim()) {
      console.warn('Cannot save: Invalid ID or empty name.');
      return;
    }

    this.isSaving.set(true);

    this.departmentService.updateDepartment(id, name.trim()).subscribe({
      next: (updatedDep) => {
        this.department.update((dep) => ({
          ...dep!,
          name: updatedDep.name,
        }));
        this.editedDepartment.update((edited) => ({
          ...edited,
          name: updatedDep.name,
        }));
        this.isEditMode.set(false);
        this.isSaving.set(false);
      },
      error: (err: Error) => {
        console.error('Error updating department:', err);
        this.isSaving.set(false);
      },
    });
  }

  onPositionAdded(title: string): void {
    const deptId = this.departmentId;
    if (!deptId) return;

    const newPositionPayload = {
      id: 0, // Placeholder ID (API ignores this but TS requires it for the Position interface)
      title: title,
      description: '',
      departmentId: deptId,
    };

    this.positionService.addPosition(newPositionPayload).subscribe({
      next: (updatedPosition) => {
        this.department.update((dept) => {
          if (!dept) return dept;
          return {
            ...dept,
            positions: [...(dept.positions || []), updatedPosition],
          };
        });
      },
      error: (err) => {
        console.error('Error adding position:', err);
      },
    });
  }

  onPositionDeleted(positionId: number): void {
    const deptId = this.departmentId;
    if (!deptId) return;

    // Call service to delete the position
    this.positionService.deletePosition(deptId, positionId).subscribe({
      next: () => {
        this.department.update((dept) => {
          if (!dept) return dept;
          return {
            ...dept,
            positions: dept.positions ? dept.positions.filter((p) => p.id !== positionId) : [],
          };
        });
      },
      error: (err) => {
        console.error('Error deleting position:', err);
      },
    });
  }

  onEmployeeAdded(newEmployee: NewEmployeeData): void {
    const deptid = this.departmentId;
    if (!deptid) return;

    this.employeeService.addEmployee(deptid, newEmployee).subscribe({
      next: (updatedemployee) => {
        this.department.update((dept) => {
          if (!dept) return dept;
          return {
            ...dept,
            employees: [...(dept.employees || []), updatedemployee],
          };
        });
      },
      error: (err) => {
        console.error('error adding employee:', err);
      },
    });
  }

  onEmployeeDeleted(employeeId: number): void {
    const deptId = this.departmentId;
    if (!deptId) return;

    // Call service to delete the employee
    this.employeeService.deleteEmployee(employeeId).subscribe({
      next: () => {
        this.department.update((dept) => {
          if (!dept) return dept;
          return {
            ...dept,
            // Filter out the deleted employee
            employees: dept.employees ? dept.employees.filter((e) => e.id !== employeeId) : [],
          };
        });
      },
      error: (err) => {
        console.error('Error deleting employee:', err);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/departments']);
  }
}
