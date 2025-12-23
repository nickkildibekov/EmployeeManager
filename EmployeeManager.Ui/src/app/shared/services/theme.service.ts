import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';

  theme = signal<Theme>(this.getStoredTheme());
  activeTheme = signal<'light' | 'dark'>('light');

  constructor() {
    this.applyTheme(this.theme());

    effect(() => {
      const theme = this.theme();
      this.applyTheme(theme);
      localStorage.setItem(this.THEME_KEY, theme);
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.theme() === 'auto') {
          this.activeTheme.set(e.matches ? 'dark' : 'light');
          this.updateDocumentTheme();
        }
      });
    }
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY) as Theme;
    return stored || 'auto';
  }

  private applyTheme(theme: Theme): void {
    let resolvedTheme: 'light' | 'dark';

    if (theme === 'auto') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }

    this.activeTheme.set(resolvedTheme);
    this.updateDocumentTheme();
  }

  private updateDocumentTheme(): void {
    const theme = this.activeTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  toggleTheme(): void {
    const current = this.theme();
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    this.setTheme(next);
  }
}
