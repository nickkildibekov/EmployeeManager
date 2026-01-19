import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../shared/models/department.model';
import { PositionCreationPayload } from '../../../shared/models/payloads';

@Component({
  selector: 'app-position-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './position-modal.component.html',
  styleUrl: './position-modal.component.css',
})
export class PositionModalComponent implements OnChanges {
  @Input() isOpen = signal(false);
  @Input() departments: Department[] = [];
  
  @Output() save = new EventEmitter<PositionCreationPayload>();
  @Output() close = new EventEmitter<void>();

  newPosition = signal<PositionCreationPayload>({
    title: '',
    departmentIds: [],
  });

  // Filter out Reserve department
  filteredDepartments = signal<Department[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departments']) {
      this.filteredDepartments.set(
        this.departments.filter(
          d => d.name !== 'Reserve' && d.name !== 'Резерв' && d.name !== 'Global Reserve'
        )
      );
    }
  }

  isFormValid(): boolean {
    const pos = this.newPosition();
    return !!(pos.title.trim() && pos.departmentIds.length > 0);
  }

  isDepartmentSelected(departmentId: string): boolean {
    return this.newPosition().departmentIds.includes(departmentId);
  }

  onTitleChange(value: string): void {
    this.newPosition.update((pos) => ({
      ...pos,
      title: value,
    }));
  }

  toggleDepartment(departmentId: string): void {
    const currentIds = [...this.newPosition().departmentIds];
    const index = currentIds.indexOf(departmentId);

    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(departmentId);
    }

    this.newPosition.update((pos) => ({
      ...pos,
      departmentIds: currentIds,
    }));
  }

  onSave(): void {
    if (this.isFormValid()) {
      this.save.emit(this.newPosition());
      this.resetForm();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.newPosition.set({
      title: '',
      departmentIds: [],
    });
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
