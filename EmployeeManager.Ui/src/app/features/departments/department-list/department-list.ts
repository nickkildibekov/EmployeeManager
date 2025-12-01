import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService } from '../department.service';
import { Department } from '../../../shared/models/department.model';

import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './department-list.html',
  styleUrls: ['./department-list.css'],
})
export class DepartmentListComponent implements OnInit {
  departments = signal<Department[] | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  empoyeesCount = 0;
  positionsCount = 0;
  private departmentService = inject(DepartmentService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.isFetching.set(true);
    const subscription = this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
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
}
