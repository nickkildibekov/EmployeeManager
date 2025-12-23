import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css'
})
export class ConfirmationDialogComponent {
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'OK';
  @Input() cancelText = 'Cancel';
  @Input() variant: 'warning' | 'danger' | 'info' = 'warning';
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  getIcon(): string {
    const icons = {
      warning: '⚠️',
      danger: '🗑️',
      info: 'ℹ️'
    };
    return icons[this.variant] || '⚠️';
  }

  getIconBackground(): string {
    const backgrounds = {
      warning: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      danger: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      info: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
    };
    return backgrounds[this.variant] || backgrounds.warning;
  }
}
