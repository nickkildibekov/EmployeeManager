import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { Position } from '../../shared/models/position.model';
@Injectable({
  providedIn: 'root',
})
export class PositionService {
  private readonly apiUrl = '/api/Positions/';
  private httpClient = inject(HttpClient);

  getAllPositions(): Observable<Position[]> {
    return this.httpClient.get<Position[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error in getAllPositions:', error);
        return throwError(() => new Error('Error to get positions!'));
      })
    );
  }

  getPositionsByDepartmentId(depId: number): Observable<Position[]> {
    return this.httpClient.get<Position[]>(`${this.apiUrl}ByDepartment/${depId}`).pipe(
      catchError((error) => {
        console.error('Error in getPositionsByDepartmentId:', error);
        return throwError(() => new Error('Error to get positions for department id: ' + depId));
      })
    );
  }

  addPosition(position: Position): Observable<Position> {
    return this.httpClient.post<Position>(this.apiUrl, position).pipe(
      catchError((error) => {
        return throwError(
          () => new Error('Error adding position to department: ' + position.departmentId)
        );
      })
    );
  }

  deletePosition(departmentId: number, positionId: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}${positionId}?departmentId=${departmentId}`).pipe(
      catchError((error) => {
        console.error('Error in deletePosition:', error);
        return throwError(() => new Error('Error deleting position: ' + positionId));
      })
    );
  }
}
