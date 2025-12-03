import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: '../position-list/position-list.html',
  styleUrl: '../position-list/position-list.css',
})
export class PositionListComponent {
  department = input.required<Department>();
  isEditMode = input.required<boolean>();

  onPositionAdded = output<string>();
  onPositionDeleted = output<number>();

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

  deletePosition(positionId: number) {
    this.onPositionDeleted.emit(positionId);
  }
}
