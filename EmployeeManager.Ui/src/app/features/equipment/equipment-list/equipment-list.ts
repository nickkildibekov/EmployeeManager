import { Component, input, output, signal } from '@angular/core';
import { Department } from '../../../shared/models/department.model';
import { EquipmentCategory } from '../../../shared/models/equipmentCategory.model';

interface NewEquipmentData {
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  categoryId: string | null;
  departmentId: string | null;
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
    purchaseDate: '',
    status: 'Used',
    categoryId: null,
    departmentId: null,
  });

  onEquipmentAdded = output<NewEquipmentData>();
  onEquipmentDeleted = output<string>();
}
