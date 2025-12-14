import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService } from '../department.service';
import { Department } from '../../../shared/models/department.model';

import { Router } from '@angular/router';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './department-list.html',
  styleUrls: ['./department-list.css'],
})
export class DepartmentListComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  departments = signal<Department[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.isFetching.set(true);
    const subscription = this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        console.log(departments);
        this.departments.set(departments);
      },
      error: (error: Error) => {
        this.error.set(error.message);
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
}
