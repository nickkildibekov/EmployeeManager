import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface BreadcrumbItem {
  label: string;
  url: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class BreadcrumbComponent {
  private router = inject(Router);
  breadcrumbs: BreadcrumbItem[] = [];

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.breadcrumbs = this.createBreadcrumbs();
    });

    // Initialize on load
    this.breadcrumbs = this.createBreadcrumbs();
  }

  private createBreadcrumbs(): BreadcrumbItem[] {
    const url = this.router.url;
    const segments = url.split('/').filter((s) => s && !s.includes('?'));
    const crumbs: BreadcrumbItem[] = [{ label: 'Головна', url: '/home', icon: '🏠' }];

    let currentPath = '';
    let skipNext = false;

    for (let i = 0; i < segments.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      const segment = segments[i];
      currentPath += `/${segment}`;

      // Skip home segment since Home already points to /home
      if (segment === 'home') {
        continue;
      }

      // Skip numeric IDs in breadcrumb display but keep for URL
      if (/^\d+$/.test(segment)) {
        // Check if this is a detail page
        const prevSegment = segments[i - 1];
        if (prevSegment) {
          const label = this.getLabelForDetail(prevSegment);
          crumbs.push({
            label,
            url: currentPath,
            icon: this.getIconForSegment(prevSegment),
          });
        }
        continue;
      }

      const label = this.getLabelForSegment(segment, segments, i);
      const icon = this.getIconForSegment(segment);

      crumbs.push({
        label,
        url: currentPath,
        icon,
      });
    }

    return crumbs;
  }

  private getLabelForSegment(segment: string, allSegments: string[], index: number): string {
    const labels: Record<string, string> = {
      home: 'Головна',
      departments: 'Відділи',
      employees: 'Співробітники',
      positions: 'Посади',
      equipment: 'Обладнання',
    };

    return labels[segment] || this.capitalize(segment);
  }

  private getLabelForDetail(segment: string): string {
    const labels: Record<string, string> = {
      departments: 'Деталі відділу',
      employees: 'Деталі співробітника',
      positions: 'Деталі посади',
      equipment: 'Деталі обладнання',
    };

    return labels[segment] || 'Деталі';
  }

  private getIconForSegment(segment: string): string {
    const icons: Record<string, string> = {
      home: '🏠',
      departments: '🏢',
      employees: '👥',
      positions: '💼',
      equipment: '🔧',
    };
    return icons[segment] || '';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
