export enum FuelType {
  Gasoline = 1, // Бензин
  Diesel = 2    // Дізель
}

export interface FuelPayment {
  id: string;
  departmentId: string;
  departmentName?: string;
  responsibleEmployeeId?: string | null;
  responsibleEmployeeName?: string | null;
  equipmentId: string;
  equipmentName?: string;
  entryDate: string;
  previousMileage: number;
  currentMileage: number;
  pricePerLiter: number;
  fuelType: FuelType;
  fuelTypeName: string;
  totalAmount: number;
  odometerImageUrl?: string | null;
  createdAt: string;
}

export interface FuelPaymentCreate {
  departmentId: string;
  responsibleEmployeeId?: string | null;
  equipmentId: string;
  entryDate: string;
  previousMileage: number;
  currentMileage: number;
  pricePerLiter: number;
  fuelType: FuelType;
  totalAmount: number;
}

export interface LatestFuelPayment {
  previousMileage?: number | null;
  pricePerLiter?: number | null;
}

export interface FuelPaymentListResponse {
  items: FuelPayment[];
  total: number;
}

export interface MonthlyDataPoint {
  month: string; // Format: "YYYY-MM"
  value: number;
}

export interface FuelPaymentStatistics {
  monthlyExpenses: MonthlyDataPoint[];
  monthlyConsumption: MonthlyDataPoint[]; // Пробіг в км
}
