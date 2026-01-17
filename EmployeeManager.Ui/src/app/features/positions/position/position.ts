import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';

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
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);

  position = signal<Position | undefined>(undefined);
  departments = signal<Department[]>([]);

  editedPosition = signal<PositionUpdatePayload>({
    id: 0,
    title: '',
    departmentIds: [],
  });

  // Computed property to show department names from position data
  currentDepartments = computed(() => {
    const pos = this.position();
    if (!pos || !pos.departments || pos.departments.length === 0) {
      return 'Відділи не призначено';
    }
    return pos.departments.map((d) => d.name).join(', ');
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
            this.error.set('ID посади відсутній або недійсний!');
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
          const deptIds = pos.departments ? pos.departments.map((d) => d.id) : [];
          this.editedPosition.set({
            id: pos.id,
            title: pos.title,
            departmentIds: deptIds,
          });
          this.isFetching.set(false);
        },
        error: (error: Error) => {
          this.toastService.error(error.message);
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
      error: (err: Error) => {
        this.toastService.error('Не вдалося завантажити відділи');
        this.error.set(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  toggleEditMode(): void {
    this.isEditMode.update((val) => !val);
    if (!this.isEditMode() && this.position()) {
      const currentPos = this.position()!;
      const deptIds = currentPos.departments ? currentPos.departments.map((d) => d.id) : [];
      this.editedPosition.set({
        id: currentPos.id,
        title: currentPos.title,
        departmentIds: deptIds,
      });
    }
  }

  isDepartmentSelected(departmentId: number): boolean {
    return this.editedPosition().departmentIds.includes(departmentId);
  }

  toggleDepartment(departmentId: number): void {
    const currentIds = [...this.editedPosition().departmentIds];
    const index = currentIds.indexOf(departmentId);

    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(departmentId);
    }

    this.editedPosition.update((pos) => ({
      ...pos,
      departmentIds: currentIds,
    }));
  }

  savePosition(): void {
    const pos = this.editedPosition();
    if (!pos.title.trim()) {
      this.toastService.warning('Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    this.isSaving.set(true);

    this.positionService.updatePosition(pos).subscribe({
      next: (updatedPos) => {
        this.position.set(updatedPos);
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.navigationService.afterUpdate('position', { stayOnPage: true });
      },
      error: (err: Error) => {
        this.toastService.error(err.message);
        this.error.set(err.message);
        this.isSaving.set(false);
      },
    });
  }

  async deletePosition(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Видалити посаду',
      message: 'Ви впевнені, що хочете видалити цю посаду? Цю дію неможливо скасувати.',
      confirmText: 'Видалити',
      variant: 'danger',
    });
    if (!confirmed) return;

    const id = this.positionId;
    if (!id) return;

    this.positionService.deletePosition(id).subscribe({
      next: () => {
        this.navigationService.afterDelete('position');
      },
      error: (err: Error) => {
        this.toastService.error(err.message);
        this.error.set(err.message);
      },
    });
  }

  goBack(): void {
    this.navigationService.goBack('/positions');
  }
}
