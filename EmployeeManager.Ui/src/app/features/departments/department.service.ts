import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Department } from '../../shared/models/department.model';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly apiUrl = '/api/Departments/';
  private httpClient = inject(HttpClient);

  getAllDepartments(): Observable<Department[]> {
    return this.httpClient.get<Department[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error in getAllDepartments:', error);
        return throwError(() => new Error('Error to get departments!'));
      })
    );
  }

  getDepartmentById(id: string): Observable<Department> {
    return this.httpClient.get<Department>(this.apiUrl + id).pipe(
      catchError((error) => {
        console.error('Error in getDepartmentById:', error);
        return throwError(() => new Error('Error to get department with id: ' + id));
      })
    );
  }

  updateDepartment(id: string, name: string): Observable<Department> {
    const updatePayload = { id, name };
    return this.httpClient.put<Department>(this.apiUrl + id, updatePayload).pipe(
      catchError((error) => {
        console.error('Error in updateDepartment:', error);
        return throwError(() => new Error('Error updating department: ' + id));
      })
    );
  }

  createDepartment(name: string): Observable<Department> {
    const createPayload = { name };
    return this.httpClient.post<Department>(this.apiUrl, createPayload).pipe(
      catchError((error) => {
        console.error('Error in createDepartment:', error);
        return throwError(() => new Error('Error creating department'));
      })
    );
  }

  deleteDepartment(id: string): Observable<void> {
    return this.httpClient.delete<void>(this.apiUrl + id).pipe(
      catchError((error) => {
        console.error('Error in deleteDepartment:', error);
        return throwError(() => new Error('Error deleting department: ' + id));
      })
    );
  }
}
