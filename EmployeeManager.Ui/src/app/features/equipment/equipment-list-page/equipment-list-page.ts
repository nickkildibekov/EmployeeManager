import {
  Component,
  OnInit,
  inject,
  signal,
  DestroyRef,
  HostListener,
  computed,
} from '@angular/core';
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
import { EmployeeService } from '../../employees/employee.service';
import { EquipmentModalComponent } from '../equipment-modal/equipment-modal.component';
import { EquipmentCategoriesManageModalComponent } from '../equipment-categories-manage-modal/equipment-categories-manage-modal.component';
import { Equipment } from '../../../shared/models/equipment.model';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';
import { Employee } from '../../../shared/models/employee.model';
import { EquipmentCreationPayload, EquipmentUpdatePayload } from '../../../shared/models/payloads';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-equipment-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent, EquipmentModalComponent, EquipmentCategoriesManageModalComponent],
  templateUrl: './equipment-list-page.html',
  styleUrls: ['./equipment-list-page.css'],
})
export class EquipmentListPageComponent implements OnInit {
  private equipmentService = inject(EquipmentService);
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private navigationService = inject(NavigationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  private searchSubject = new Subject<string>();

  equipment = signal<Equipment[]>([]);
  departments = signal<Department[]>([]);
  categories = signal<EquipmentCategory[]>([]);
  employees = signal<Employee[]>([]);

  selectedDepartmentId = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);
  statusFilter = signal<'all' | 'used' | 'not_used' | 'broken'>('all');
  searchTerm = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  sortBy = signal<
    'name' | 'serialNumber' | 'category' | 'purchaseDate' | 'status' | 'department' | 'amount' | ''
  >('name');
  sortOrder = signal<'asc' | 'desc'>('asc');

  isLoading = signal(false);
  error = signal('');
  isEquipmentModalOpen = signal(false);
  selectedEquipment = signal<Equipment | null>(null);
  isCategoriesManageModalOpen = signal(false);

  Math = Math;

