import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-actions.html',
  styleUrl: './quick-actions.css'
})
export class QuickActionsComponent {
  private router = inject(Router);
  isOpen = signal(false);

  navigate(route: string) {
    this.isOpen.set(false);
    this.router.navigate([route]);
    // Scroll to add form section
    setTimeout(() => {
      const addButton = document.querySelector('.btn-primary') as HTMLElement;
      if (addButton && !addButton.textContent?.includes('Cancel')) {
        addButton.click();
      }
    }, 100);
  }

  toggleMenu() {
    this.isOpen.update(v => !v);
  }
}
