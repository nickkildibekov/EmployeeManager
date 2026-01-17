export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
  positionName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  specializationId: number;
  specializationName: string | null;
}
