import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { getPositionDisplayName } from '../../../shared/utils/display.utils';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: '../position-list/position-list.html',
  styleUrl: '../position-list/position-list.css',
})
export class PositionListComponent {
  department = input<Department | undefined>();
  positions = input<Position[] | undefined>();
  isEditMode = input<boolean>(false);

  onPositionAdded = output<string>();
  onPositionDeleted = output<string>();

  showAddForm = signal(false);
  newPositionTitle = signal('');

  toggleAddMode(): void {
    this.showAddForm.update((val) => !val);
  }

  addPosition() {
    const title = this.newPositionTitle().trim();
    if (!title) return;

    this.onPositionAdded.emit(title);

    this.showAddForm.set(false);
    this.newPositionTitle.set('');
  }

  deletePosition(positionId: string) {
    this.onPositionDeleted.emit(positionId);
  }

  getDisplayPositions() {
    return this.positions() || this.department()?.positions || [];
  }

  // Check if position is Unemployed (cannot be deleted)
  isUnemployedPosition(title: string): boolean {
    return title === 'Unemployed' || title === 'Без Посади';
  }

  getPositionDisplayName(title: string): string {
    return getPositionDisplayName(title);
  }
}
