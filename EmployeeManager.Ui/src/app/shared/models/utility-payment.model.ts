export enum PaymentType {
  Electricity = 1,
  Gas = 2,
  Water = 3,
  Rent = 4
}

export interface UtilityPayment {
  id: string;
  departmentId: string;
  departmentName?: string;
  responsibleEmployeeId?: string | null;
  responsibleEmployeeName?: string | null;
  paymentType: PaymentType;
  paymentTypeName: string;
  previousValue?: number | null;
  currentValue?: number | null;
  previousValueNight?: number | null;
  currentValueNight?: number | null;
  pricePerUnit: number;
  pricePerUnitNight?: number | null;
  totalAmount: number;
  billImageUrl?: string | null;
  paymentMonth: string;
  createdAt: string;
}

export interface UtilityPaymentCreate {
  departmentId: string;
  responsibleEmployeeId?: string | null;
  paymentType: PaymentType;
  previousValue?: number | null;
  currentValue?: number | null;
  previousValueNight?: number | null;
  currentValueNight?: number | null;
  pricePerUnit: number;
  pricePerUnitNight?: number | null;
  totalAmount: number;
  paymentMonth: string;
}

export interface LatestPayment {
  previousValue?: number | null;
  previousValueNight?: number | null;
  pricePerUnit?: number | null;
}

export interface PreviousMonthPayment {
  id: string;
  previousValue?: number | null;
  currentValue?: number | null;
  previousValueNight?: number | null;
  currentValueNight?: number | null;
  pricePerUnit: number;
  pricePerUnitNight?: number | null;
  paymentMonth: string;
  createdAt: string;
  displayText: string;
}

export interface UtilityPaymentListResponse {
  items: UtilityPayment[];
  total: number;
}

export interface MonthlyDataPoint {
  month: string; // Format: "YYYY-MM"
  value: number;
}

export interface UtilityPaymentStatistics {
  monthlyExpenses: MonthlyDataPoint[];
  monthlyConsumption: MonthlyDataPoint[];
}
