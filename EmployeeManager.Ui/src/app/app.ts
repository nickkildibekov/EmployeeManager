import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
import { BreadcrumbComponent } from './shared/components/breadcrumb/breadcrumb';
import { QuickActionsComponent } from './shared/components/quick-actions/quick-actions';
import { ConfirmationDialogComponent } from './shared/components/confirmation-dialog/confirmation-dialog';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle';
import { DialogService } from './shared/services/dialog.service';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    ToastComponent, 
    BreadcrumbComponent, 
    QuickActionsComponent, 
    ConfirmationDialogComponent,
    ThemeToggleComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  dialogService = inject(DialogService);
  themeService = inject(ThemeService);
}
