import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';
import { EquipmentService } from '../equipment.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-equipment-categories-manage-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment-categories-manage-modal.component.html',
  styleUrl: './equipment-categories-manage-modal.component.css',
})
export class EquipmentCategoriesManageModalComponent implements OnChanges {
  @Input() isOpen = signal(false);
  @Input() categories: EquipmentCategory[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() categoryDeleted = new EventEmitter<string>();
  @Output() categoryUpdated = new EventEmitter<EquipmentCategory>();

  private equipmentService = inject(EquipmentService);
  private toastService = inject(ToastService);

  displayedCategories = signal<EquipmentCategory[]>([]);
  editingCategoryId = signal<string | null>(null);
  editedCategoryName = signal('');
  editedCategoryDescription = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories']) {
      this.displayedCategories.set([...this.categories]);
    }
  }

  startEdit(category: EquipmentCategory): void {
    this.editingCategoryId.set(category.id);
    this.editedCategoryName.set(category.name);
    this.editedCategoryDescription.set(category.description || '');
  }

  cancelEdit(): void {
    this.editingCategoryId.set(null);
    this.editedCategoryName.set('');
    this.editedCategoryDescription.set('');
  }

  saveEdit(categoryId: string): void {
    const name = this.editedCategoryName().trim();
    if (!name) {
      this.toastService.error('Назва категорії обов\'язкова');
      return;
    }

    this.equipmentService.updateCategory(categoryId, name, this.editedCategoryDescription().trim()).subscribe({
      next: (updatedCategory) => {
        // Update local displayed categories
        this.displayedCategories.update((cats) =>
          cats.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
        );
        this.categoryUpdated.emit(updatedCategory);
        this.cancelEdit();
        this.toastService.success('Категорію успішно оновлено');
      },
      error: (err: Error) => {
        this.toastService.error(err.message);
      },
    });
  }

  onDelete(categoryId: string): void {
    this.categoryDeleted.emit(categoryId);
  }

  onClose(): void {
    this.cancelEdit();
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
