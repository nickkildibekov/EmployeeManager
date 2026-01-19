export interface Equipment {
  id: string;
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: string;
  categoryName: string;
  departmentId: string | null;
  departmentName: string | null;
  imageData?: string; // Base64-encoded image
  responsibleEmployeeId?: string | null;
  responsibleEmployeeName?: string | null;
}
