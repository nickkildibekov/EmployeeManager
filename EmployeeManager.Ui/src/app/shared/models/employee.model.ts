export interface Employee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  callSign: string;
  phoneNumber: string;
  birthDate?: string | null;
  positionId: string | null;
  positionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  specializationId: string;
  specializationName: string | null;
}
