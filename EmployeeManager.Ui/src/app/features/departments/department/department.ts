import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Department } from '../../../shared/models/department.model';
import { DepartmentUpdateDTO } from '../../../shared/models/payloads';

import { DepartmentService } from '../department.service';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department.html',
  styleUrl: './department.css',
})
export class DepartmentComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);

  department = signal<Department | undefined>(undefined);
  editedDepartment = signal<DepartmentUpdateDTO>({ id: 0, name: '' });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  departmentId: number | undefined;

  // Computed properties for display
  positionsList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.positions) return [];

    return dept.positions.map((pos) => {
      const empCount = dept.employees?.filter((e) => e.positionId === pos.id).length || 0;
      return {
        id: pos.id,
        name: pos.title,
        count: empCount,
      };
    });
  });

  employeesList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.employees) return [];

    return dept.employees.map((emp) => {
      return {
        id: emp.id,
        fullName: `${emp.firstName} ${emp.lastName}`,
        position: emp.positionName || 'N/A',
      };
    });
  });

  equipmentList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.equipments) return [];

    // Group equipment by name and count operational/non-operational status
    const groupedMap = new Map<
      string,
      { count: number; firstId: number; operational: number; nonOperational: number }
    >();
    dept.equipments.forEach((eq) => {
      const isOperational = eq.status === 'Used';
      const existing = groupedMap.get(eq.name) || {
        count: 0,
        firstId: eq.id,
        operational: 0,
        nonOperational: 0,
      };
      groupedMap.set(eq.name, {
        count: existing.count + 1,
        firstId: existing.firstId,
        operational: existing.operational + (isOperational ? 1 : 0),
        nonOperational: existing.nonOperational + (isOperational ? 0 : 1),
      });
    });

    return Array.from(groupedMap.entries()).map(([name, data]) => ({
      id: data.firstId,
      name,
      count: data.count,
      operational: data.operational,
      nonOperational: data.nonOperational,
      statusText: `${data.operational} operational, ${data.nonOperational} out of service`,
    }));
  });

  ngOnInit(): void {
    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
            this.error.set('Department Id is missing or invalid!');
            this.toastService.error('Department Id is missing or invalid!');
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
          this.toastService.error(error.message);
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
      this.toastService.warning('Cannot save: Invalid ID or empty name.');
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
        this.toastService.success('Department updated successfully');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.isSaving.set(false);
      },
    });
  }

  goBack(): void {
    this.navigationService.goBack('/departments');
  }

  navigateToPosition(positionId: number): void {
    this.router.navigate(['/positions', positionId]);
  }

  navigateToEmployee(employeeId: number): void {
    this.router.navigate(['/employees', employeeId]);
  }

  navigateToEquipment(equipmentId: number): void {
    this.router.navigate(['/equipment', equipmentId]);
  }
}
