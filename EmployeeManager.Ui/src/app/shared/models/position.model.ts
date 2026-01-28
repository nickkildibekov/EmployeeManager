export interface Position {
  id: string;
  title: string;
  departments?: Array<{ id: string; name: string }>;
}

export interface PositionUpdatePayload {
  id: string;
  title: string;
  departmentIds: string[];
}
