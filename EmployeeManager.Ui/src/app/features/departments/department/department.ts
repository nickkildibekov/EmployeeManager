import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';

import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Department } from '../../../shared/models/department.model';
import { DepartmentUpdateDTO } from '../../../shared/models/payloads';
import { getPositionDisplayName } from '../../../shared/utils/display.utils';

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
  private dialogService = inject(DialogService);

  department = signal<Department | undefined>(undefined);
  editedDepartment = signal<DepartmentUpdateDTO>({ id: '', name: '' });

  isFetching = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  isDeleting = signal(false);
  error = signal('');
  selectedPositionId = signal<string | null>(null);

  departmentId: string | undefined;


  // Computed properties for display
  positionsList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.positions) return [];

    return dept.positions.map((pos) => {
      const empCount = dept.employees?.filter((e) => e.positionId === pos.id).length || 0;
      return {
        id: pos.id,
        name: getPositionDisplayName(pos.title),
        count: empCount,
      };
    });
  });

  employeesList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.employees) return [];

    let employees = dept.employees.map((emp) => {
      return {
        id: emp.id,
        fullName: emp.callSign || 'Не вказано',
        position: getPositionDisplayName(emp.positionName),
        positionId: emp.positionId,
      };
    });

    // Filter by selected position if one is selected
    const selectedPosId = this.selectedPositionId();
    if (selectedPosId !== null) {
      employees = employees.filter((emp) => emp.positionId === selectedPosId);
    }

    return employees;
  });

  equipmentList = computed(() => {
    const dept = this.department();
    if (!dept || !dept.equipments) return [];

    // Group equipment by name and count total quantity, check for broken status
    const groupedMap = new Map<
      string,
      { count: number; firstId: string; hasBroken: boolean }
    >();
    dept.equipments.forEach((eq) => {
      const existing = groupedMap.get(eq.name) || {
        count: 0,
        firstId: eq.id,
        hasBroken: false,
      };
      groupedMap.set(eq.name, {
        count: existing.count + 1,
        firstId: existing.firstId,
        hasBroken: existing.hasBroken || eq.status === 'Broken',
      });
    });

    return Array.from(groupedMap.entries()).map(([name, data]) => ({
      id: data.firstId,
      name,
      count: data.count,
      hasBroken: data.hasBroken,
    }));
  });

  ngOnInit(): void {
    const subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          if (!id) {
            const errorMsg = 'ID відділу відсутній або недійсний!';
            this.error.set(errorMsg);
            this.toastService.error(errorMsg);
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
      this.toastService.warning('Неможливо зберегти: недійсний ID або порожня назва.');
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
        this.toastService.success('Відділ успішно оновлено');
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

  togglePositionFilter(positionId: string, event: Event): void {
    event.stopPropagation();
    const currentSelected = this.selectedPositionId();
    if (currentSelected === positionId) {
      // If clicking the same position, remove filter
      this.selectedPositionId.set(null);
    } else {
      // Set new filter
      this.selectedPositionId.set(positionId);
    }
  }

  navigateToPosition(positionId: string): void {
    this.router.navigate(['/positions', positionId]);
  }

  navigateToEmployee(employeeId: string): void {
    this.router.navigate(['/employees', employeeId]);
  }


  navigateToEquipment(equipmentId: string): void {
    this.router.navigate(['/equipment', equipmentId]);
  }

  // Check if current department is Reserve (cannot be deleted)
  isReserveDepartment(): boolean {
    const dept = this.department();
    if (!dept) return false;
    return dept.name === 'Reserve' || dept.name === 'Резерв' || dept.name === 'Global Reserve';
  }

  async deleteDepartment(): Promise<void> {
    const dept = this.department();
    if (!dept || !this.departmentId) return;

    const employeeCount = dept.employees?.length || 0;
    const equipmentCount = dept.equipments?.length || 0;

    let message = `Ви впевнені, що хочете видалити відділ "${dept.name}"?`;
    
    if (employeeCount > 0 || equipmentCount > 0) {
      const parts: string[] = [];
      if (employeeCount > 0) {
        parts.push(`${employeeCount} ${this.getEmployeeCountText(employeeCount)} буде переміщено до Резерву`);
      }
      if (equipmentCount > 0) {
        parts.push(`${equipmentCount} ${this.getEquipmentCountText(equipmentCount)} обладнання буде переміщено до Складу (DepartmentId буде встановлено як null)`);
      }
      message += ` ${parts.join('. ')}. Цю дію неможливо скасувати.`;
    } else {
      message += ' Цю дію неможливо скасувати.';
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Видалити відділ',
      message: message,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      variant: 'danger',
    });

    if (!confirmed) return;

    this.isDeleting.set(true);

    this.departmentService.deleteDepartment(this.departmentId).subscribe({
      next: () => {
        this.toastService.success('Відділ успішно видалено');
        this.navigationService.goBack('/departments');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
        this.isDeleting.set(false);
      },
    });
  }

  // Helper methods for Ukrainian pluralization
  getEmployeeCountText(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
      return 'співробітник';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return 'співробітники';
    } else {
      return 'співробітників';
    }
  }

  getEquipmentCountText(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
      return 'одиниця';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return 'одиниці';
    } else {
      return 'одиниць';
    }
  }

}
