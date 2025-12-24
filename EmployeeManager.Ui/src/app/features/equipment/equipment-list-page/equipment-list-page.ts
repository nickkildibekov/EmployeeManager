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
  isAddFormVisible = signal(false);
  isAddingNewCategory = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  newEquipment = signal<EquipmentCreationPayload>({
    name: '',
    serialNumber: '',
    purchaseDate: '',
    status: 'Used',
    measurement: 'Unit',
    amount: 1,
    description: '',
    categoryId: null,
    departmentId: null,
  });

  Math = Math;

  // Image modal state
  imageItems = signal<{ src: string; name: string; id: number }[]>([]);
  selectedImageIndex = signal<number>(0);
  selectedImage = computed(() => {
    const items = this.imageItems();
    const i = this.selectedImageIndex();
    return items.length > 0 && i >= 0 && i < items.length ? items[i] : null;
  });

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
        this.selectedDepartmentId() || 0,
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
        this.categories.update((cats) => [...cats, newCategory]);
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
      purchaseDate: '',
      status: 'Used',
      measurement: 'Unit',
      amount: 1,
      description: '',
      categoryId: null,
      departmentId: null,
      imageData: undefined,
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('Image size must not exceed 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.newEquipment().imageData = result; // Base64-encoded image
      this.toastService.success('Image selected');
    };
    reader.onerror = () => {
      this.toastService.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.newEquipment().imageData = undefined;
  }

  onMeasurementChange(measurement: 'Unit' | 'Meter' | 'Liter') {
    // Set default amount based on measurement type
    if (measurement === 'Unit') {
      // Coerce to integer >= 1
      const current = Number(this.newEquipment().amount || 1);
      this.newEquipment().amount = Math.max(1, Math.floor(current));
    } else if (measurement === 'Meter') {
      // Round to 2 decimals, min 0.01
      const current = Number(this.newEquipment().amount || 1);
      this.newEquipment().amount = Math.max(0.01, Math.round(current * 100) / 100);
    } else if (measurement === 'Liter') {
      const current = Number(this.newEquipment().amount || 1);
      this.newEquipment().amount = Math.max(0.01, Math.round(current * 100) / 100);
    }
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = Number(input.value);
    if (!isFinite(val)) {
      val = this.newEquipment().measurement === 'Unit' ? 1 : 0.01;
    }
    if (this.newEquipment().measurement === 'Unit') {
      // Integers only, min 1
      val = Math.max(1, Math.floor(val));
    } else {
      // Two decimals, min 0.01
      val = Math.max(0.01, Math.round(val * 100) / 100);
    }
    this.newEquipment().amount = val;
  }

  isFormValid(): boolean {
    const eq = this.newEquipment();
    return !!(
      eq.name.trim() &&
      eq.departmentId !== null &&
      eq.categoryId !== null &&
      eq.purchaseDate &&
      !!eq.status
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
        this.selectedDepartmentId.set(null);
        this.selectedCategoryId.set(null);
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
