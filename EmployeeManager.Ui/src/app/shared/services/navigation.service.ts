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

    if (navigateToList) {
      this.router.navigate([`/${entityType}s`]);
    } else {
      this.router.navigate([`/${entityType}s`, id]);
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
      this.router.navigate([`/${entityType}s`]);
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
      this.router.navigate([`/${entityType}s`]);
    }
  }

  // Navigate with context (e.g., filtered lists)
  navigateWithContext(route: string[], queryParams?: any) {
    this.router.navigate(route, { queryParams });
  }

  // Navigate to entity detail
  toDetail(entityType: string, id: number) {
    this.router.navigate([`/${entityType}s`, id]);
  }

  // Navigate to list
  toList(entityType: string, filters?: any) {
    this.router.navigate([`/${entityType}s`], { 
      queryParams: filters 
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
}
