import { Employee } from './employee.model';
import { Position } from './position.model';

export interface Department {
  id: number;
  name: string;
  description: string;
  positions: Position[];
  employees: Employee[];
}
