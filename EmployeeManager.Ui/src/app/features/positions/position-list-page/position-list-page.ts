import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PositionService } from '../position.service';
import { DepartmentService } from '../../departments/department.service';
import { SpecializationService } from '../../employees/specialization.service';
import { Position } from '../../../shared/models/position.model';
import { Department } from '../../../shared/models/department.model';
import { Specialization } from '../../../shared/models/specialization.model';
import { PositionCreationPayload } from '../../../shared/models/payloads';
import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { getPositionDisplayName, getSpecializationDisplayName } from '../../../shared/utils/display.utils';
import { PositionModalComponent } from '../position-modal/position-modal.component';
import { SpecializationModalComponent } from '../specialization-modal/specialization-modal.component';

@Component({
  selector: 'app-position-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PositionModalComponent, SpecializationModalComponent],
  templateUrl: './position-list-page.html',
  styleUrls: ['./position-list-page.css'],
})
export class PositionListPageComponent implements OnInit {
  private positionService = inject(PositionService);
  private departmentService = inject(DepartmentService);
  private specializationService = inject(SpecializationService);
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);

  // Tab management
  activeTab = signal<'positions' | 'specializations'>('positions');

  // Positions data
  positions = signal<Position[]>([]);
  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<string | null>(null);
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  isPositionModalOpen = signal(false);

  // Specializations data
  specializations = signal<Specialization[]>([]);
  isSpecializationModalOpen = signal(false);

  isLoading = signal(false);
  error = signal('');

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
    this.loadSpecializations();
  }

  // Tab switching
  setActiveTab(tab: 'positions' | 'specializations'): void {
    this.activeTab.set(tab);
  }

  // Departments
  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => this.toastService.error(err.message),
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  // Positions
  loadPositions() {
    this.isLoading.set(true);
    const sub = this.positionService
      .getPositionsByDepartmentIdWithPagination(
        this.selectedDepartmentId(),
        this.page(),
        this.pageSize(),
        this.searchTerm()
      )
      .subscribe({
        next: (res) => {
          this.positions.set(res.items);
          this.total.set(res.total);
        },
        error: (err: Error) => {
          this.toastService.error(err.message);
          this.error.set(err.message);
        },
        complete: () => this.isLoading.set(false),
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadPositions();
  }

  onDepartmentChange(depId: string) {
    const id = depId || null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadPositions();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadPositions();
  }

  openPositionModal() {
    this.isPositionModalOpen.set(true);
  }

  closePositionModal() {
    this.isPositionModalOpen.set(false);
  }

  onPositionSave(positionData: PositionCreationPayload) {
    this.positionService.addPosition(positionData).subscribe({
      next: () => {
        this.closePositionModal();
        this.page.set(1);
        this.selectedDepartmentId.set(null);
        this.loadPositions();
        this.toastService.success('Посаду успішно створено!');
      },
      error: (err: Error) => this.toastService.error(err.message),
    });
  }

  async deletePosition(id: string): Promise<void> {
    const position = this.positions().find(p => p.id === id);
    if (!position) return;

    // Prevent deletion of Unemployed position
    if (this.isUnemployedPosition(position.title)) {
      this.toastService.error('Неможливо видалити посаду "Без Посади" (Unemployed)');
      return;
    }

    const confirmed = await this.dialogService.confirm(
      'Ви впевнені, що хочете видалити цю посаду? Співробітники з цією посадою отримають посаду "Без Посади"'
    );
    if (!confirmed) return;

    this.positionService.deletePosition(id).subscribe({
      next: () => {
        this.loadPositions();
        this.toastService.success('Посаду успішно видалено! Співробітники перепризначені на "Без Посади"');
      },
      error: (err: Error) => {
        const errorMessage = err.message || 'Помилка при видаленні посади';
        this.toastService.error(errorMessage);
      },
    });
  }

  isUnemployedPosition(title: string): boolean {
    return title === 'Unemployed' || title === 'Без Посади';
  }

  getPositionDisplayName(title: string): string {
    return getPositionDisplayName(title);
  }

  openPosition(id: string) {
    this.router.navigate(['/positions', id]);
  }

  // Specializations
  loadSpecializations() {
    const sub = this.specializationService.getAllSpecializations().subscribe({
      next: (specs) => this.specializations.set(specs),
      error: (err: Error) => {
        this.toastService.error(err.message);
        this.error.set(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  openSpecializationModal() {
    this.isSpecializationModalOpen.set(true);
  }

  closeSpecializationModal() {
    this.isSpecializationModalOpen.set(false);
  }

  onSpecializationSave(name: string) {
    this.specializationService.createSpecialization(name).subscribe({
      next: () => {
        this.closeSpecializationModal();
        this.loadSpecializations();
        this.toastService.success('Спеціальність успішно створено!');
      },
      error: (err: Error) => this.toastService.error(err.message),
    });
  }

  async deleteSpecialization(id: string): Promise<void> {
    const specialization = this.specializations().find(s => s.id === id);
    if (!specialization) return;

    // Prevent deletion of Intern specialization
    if (this.isInternSpecialization(specialization.name)) {
      this.toastService.error('Неможливо видалити спеціальність "Без Спец." (Intern)');
      return;
    }

    const confirmed = await this.dialogService.confirm(
      'Ви впевнені, що хочете видалити цю спеціальність? Співробітники з цією спеціальністю отримають спеціальність "Без Спец."'
    );
    if (!confirmed) return;

    this.specializationService.deleteSpecialization(id).subscribe({
      next: () => {
        this.loadSpecializations();
        this.toastService.success('Спеціальність успішно видалено! Співробітники перепризначені на "Без Спец."');
      },
      error: (err: Error) => {
        // Try to extract error message from response
        let errorMessage = 'Помилка при видаленні спеціальності';
        if (err.message) {
          errorMessage = err.message;
        }
        this.toastService.error(errorMessage);
      },
    });
  }

  getSpecializationDisplayName(name: string): string {
    return getSpecializationDisplayName(name);
  }

  isInternSpecialization(name: string): boolean {
    return name === 'Intern' || name === 'Без Спец.';
  }

  trackByPositionId(index: number, position: Position): string {
    return position.id;
  }

  trackBySpecializationId(index: number, specialization: Specialization): string {
    return specialization.id;
  }
}
