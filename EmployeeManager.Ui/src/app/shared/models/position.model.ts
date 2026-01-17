export interface Position {
  id: number;
  title: string;
  departments?: Array<{ id: number; name: string }>;
}

export interface PositionUpdatePayload {
  id: number;
  title: string;
  departmentIds: number[];
}
