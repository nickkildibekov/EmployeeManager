import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { NewEmployeeData } from '../../../shared/models/payloads';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeListComponent {
  department = input<Department | undefined>();
  positions = input<Position[] | undefined>();
  isEditMode = input<boolean>(false);
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

    const list = this.positions() || [];
    const position = list.find((p) => p.id === positionId);
    return position ? position.title : 'Position not found';
  }

  getEmployees() {
    return this.department()?.employees || [];
  }

  addEmployee() {
    if (!this.isFormValid()) return;

    this.onEmployeeAdded.emit(this.newEmployee());

    this.resetForm();
    this.isAddFormVisible.set(false);
  }
}
