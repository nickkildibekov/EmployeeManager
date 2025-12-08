import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';

interface NewEmployeeData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
  departmentId: number | null;
}

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeListComponent {
  department = input.required<Department>();
  positions = input.required<Position[]>();
  isEditMode = input.required<boolean>();
  isAddFormVisible = signal<boolean>(false);

  newEmployee = signal<NewEmployeeData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: null,
  });

  onEmployeeAdded = output<NewEmployeeData>();
  onEmployeeDeleted = output<number>();

  isFormValid(): boolean {
    const data = this.newEmployee();

    return !!(
      data.firstName.trim() &&
      data.lastName.trim() &&
      data.phoneNumber.trim() &&
      data.positionId !== null
    );
  }

  resetForm() {
    this.newEmployee.set({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      positionId: null,
      departmentId: null,
    });
  }

  toggleAddForm(): void {
    this.isAddFormVisible.update((val) => !val);
  }

  cancelAdd() {
    this.resetForm();
    this.isAddFormVisible.set(false);
  }

  getPositionTitle(positionId: number | null): string {
    if (!positionId) return 'No position assigned';

    const position = this.positions().find((p) => p.id === positionId);
    return position ? position.title : 'Position not found';
  }

  addEmployee() {
    if (!this.isFormValid()) return;

    this.onEmployeeAdded.emit(this.newEmployee());

    this.resetForm();
    this.isAddFormVisible.set(false);
  }
}
