import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Equipment } from '../../shared/models/equipment.model';
import { EquipmentCategory } from '../../shared/models/equipmentCategory.model';
import { catchError, map, Observable, throwError } from 'rxjs';
import { EquipmentCreationPayload, EquipmentUpdatePayload } from '../../shared/models/payloads';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';

@Injectable({
  providedIn: 'root',
})
export class EquipmentService {
  private readonly apiUrl = '/api/Equipment/';
  private readonly categoryUrl = '/api/EquipmentCategories/';
  private httpClient = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);

  getAllEquipment(): Observable<Equipment[]> {
    return this.httpClient
      .get<Equipment[]>(this.apiUrl)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  getEquipmentByDepartment(
    departmentId: string | null,
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    status: string | null = null,
    measurement: string | null = null,
    categoryId: string | null = null,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Observable<{ items: Equipment[]; total: number }> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    if (status) {
      params = params.set('status', status);
    }

    if (measurement) {
      params = params.set('measurement', measurement);
    }

    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

    if (sortBy) {
      params = params.set('sortBy', sortBy);
      params = params.set('sortOrder', sortOrder);
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
      status: equipmentData.status,
      measurement: equipmentData.measurement,
      amount: equipmentData.amount,
      description: equipmentData.description,
      categoryId: equipmentData.categoryId,
      departmentId: equipmentData.departmentId,
      imageData: equipmentData.imageData,
      responsibleEmployeeId: equipmentData.responsibleEmployeeId,
    };
    return this.httpClient
      .post<Equipment>(this.apiUrl, payload)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  deleteEquipment(equipmentId: string): Observable<any> {
    return this.httpClient
      .delete<any>(`${this.apiUrl}${equipmentId}`, { observe: 'response' })
      .pipe(
        map((response) => {
          // If status is 204 (NoContent), equipment was deleted
          if (response.status === 204) {
            return null;
          }
          // If status is 200 (OK), equipment was moved to Reserve
          if (response.status === 200 && response.body) {
            return response.body;
          }
          return response.body;
        }),
        catchError(this.errorHandler.handleError.bind(this.errorHandler))
      );
  }

  getEquipmentById(equipmentId: string): Observable<Equipment> {
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

  getAllCategories(): Observable<EquipmentCategory[]> {
    return this.httpClient
      .get<EquipmentCategory[]>(this.categoryUrl)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  createCategory(name: string, description: string = ''): Observable<EquipmentCategory> {
    return this.httpClient
      .post<EquipmentCategory>(this.categoryUrl, { name, description })
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  deleteCategory(categoryId: string): Observable<any> {
    return this.httpClient
      .delete(`${this.categoryUrl}${categoryId}`)
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }

  updateCategory(categoryId: string, name: string, description: string = ''): Observable<EquipmentCategory> {
    return this.httpClient
      .put<EquipmentCategory>(`${this.categoryUrl}${categoryId}`, { id: categoryId, name, description })
      .pipe(catchError(this.errorHandler.handleError.bind(this.errorHandler)));
  }
}
