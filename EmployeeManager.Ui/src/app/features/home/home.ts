import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface HomeTile {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  tiles: HomeTile[] = [
    {
      title: 'Відділи',
      description: 'Управління відділами та їх структурою',
      icon: '🏢',
      route: '/departments',
      color: 'var(--primary)',
    },
    {
      title: 'Співробітники',
      description: 'Перегляд та управління інформацією про співробітників',
      icon: '👥',
      route: '/employees',
      color: 'var(--success)',
    },
    {
      title: 'Посади',
      description: 'Управління посадами та ролями',
      icon: '💼',
      route: '/positions',
      color: 'var(--info)',
    },
    {
      title: 'Обладнання',
      description: 'Відстеження та управління інвентарем обладнання',
      icon: '🔧',
      route: '/equipment',
      color: 'var(--warning)',
    },
    {
      title: 'Комуналка/Паливо',
      description: 'Облік комунальних послуг та витрат на паливо',
      icon: '⚡',
      route: '/utilities',
      color: '#ff6b6b',
    },
    {
      title: 'Графік',
      description: 'Управління робочим графіком та розкладом',
      icon: '📅',
      route: '#',
      color: '#4ecdc4',
    },
    {
      title: 'Планувальник завдань',
      description: 'Створення та відстеження виконання завдань',
      icon: '📋',
      route: '#',
      color: '#95e1d3',
    },
    {
      title: 'База знань',
      description: 'Централізоване сховище документації та інформації',
      icon: '📚',
      route: '#',
      color: '#a8e6cf',
    },
  ];
}
