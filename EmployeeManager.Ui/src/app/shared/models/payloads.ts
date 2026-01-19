/**
 * Shared DTO/Payload interfaces for API requests
 */

export interface NewEmployeeData {
  firstName: string;
  lastName: string;
  callSign?: string | null;
  phoneNumber: string;
  birthDate?: string | null;
  positionId: string | null;
  departmentId: string | null;
  specializationId: string;
}

export interface EmployeeUpdateData {
  id: string;
  firstName: string;
  lastName: string;
  callSign?: string | null;
  phoneNumber: string;
  birthDate?: string | null;
  positionId: string | null;
  departmentId: string | null;
  specializationId: string;
}

export interface PositionCreationPayload {
  title: string;
  departmentIds: string[];
}

export interface PositionUpdatePayload {
  id: string;
  title: string;
  departmentIds: string[];
}

export interface EquipmentCreationPayload {
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: string;
  departmentId: string | null;
  imageData?: string; // Base64-encoded image (optional)
  responsibleEmployeeId?: string | null;
}

export interface EquipmentUpdatePayload {
  id: string;
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: string;
  departmentId: string | null;
  imageData?: string; // Base64-encoded image (optional)
  responsibleEmployeeId?: string | null;
}

export interface DepartmentUpdateDTO {
  id: string;
  name: string;
}
