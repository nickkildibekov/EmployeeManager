import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'danger' | 'info';
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialogConfig = signal<DialogConfig | null>(null);
  private resolveCallback?: (confirmed: boolean) => void;

  isOpen = signal(false);
  config = this.dialogConfig.asReadonly();

  async confirm(config: DialogConfig | string): Promise<boolean> {
    const dialogConfig: DialogConfig = typeof config === 'string' 
      ? { message: config }
      : config;

    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.dialogConfig.set({
        title: dialogConfig.title || 'Confirm Action',
        message: dialogConfig.message,
        confirmText: dialogConfig.confirmText || 'OK',
        cancelText: dialogConfig.cancelText || 'Cancel',
        variant: dialogConfig.variant || 'warning'
      });
      this.isOpen.set(true);
    });
  }

  handleConfirm() {
    this.isOpen.set(false);
    this.resolveCallback?.(true);
  }

  handleCancel() {
    this.isOpen.set(false);
    this.resolveCallback?.(false);
  }
}
