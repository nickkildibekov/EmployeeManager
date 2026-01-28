import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-equipment-category-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipment-category-modal.component.html',
  styleUrl: './equipment-category-modal.component.css',
})
export class EquipmentCategoryModalComponent {
  @Input() isOpen = signal(false);
  @Output() save = new EventEmitter<{ name: string; description: string }>();
  @Output() close = new EventEmitter<void>();

  categoryName = signal('');
  categoryDescription = signal('');

  onNameChange(value: string): void {
    this.categoryName.set(value);
  }

  onDescriptionChange(value: string): void {
    this.categoryDescription.set(value);
  }

  isFormValid(): boolean {
    return !!this.categoryName().trim();
  }

  onSave(): void {
    if (this.isFormValid()) {
      this.save.emit({
        name: this.categoryName().trim(),
        description: this.categoryDescription().trim(),
      });
      this.resetForm();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.categoryName.set('');
    this.categoryDescription.set('');
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
