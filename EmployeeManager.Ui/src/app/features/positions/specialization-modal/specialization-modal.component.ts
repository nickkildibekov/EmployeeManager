import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-specialization-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './specialization-modal.component.html',
  styleUrl: './specialization-modal.component.css',
})
export class SpecializationModalComponent {
  @Input() isOpen = signal(false);
  
  @Output() save = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  name = signal('');

  isFormValid(): boolean {
    return !!this.name().trim();
  }

  onSave(): void {
    if (this.isFormValid()) {
      this.save.emit(this.name().trim());
      this.resetForm();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.name.set('');
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
