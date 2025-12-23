import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { Employee } from '../../shared/models/employee.model';
import { NewEmployeeData, EmployeeUpdateData } from '../../shared/models/payloads';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly apiUrl = '/api/Employees/';
  private httpClient = inject(HttpClient);

  addEmployee(employeeData: NewEmployeeData): Observable<Employee> {
    const payload = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      phoneNumber: employeeData.phoneNumber,
      positionId: employeeData.positionId,
      departmentId: employeeData.departmentId,
    };

    return this.httpClient.post<Employee>(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.error('Error in addEmployee:', error);
        const errorMessage = error.error?.message || 'Error adding employee.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteEmployee(employeeId: number): Observable<any> {
    return this.httpClient.delete(this.apiUrl + employeeId).pipe(
      catchError((error) => {
        console.error('Error in deleteEmployee:', error);
        return throwError(() => new Error('Error deleting employee: ' + employeeId));
      })
    );
  }

  getEmployeesByDepartment(
    departmentId: number,
    page: number = 1,
    pageSize: number = 10,
    search: string = ''
  ): Observable<{ items: Employee[]; total: number }> {
    let params = new HttpParams()
      .set('departmentId', String(departmentId))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.httpClient
      .get<{ items: Employee[]; total: number }>(this.apiUrl, { params })
      .pipe(
        catchError((error) => {
          console.error('Error fetching employees by department:', error);
          const message = error.error?.message || 'Error fetching employees.';
          return throwError(() => new Error(message));
        })
      );
  }

  getEmployee(id: number): Observable<Employee> {
    return this.httpClient.get<Employee>(this.apiUrl + id).pipe(
      catchError((error) => {
        console.error('Error in getEmployee:', error);
        return throwError(() => new Error('Error fetching employee with id: ' + id));
      })
    );
  }

  updateEmployee(employeeData: EmployeeUpdateData): Observable<Employee> {
    return this.httpClient.put<Employee>(this.apiUrl + employeeData.id, employeeData).pipe(
      catchError((error) => {
        console.error('Error in updateEmployee:', error);
        const errorMessage = error.error?.message || 'Error updating employee.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
