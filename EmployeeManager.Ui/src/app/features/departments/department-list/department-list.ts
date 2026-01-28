import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../department.service';
import { Department } from '../../../shared/models/department.model';
import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { getDepartmentDisplayName } from '../../../shared/utils/display.utils';

import { Router } from '@angular/router';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department-list.html',
  styleUrls: ['./department-list.css'],
})
export class DepartmentListComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  departments = signal<Department[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);
  newDepartmentName = signal('');
  isSubmitting = signal(false);

  ngOnInit(): void {
    this.isFetching.set(true);
    const subscription = this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments.set(departments);
      },
      error: (error: Error) => {
        this.error.set(error.message);
        this.toastService.error(error.message);
      },
      complete: () => {
        this.isFetching.set(false);
      },
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  onSelectedDepartment(dep: Department) {
    this.router.navigate(['/departments', dep.id]);
  }

  toggleAddForm() {
    this.isAddFormVisible.update((v) => !v);
    if (!this.isAddFormVisible()) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newDepartmentName.set('');
  }

  isFormValid(): boolean {
    return this.newDepartmentName().trim().length > 0;
  }

  addDepartment() {
    if (!this.isFormValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const subscription = this.departmentService
      .createDepartment(this.newDepartmentName())
      .subscribe({
        next: (newDepartment) => {
          this.departments.update((deps) => [...(deps || []), newDepartment]);
          this.toastService.success('Відділ успішно створено!');
          this.resetForm();
          this.isAddFormVisible.set(false);
          this.isSubmitting.set(false);
        },
        error: (error: Error) => {
          this.toastService.error(error.message || 'Не вдалося створити відділ');
          this.isSubmitting.set(false);
        },
      });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  getDepartmentDisplayName(name: string): string {
    return getDepartmentDisplayName(name);
  }
}