  // Image modal state
  imageItems = signal<{ src: string; name: string; id: string }[]>([]);
  selectedImageIndex = signal<number>(0);
  selectedImage = computed(() => {
    const items = this.imageItems();
    const i = this.selectedImageIndex();
    return items.length > 0 && i >= 0 && i < items.length ? items[i] : null;
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.loadCategories();
    this.loadEmployees();
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

  private loadEmployees() {
    const sub = this.employeeService.getEmployeesByDepartment('', 1, 1000, '', null, '', 'asc').subscribe({
      next: (res) => this.employees.set(res.items),
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  loadEquipment() {
    this.isLoading.set(true);
    const statusParam =
      this.statusFilter() === 'all'
        ? null
        : this.statusFilter() === 'used'
        ? 'Used'
        : this.statusFilter() === 'not_used'
        ? 'NotUsed'
        : 'Broken';
    const sub = this.equipmentService
      .getEquipmentByDepartment(
        this.selectedDepartmentId(),
        this.page(),
        this.pageSize(),
        this.searchTerm(),
        statusParam,
        null,
        this.selectedCategoryId(),
        this.sortBy(),
        this.sortOrder()
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
    const id = depId || null;
    this.selectedDepartmentId.set(id);
    this.page.set(1);
    this.loadEquipment();
  }

  onCategoryChange(catId: string) {
    const id = catId || null;
    this.selectedCategoryId.set(id);
    this.page.set(1);
    this.loadEquipment();
  }

  onStatusChange(value: string) {
    this.statusFilter.set(value as 'all' | 'used' | 'not_used' | 'broken');
    this.page.set(1);
    this.loadEquipment();
  }

  toggleSort(
    column: 'name' | 'serialNumber' | 'category' | 'purchaseDate' | 'status' | 'department'
  ) {
    if (this.sortBy() === column) {
      // Toggle sort order
      this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      // Switch to new column, default to ascending
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.loadEquipment();
  }

  changePage(newPage: number) {
    this.page.set(newPage);
    this.loadEquipment();
  }

  openEquipmentModal() {
    this.selectedEquipment.set(null);
    this.isEquipmentModalOpen.set(true);
  }

  editEquipment(equipment: Equipment) {
    this.selectedEquipment.set(equipment);
    this.isEquipmentModalOpen.set(true);
  }

  closeEquipmentModal() {
    this.isEquipmentModalOpen.set(false);
    this.selectedEquipment.set(null);
  }

  onCategoryAdded(newCategory: EquipmentCategory) {
    this.categories.update((cats) => [...cats, newCategory]);
  }

  onCategoryUpdated(updatedCategory: EquipmentCategory) {
    this.categories.update((cats) =>
      cats.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    );
    // Reload equipment to refresh filters
    this.loadEquipment();
  }

  openCategoriesManageModal() {
    this.isCategoriesManageModalOpen.set(true);
  }

  closeCategoriesManageModal() {
    this.isCategoriesManageModalOpen.set(false);
  }

  async onCategoryDelete(categoryId: string): Promise<void> {
    const category = this.categories().find((c) => c.id === categoryId);
    if (!category) return;

    const confirmed = await this.dialogService.confirm(
      `Ви впевнені, що хочете видалити категорію "${category.name}"?`
    );
    if (!confirmed) return;

    this.equipmentService.deleteCategory(categoryId).subscribe({
      next: () => {
        this.categories.update((cats) => cats.filter((c) => c.id !== categoryId));
        this.toastService.success('Категорію успішно видалено');
        // Reload equipment to refresh filters
        this.loadEquipment();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }

  onEquipmentSave(equipmentData: EquipmentCreationPayload | EquipmentUpdatePayload) {
    if ('id' in equipmentData) {
      // Update
      this.equipmentService.updateEquipment(equipmentData as EquipmentUpdatePayload).subscribe({
        next: () => {
          this.closeEquipmentModal();
          this.loadEquipment();
          this.toastService.success('Обладнання успішно оновлено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    } else {
      // Create
      this.equipmentService.addEquipment(equipmentData).subscribe({
        next: () => {
          this.closeEquipmentModal();
          this.page.set(1);
          this.selectedDepartmentId.set(null);
          this.selectedCategoryId.set(null);
          this.loadEquipment();
          this.toastService.success('Обладнання успішно створено');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.toastService.error(err.message);
        },
      });
    }
  }

  async deleteEquipment(id: string): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Ви впевнені, що хочете видалити це обладнання?'
    );
    if (!confirmed) return;

    this.equipmentService.deleteEquipment(id).subscribe({
      next: (response: any) => {
        // Reset filters to show all equipment after deletion
        this.selectedDepartmentId.set(null);
        this.selectedCategoryId.set(null);
        this.statusFilter.set('all');
        this.searchTerm.set('');
        this.page.set(1);
        
        this.loadEquipment();
        // Check if equipment was moved to Reserve or deleted
        // If response is null, equipment was deleted (204 NoContent)
        // If response has message, equipment was moved to Reserve (200 OK)
        if (response && response.message && response.message.includes('moved to Reserve')) {
          this.toastService.success('Обладнання переміщено до відділу Резерв');
        } else if (response === null) {
          this.toastService.success('Обладнання успішно видалено');
        } else {
          // Fallback message
          this.toastService.success('Операція виконана успішно');
        }
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.toastService.error(err.message);
      },
    });
  }
  openEquipment(id: string) {
    this.router.navigate(['/equipment', id]);
  }

  getDepartmentName(depId: string | null): string {
    if (!depId) return 'Склад';
    const dep = this.departments().find((d) => d.id === depId);
    return dep ? dep.name : 'Невідомо';
  }

  // Open/close image modal
  openImageModal(src: string, name: string) {
    if (!src) return;
    const items = this.equipment()
      .filter((e) => !!e.imageData)
      .map((e) => ({ src: e.imageData as string, name: e.name, id: e.id }));
    this.imageItems.set(items);
    const idx = items.findIndex((it) => it.src === src && it.name === name);
    this.selectedImageIndex.set(Math.max(0, idx));
  }

  closeImageModal() {
    this.imageItems.set([]);
    this.selectedImageIndex.set(0);
  }

  prevImage() {
    const items = this.imageItems();
    if (!items.length) return;
    const next = (this.selectedImageIndex() - 1 + items.length) % items.length;
    this.selectedImageIndex.set(next);
  }

  nextImage() {
    const items = this.imageItems();
    if (!items.length) return;
    const next = (this.selectedImageIndex() + 1) % items.length;
    this.selectedImageIndex.set(next);
  }

  openSelectedDetails() {
    const sel = this.selectedImage();
    if (!sel) return;
    this.closeImageModal();
    this.openEquipment(sel.id);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (!this.selectedImage()) return;
    if (ev.key === 'Escape') {
      this.closeImageModal();
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.prevImage();
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.nextImage();
    }
  }
}
