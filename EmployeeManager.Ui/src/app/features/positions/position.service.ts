import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, map } from 'rxjs';
import { Position } from '../../shared/models/position.model';
import { PositionCreationPayload, PositionUpdatePayload } from '../../shared/models/payloads';

@Injectable({
  providedIn: 'root',
})
export class PositionService {
  private readonly apiUrl = '/api/Positions/';
  private httpClient = inject(HttpClient);

  getAllPositions(): Observable<Position[]> {
    return this.httpClient.get<Position[]>(`${this.apiUrl}all`).pipe(
      catchError((error) => {
        console.error('Error in getAllPositions:', error);
        return throwError(() => new Error('Error to get positions!'));
      })
    );
  }

  getPositionsByDepartmentId(depId: number): Observable<Position[]> {
    // Backend filters positions via query params on the main endpoint
    return this.httpClient
      .get<{ items: Position[]; total: number }>(`${this.apiUrl}?departmentId=${depId}&page=1&pageSize=100`)
      .pipe(
        map((res) => res.items || []),
        catchError((error) => {
          console.error('Error in getPositionsByDepartmentId:', error);
          return throwError(() => new Error('Error to get positions for department id: ' + depId));
        })
      );
  }

  getPositionsByDepartmentIdWithPagination(
    departmentId: number,
    page: number = 1,
    pageSize: number = 10,
    search: string = ''
  ): Observable<{ items: Position[]; total: number }> {
    let params = new HttpParams()
      .set('departmentId', String(departmentId))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.httpClient.get<{ items: Position[]; total: number }>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching positions by department:', error);
        const message = error.error?.message || 'Error fetching positions.';
        return throwError(() => new Error(message));
      })
    );
  }

  addPosition(positionData: PositionCreationPayload): Observable<Position> {
    const payload = {
      title: positionData.title,
      departmentIds: positionData.departmentIds,
    };
    return this.httpClient.post<Position>(this.apiUrl, payload).pipe(
      catchError((error) => {
        return throwError(() => new Error('Error adding position'));
      })
    );
  }

  deletePosition(positionId: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}${positionId}`).pipe(
      catchError((error) => {
        console.error('Error in deletePosition:', error);
        return throwError(() => new Error('Error deleting position: ' + positionId));
      })
    );
  }

  getPosition(id: number): Observable<Position> {
    return this.httpClient.get<Position>(this.apiUrl + id).pipe(
      catchError((error) => {
        console.error('Error in getPosition:', error);
        return throwError(() => new Error('Error fetching position with id: ' + id));
      })
    );
  }

  updatePosition(positionData: PositionUpdatePayload): Observable<Position> {
    return this.httpClient.put<Position>(this.apiUrl + positionData.id, positionData).pipe(
      catchError((error) => {
        console.error('Error in updatePosition:', error);
        const errorMessage = error.error?.message || 'Error updating position.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
