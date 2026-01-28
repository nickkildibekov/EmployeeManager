export type ScheduleState = 'Training' | 'OnWork' | 'Rest' | 'Vacation' | 'Illness';

export interface ScheduleEntry {
  id: string;
  employeeId: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  hours: number; // Automatically calculated on save
  state: ScheduleState;
  departmentId: string;
  employeeName?: string;
  positionTitle?: string;
  departmentName?: string;
  durationHours?: number; // Computed property (for backward compatibility)
}

export interface ScheduleEntryCreate {
  employeeId: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  state: ScheduleState;
  departmentId: string;
}

export interface ScheduleEntryUpdate extends ScheduleEntryCreate {
  id: string;
}
