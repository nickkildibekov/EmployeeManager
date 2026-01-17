import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper">
      @for (item of items; track $index) {
      <div class="skeleton-item">
        <div class="skeleton-line" [style.width.%]="95"></div>
        <div class="skeleton-line" [style.width.%]="80"></div>
        <div class="skeleton-line" [style.width.%]="70"></div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .skeleton-wrapper {
        padding: 8px 0;
      }

      .skeleton-item {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        animation: pulse 1.5s ease-in-out infinite;
      }

      .skeleton-line {
        height: 12px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .skeleton-line:last-child {
        margin-bottom: 0;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() count = 5;

  get items() {
    return Array(this.count).fill(0);
  }
}
