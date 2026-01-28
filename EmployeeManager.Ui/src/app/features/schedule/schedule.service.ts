import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScheduleEntry, ScheduleEntryCreate, ScheduleEntryUpdate } from '../../shared/models/schedule-entry.model';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private http = inject(HttpClient);
  private apiUrl = 'api/schedule';

  /**
   * Get schedule entries with optional filters
   */
  getEntries(params?: {
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
    positionId?: string;
    state?: string;
  }): Observable<ScheduleEntry[]> {
    let httpParams = new HttpParams();

    if (params?.departmentId) {
      httpParams = httpParams.set('departmentId', params.departmentId);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString());
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString());
    }
    if (params?.positionId) {
      httpParams = httpParams.set('positionId', params.positionId);
    }
    if (params?.state) {
      httpParams = httpParams.set('state', params.state);
    }

    return this.http.get<ScheduleEntry[]>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get schedule entries formatted for timeline view
   */
  getTimeline(params?: {
    departmentId?: string;
    startDate?: Date;
    endDate?: Date;
    positionId?: string;
    state?: string;
  }): Observable<ScheduleEntry[]> {
    let httpParams = new HttpParams();

    if (params?.departmentId) {
      httpParams = httpParams.set('departmentId', params.departmentId);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString());
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString());
    }
    if (params?.positionId) {
      httpParams = httpParams.set('positionId', params.positionId);
    }
    if (params?.state) {
      httpParams = httpParams.set('state', params.state);
    }

    return this.http.get<ScheduleEntry[]>(`${this.apiUrl}/timeline`, { params: httpParams });
  }

  /**
   * Get employees currently on shift
   */
  getCurrentShifts(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>(`${this.apiUrl}/now`);
  }

  /**
   * Create or update a schedule entry
   */
  createOrUpdate(entry: ScheduleEntryCreate | ScheduleEntryUpdate): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(this.apiUrl, entry);
  }

  /**
   * Delete a schedule entry
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
