import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private router = inject(Router);
  private location = inject(Location);
  private toastService = inject(ToastService);
  private navigationStack: string[] = [];

  // Track navigation history
  trackNavigation(url: string) {
    this.navigationStack.push(url);
    if (this.navigationStack.length > 10) {
      this.navigationStack.shift();
    }
  }

  // Smart back navigation
  goBack(fallbackRoute: string = '/dashboard') {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate([fallbackRoute]);
    }
  }

  // Smart back navigation to list by entity type
  goBackToList(entityType: 'department' | 'employee' | 'position' | 'equipment') {
    const listPath = this.getListPath(entityType);
    this.goBack(listPath);
  }

  // Navigate after create
  afterCreate(
    entityType: 'department' | 'employee' | 'position' | 'equipment',
    id: number,
    options: { showToast?: boolean; navigateToList?: boolean } = {}
  ) {
    const { showToast = true, navigateToList = false } = options;

    if (showToast) {
      this.toastService.success(`${this.capitalize(entityType)} created successfully!`);
    }

    const listPath = this.getListPath(entityType);
    if (navigateToList) {
      this.router.navigate([listPath]);
    } else {
      this.router.navigate([listPath, id]);
    }
  }

  // Navigate after update
  afterUpdate(
    entityType: 'department' | 'employee' | 'position' | 'equipment',
    options: { showToast?: boolean; stayOnPage?: boolean } = {}
  ) {
    const { showToast = true, stayOnPage = true } = options;

    if (showToast) {
      this.toastService.success(`${this.capitalize(entityType)} updated successfully!`);
    }

    if (!stayOnPage) {
      const listPath = this.getListPath(entityType);
      this.router.navigate([listPath]);
    }
  }

  // Navigate after delete
  afterDelete(
    entityType: 'department' | 'employee' | 'position' | 'equipment',
    options: { showToast?: boolean; returnTo?: string } = {}
  ) {
    const { showToast = true, returnTo } = options;

    if (showToast) {
      this.toastService.success(`${this.capitalize(entityType)} deleted successfully!`);
    }

    if (returnTo) {
      this.router.navigate([returnTo]);
    } else {
      const listPath = this.getListPath(entityType);
      this.router.navigate([listPath]);
    }
  }

  // Navigate with context (e.g., filtered lists)
  navigateWithContext(route: string[], queryParams?: any) {
    this.router.navigate(route, { queryParams });
  }

  // Navigate to entity detail
  toDetail(entityType: string, id: number) {
    const listPath = this.getListPath(entityType as any);
    this.router.navigate([listPath, id]);
  }

  // Navigate to list
  toList(entityType: string, filters?: any) {
    const listPath = this.getListPath(entityType as any);
    this.router.navigate([listPath], {
      queryParams: filters,
    });
  }

  // Navigate to department's sub-entities
  toDepartmentEmployees(departmentId: number) {
    this.router.navigate(['/departments', departmentId, 'employees']);
  }

  toDepartmentPositions(departmentId: number) {
    this.router.navigate(['/departments', departmentId, 'positions']);
  }

  toDepartmentEquipment(departmentId: number) {
    this.router.navigate(['/departments', departmentId, 'equipment']);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Centralize route pluralization; equipment list is singular in routes
  private getListPath(entityType: 'department' | 'employee' | 'position' | 'equipment'): string {
    return entityType === 'equipment' ? '/equipment' : `/${entityType}s`;
  }
}
