import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Equipment } from '../../shared/models/equipment.model';
import { catchError, Observable, throwError } from 'rxjs';
import { EquipmentCreationPayload } from '../../shared/models/payloads';

@Injectable({
  providedIn: 'root',
})
export class EquipmentService {
  private readonly apiUrl = '/api/Equipment/';
  private httpClient = inject(HttpClient);

  getAllEquipment(): Observable<Equipment[]> {
    return this.httpClient.get<Equipment[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error in getAllEquipment:', error);
        return throwError(() => new Error('Error to get equipment!'));
      })
    );
  }

  getEquipmentByDepartment(
    departmentId: number,
    page: number = 1,
    pageSize: number = 10,
    search: string = ''
  ): Observable<{ items: Equipment[]; total: number }> {
    let params = new HttpParams()
      .set('departmentId', String(departmentId))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.httpClient.get<{ items: Equipment[]; total: number }>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching equipment by department:', error);
        const message = error.error?.message || 'Error fetching equipment.';
        return throwError(() => new Error(message));
      })
    );
  }

  addEquipment(equipmentData: EquipmentCreationPayload): Observable<Equipment> {
    const payload = {
      name: equipmentData.name,
      departmentId: equipmentData.departmentId,
    };
    return this.httpClient.post<Equipment>(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.error('Error adding equipment:', error);
        return throwError(() => new Error('Error adding equipment'));
      })
    );
  }

  deleteEquipment(equipmentId: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}${equipmentId}`).pipe(
      catchError((error) => {
        console.error('Error deleting equipment:', error);
        return throwError(() => new Error('Error deleting equipment: ' + equipmentId));
      })
    );
  }
}
