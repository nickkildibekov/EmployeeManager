import { FuelType } from './fuel-payment.model';

export interface FuelStockEntry {
  id: string;
  departmentId: string;
  departmentName?: string | null;
  receiverEmployeeId?: string | null;
  receiverEmployeeName?: string | null;
  fuelType: FuelType;
  fuelTypeName: string;
  amount: number;
  transactionDate: string;
  createdAt: string;
}

export interface FuelStockEntryCreate {
  departmentId: string;
  receiverEmployeeId?: string | null;
  fuelType: FuelType;
  amount: number;
  transactionDate: string;
}

