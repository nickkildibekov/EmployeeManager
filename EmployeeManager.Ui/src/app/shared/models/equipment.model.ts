export interface Equipment {
  id: number;
  name: string;
  serialNumber?: string;
  purchaseDate: string;
  status: 'Used' | 'NotUsed' | 'Broken';
  measurement: 'Unit' | 'Meter' | 'Liter';
  amount: number;
  description: string;
  categoryId: number;
  categoryName: string;
  departmentId: number | null;
  departmentName: string | null;
  imageData?: string; // Base64-encoded image
}
