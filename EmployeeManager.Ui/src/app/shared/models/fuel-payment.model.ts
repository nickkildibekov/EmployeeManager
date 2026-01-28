export enum FuelType {
  Gasoline = 1, // Бензин
  Diesel = 2    // Дізель
}

export interface FuelPayment {
  transactionId?: string;
  id: string;
  transactionType?: 'Expense' | 'Income';
  departmentId: string;
  departmentName?: string;
  responsibleEmployeeId?: string | null;
  responsibleEmployeeName?: string | null;
  equipmentId: string;
  equipmentName?: string;
  entryDate: string;
  previousMileage: number;
  currentMileage: number;
  fuelType: FuelType;
  fuelTypeName: string;
  totalAmount: number;
  fuelAmount?: number; // Кількість палива (для Expense - витрачене, для Income - додане)
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
  fuelType: FuelType;
  totalAmount: number;
  // Optional extended fields for richer fuel accounting
  consumptionPer100km?: number | null;
  fuelUsed?: number | null;
}

export interface LatestFuelPayment {
  previousMileage?: number | null;
  fuelBalance?: number | null;
}

export interface FuelTransaction {
  id: string;
  departmentId: string;
  departmentName?: string;
  type: FuelType;
  fuelTypeName: string;
  amount: number;
  relatedId: string;
  entryDate: string;
  createdAt: string;
}

export interface FuelPaymentListResponse {
  items: FuelPayment[];
  total: number;
}

export interface FuelTransactionListResponse {
  items: FuelTransaction[];
  total: number;
}

export interface DailyDataPoint {
  date: string; // Format: "YYYY-MM-DD"
  value: number;
}

export interface FuelPaymentStatistics {
  dailyExpenses: DailyDataPoint[];
  dailyConsumption: DailyDataPoint[]; // Пробіг в км
}
