import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
import { BreadcrumbComponent } from './shared/components/breadcrumb/breadcrumb';
import { QuickActionsComponent } from './shared/components/quick-actions/quick-actions';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, BreadcrumbComponent, QuickActionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
