import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);

  cycleTheme(): void {
    this.themeService.toggleTheme();
  }

  getThemeIcon(): string {
    const theme = this.themeService.theme();
    return {
      light: '☀️',
      dark: '🌙',
      auto: '🌓',
    }[theme];
  }

  getNextTheme(): string {
    const current = this.themeService.theme();
    return current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
  }

  getCurrentThemeLabel(): string {
    const theme = this.themeService.theme();
    return {
      light: 'Світла тема',
      dark: 'Темна тема',
      auto: 'Автоматична тема (системна)',
    }[theme];
  }
}
