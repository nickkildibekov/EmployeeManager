import { Employee } from './employee.model';
import { Equipment } from './equipment.model';
import { Position } from './position.model';

export interface Department {
  id: number;
  name: string;
  positions: Position[];
  employees: Employee[];
  equipments: Equipment[];
}
