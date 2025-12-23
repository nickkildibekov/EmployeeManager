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
  departmentId: number | null;
}

export interface PositionUpdatePayload {
  id: number;
  title: string;
  departmentId: number;
}

export interface EquipmentCreationPayload {
  name: string;
  serialNumber: string;
  purchaseDate: string;
  isWork: boolean;
  description: string;
  categoryId: number;
  departmentId: number;
}

export interface EquipmentUpdatePayload {
  id: number;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  isWork: boolean;
  description: string;
  categoryId: number;
  departmentId: number;
}

export interface DepartmentUpdateDTO {
  id: number;
  name: string;
}
