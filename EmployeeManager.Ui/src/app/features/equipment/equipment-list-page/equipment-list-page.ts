import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NavigationService } from '../../../shared/services/navigation.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EquipmentService } from '../equipment.service';
import { DepartmentService } from '../../departments/department.service';
import { Equipment } from '../../../shared/models/equipment.model';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';
import { EquipmentCreationPayload } from '../../../shared/models/payloads';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-equipment-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent],
  templateUrl: './equipment-list-page.html',
  styleUrls: ['./equipment-list-page.css'],
})
export class EquipmentListPageComponent implements OnInit {
  private equipmentService = inject(EquipmentService);
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  private searchSubject = new Subject<string>();

  equipment = signal<Equipment[]>([]);
  departments = signal<Department[]>([]);
  categories = signal<EquipmentCategory[]>([]);

  selectedDepartmentId = signal<number | null>(null);
  selectedCategoryId = signal<number | null>(null);
  statusFilter = signal<'all' | 'operational' | 'out_of_service'>('all');
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);

  isLoading = signal(false);
  error = signal('');
  isAddFormVisible = signal(false);
  isAddingNewCategory = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  newEquipment = signal<EquipmentCreationPayload>({
    name: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    isWork: true,
    description: '',
    categoryId: null,
    departmentId: null,
  });

  Math = Math;

  ngOnInit(): void {
    this.loadDepartments();
    this.loadCategories();
    this.loadEquipment();

    // Setup debounced search
    const searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.page.set(1);
        this.loadEquipment();
      });

    this.destroyRef.onDestroy(() => searchSub.unsubscribe());
  }

  private loadDepartments() {
    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private loadCategories() {
    const sub = this.equipmentService.getAllCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  loadEquipment() {
    this.isLoading.set(true);
    const isWorkParam =
      this.statusFilter() === 'all' ? null : this.statusFilter() === 'operational' ? true : false;
    const sub = this.equipmentService
      .getEquipmentByDepartment(
        this.selectedDepartmentId() || 0,
        this.page(),
        this.pageSize(),
        this.searchTerm(),
        isWorkParam,
        this.selectedCategoryId()
      )
      .subscribe({
        next: (res) => {
          this.equipment.set(res.items);
          this.total.set(res.total);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
        complete: () => this.isLoading.set(false),
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  onDepartmentChange(depId: string) {
    const id = depId ? parseInt(depId, 10) : null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadEquipment();
  }

  onCategoryChange(catId: string) {
    const id = catId ? parseInt(catId, 10) : null;
    this.selectedCategoryId.set(id);
    this.page.set(1);
    this.loadEquipment();
  }

  onStatusChange(value: string) {
    this.statusFilter.set(value as 'all' | 'operational' | 'out_of_service');
    this.page.set(1);
    this.loadEquipment();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadEquipment();
  }

  toggleAddForm() {
    this.isAddFormVisible.update((v) => !v);
  }

  toggleAddNewCategory() {
    this.isAddingNewCategory.update((val) => !val);
    if (this.isAddingNewCategory()) {
      this.newEquipment().categoryId = null;
    }
    this.newCategoryName.set('');
    this.newCategoryDescription.set('');
  }

  async createAndSelectCategory() {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.toastService.error('Category name is required');
      return;
    }

    try {
      const newCategory = await this.equipmentService
        .createCategory(name, this.newCategoryDescription())
        .toPromise();
      
      if (newCategory) {
        this.categories.update(cats => [...cats, newCategory]);
        this.newEquipment().categoryId = newCategory.id;
        this.isAddingNewCategory.set(false);
        this.newCategoryName.set('');
        this.newCategoryDescription.set('');
        this.toastService.success('Category created successfully');
      }
    } catch (err: any) {
      this.error.set(err.message);
      this.toastService.error(err.message);
    }
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  resetForm() {
    this.newEquipment.set({
      name: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      isWork: true,
      description: '',
      categoryId: null,
      departmentId: null,
    });
  }

  isFormValid(): boolean {
    const eq = this.newEquipment();
    return !!(
      eq.name.trim() &&
      eq.serialNumber.trim() &&
      eq.departmentId !== null &&
      eq.categoryId !== null &&
      eq.purchaseDate
    );
  }

  addEquipment() {
    if (!this.isFormValid()) return;

    const eq = this.newEquipment();
    this.equipmentService.addEquipment(eq).subscribe({
      next: () => {
        this.resetForm();
        this.isAddFormVisible.set(false);
        this.page.set(1);
        this.loadEquipment();
        this.toastService.success('Equipment created successfully');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  async deleteEquipment(id: number): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Are you sure you want to delete this equipment?'
    );
    if (!confirmed) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: () => {
        this.loadEquipment();
        this.toastService.success('Equipment deleted successfully');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }
  openEquipment(id: number) {
    this.router.navigate(['/equipment', id]);
  }

  getDepartmentName(depId: number | null): string {
    if (!depId) return 'N/A';
    const dep = this.departments().find((d) => d.id === depId);
    return dep ? dep.name : 'Unknown';
  }
}
