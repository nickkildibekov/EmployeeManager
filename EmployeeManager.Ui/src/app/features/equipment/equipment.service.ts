import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Equipment } from '../../shared/models/equipment.model';
import { catchError, map, Observable, throwError } from 'rxjs';
import { EquipmentCreationPayload, EquipmentUpdatePayload } from '../../shared/models/payloads';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';

@Injectable({
  providedIn: 'root',
})
export class EquipmentService {
  private readonly apiUrl = '/api/Equipment/';
  private httpClient = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);

  getAllEquipment(): Observable<Equipment[]> {
    return this.httpClient
      .get<Equipment[]>(this.apiUrl)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  getEquipmentByDepartment(
    departmentId: number,
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    isWork: boolean | null = null
  ): Observable<{ items: Equipment[]; total: number }> {
    let params = new HttpParams()
      .set('departmentId', String(departmentId))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    if (isWork !== null && isWork !== undefined) {
      params = params.set('isWork', String(isWork));
    }

    return this.httpClient
      .get<{ items: Equipment[]; total: number }>(this.apiUrl, { params })
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  addEquipment(equipmentData: EquipmentCreationPayload): Observable<Equipment> {
    const payload: EquipmentCreationPayload = {
      name: equipmentData.name,
      serialNumber: equipmentData.serialNumber,
      purchaseDate: equipmentData.purchaseDate,
      isWork: equipmentData.isWork,
      description: equipmentData.description,
      categoryId: equipmentData.categoryId,
      departmentId: equipmentData.departmentId,
    };
    return this.httpClient
      .post<Equipment>(this.apiUrl, payload)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  deleteEquipment(equipmentId: number): Observable<any> {
    return this.httpClient
      .delete(`${this.apiUrl}${equipmentId}`)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  getEquipmentById(equipmentId: number): Observable<Equipment> {
    return this.httpClient
      .get<Equipment>(`${this.apiUrl}${equipmentId}`)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  updateEquipment(equipmentData: EquipmentUpdatePayload): Observable<Equipment> {
    return this.httpClient.put<Equipment>(`${this.apiUrl}${equipmentData.id}`, equipmentData).pipe(
      map((res) => res || (equipmentData as unknown as Equipment)),
      catchError(this.errorHandler.handleError.bind(this.errorHandler))
    );
  }
}
