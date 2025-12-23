import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { Position } from '../../../shared/models/position.model';
import { PositionUpdatePayload } from '../../../shared/models/payloads';
import { PositionService } from '../position.service';
import { DepartmentService } from '../../departments/department.service';
import { Department } from '../../../shared/models/department.model';

@Component({
  selector: 'app-position',
  imports: [CommonModule, FormsModule],
  templateUrl: './position.html',
  styleUrl: './position.css',
})
export class PositionComponent implements OnInit {
  private positionService = inject(PositionService);
  private departmentService = inject(DepartmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  position = signal<Position | undefined>(undefined);
  departments = signal<Department[]>([]);
  
  editedPosition = signal<PositionUpdatePayload>({
    id: 0,
    title: '',
    departmentId: 0
  });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  error = signal('');

  positionId: number | undefined;

  ngOnInit(): void {
    this.loadDepartments();
    
    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const idParam = params.get('id');
          const id = idParam ? +idParam : undefined;

          if (!id || isNaN(id)) {
            this.error.set('Position Id is missing or invalid!');
            this.isFetching.set(false);
            return [];
          }

          this.positionId = id;
          this.isFetching.set(true);
          return this.positionService.getPosition(id);
        })
      )
      .subscribe({
        next: (pos) => {
          this.position.set(pos);
          this.editedPosition.set({
            id: pos.id,
            title: pos.title,
            departmentId: pos.departmentId
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

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => this.error.set(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.position()) {
      const currentPos = this.position()!;
      this.editedPosition.set({
        id: currentPos.id,
        title: currentPos.title,
        departmentId: currentPos.departmentId
      });
    }
  }

  savePosition(): void {
    const pos = this.editedPosition();
    if (!pos.title.trim()) {
      alert('Please fill all required fields.');
      return;
    }

    this.isSaving.set(true);

    this.positionService.updatePosition(pos).subscribe({
      next: (updatedPos) => {
        this.position.set(updatedPos);
        this.isEditMode.set(false);
        this.isSaving.set(false);
      },
      error: (err: Error) => {
        console.error('Error updating position:', err);
        this.error.set(err.message);
        this.isSaving.set(false);
      },
    });
  }

  deletePosition(): void {
    if (!confirm('Are you sure you want to delete this position?')) return;

    const id = this.positionId;
    if (!id) return;

    this.positionService.deletePosition(id).subscribe({
      next: () => {
        this.router.navigate(['/positions']);
      },
      error: (err: Error) => {
        console.error('Error deleting position:', err);
        this.error.set(err.message);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/positions']);
  }
}
