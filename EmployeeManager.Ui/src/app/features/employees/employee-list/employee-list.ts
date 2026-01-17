import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Department } from '../../../shared/models/department.model';
import { Position } from '../../../shared/models/position.model';
import { Specialization } from '../../../shared/models/specialization.model';
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
  specializations = input<Specialization[] | undefined>();
  isEditMode = input<boolean>(false);
  isAddFormVisible = signal<boolean>(false);

  newEmployee = signal<NewEmployeeData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    positionId: null,
    departmentId: null,
    specializationId: 0,
  });

  onEmployeeAdded = output<NewEmployeeData>();
  onEmployeeDeleted = output<number>();

  isFormValid(): boolean {
    const data = this.newEmployee();

    return !!(
      data.firstName.trim() &&
      data.lastName.trim() &&
      data.phoneNumber.trim() &&
      data.specializationId > 0
    );
  }

  resetForm() {
    const defaultSpecId = this.specializations() && this.specializations()!.length > 0 
      ? this.specializations()![0].id 
      : 0;
    this.newEmployee.set({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      positionId: null,
      departmentId: null,
      specializationId: defaultSpecId,
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
    if (!positionId) return 'Посада не призначена';

    const list = this.positions() || [];
    const position = list.find((p) => p.id === positionId);
    return position ? position.title : 'Посаду не знайдено';
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
