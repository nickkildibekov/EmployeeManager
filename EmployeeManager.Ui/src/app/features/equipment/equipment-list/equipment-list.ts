import { Component, input, output, signal } from '@angular/core';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';

interface NewEquipmentData {
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: Date;
  isWork: boolean;
  categoryId: number;
  departmentId: number;
}

@Component({
  selector: 'app-equipment-list',
  imports: [],
  templateUrl: './equipment-list.html',
  styleUrl: './equipment-list.css',
})
export class EquipmentListComponent {
  department = input.required<Department>();
  equipmentCategories = input.required<EquipmentCategory[]>();
  isEditMode = input.required<boolean>();
  isAddFormVisible = signal<boolean>(false);

  newEquipment = signal<NewEquipmentData>({
    name: '',
    description: '',
    serialNumber: '',
    purchaseDate: new Date(),
    isWork: true,
    categoryId: null,
    departmentId: null,
  });

  onEquipmentAdded = output<NewEquipmentData>();
  onEquipmentDeleted = output<number>();
}
