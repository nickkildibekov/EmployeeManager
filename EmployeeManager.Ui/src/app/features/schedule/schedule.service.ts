import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

export interface ScheduleEntry {
  id: number;
  employeeId: number;
  date: string; // ISO date
  hours: number;
  state: 'OnWork' | 'Rest' | 'Vacation' | 'Illness';
  departmentId: number;
  employeeName?: string;
  positionTitle?: string;
}

export interface ScheduleEntryPayload {
  id?: number;
  employeeId: number;
  date: string;
  hours: number;
  state: 'OnWork' | 'Rest' | 'Vacation' | 'Illness';
  departmentId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly apiUrl = '/api/Schedule';
  private httpClient = inject(HttpClient);

  getEntries(
    departmentId?: number | null,
    startDate?: string,
    endDate?: string,
    positionId?: number | null,
    state?: string
  ): Observable<ScheduleEntry[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('departmentId', String(departmentId));
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (positionId) params = params.set('positionId', String(positionId));
    if (state) params = params.set('state', state);

    return this.httpClient.get<ScheduleEntry[]>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching schedule entries:', error);
        return throwError(() => new Error('Error fetching schedule entries.'));
      })
    );
  }

  saveEntry(payload: ScheduleEntryPayload): Observable<any> {
    return this.httpClient.post(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.error('Error saving schedule entry:', error);
        return throwError(() => new Error('Error saving schedule entry.'));
      })
    );
  }

  deleteEntry(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error deleting schedule entry:', error);
        return throwError(() => new Error('Error deleting schedule entry.'));
      })
    );
  }
}
