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
  departmentId: number;
  departmentName: string;
  imageData?: string; // Base64-encoded image
}
