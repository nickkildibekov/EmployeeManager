/**
 * Shared DTO/Payload interfaces for API requests
 */

export interface NewEmployeeData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
  departmentId: number | null;
}

export interface EmployeeUpdateData {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
  departmentId: number;
}

export interface PositionCreationPayload {
  title: string;
  departmentIds: number[];
}

export interface PositionUpdatePayload {
  id: number;
  title: string;
  departmentIds: number[];
}

export interface EquipmentCreationPayload {
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: number;
  departmentId: number | null;
}

export interface EquipmentUpdatePayload {
  id: number;
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: number;
  departmentId: number | null;
}

export interface DepartmentUpdateDTO {
  id: number;
  name: string;
}
