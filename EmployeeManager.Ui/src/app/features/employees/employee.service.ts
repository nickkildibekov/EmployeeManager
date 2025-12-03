import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { Employee } from '../../shared/models/employee.model';

interface EmployeeCreationPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  positionId: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly apiUrl = '/api/Employees/';
  private httpClient = inject(HttpClient);

  addEmployee(departmentId: number, employeeData: EmployeeCreationPayload): Observable<Employee> {
    const payload = {
      ...employeeData,
      departmentId: departmentId,
    };
    return this.httpClient.post<Employee>(this.apiUrl, payload).pipe(
      catchError((error) => {
        console.error('Error in addEmployeeToDepartment:', error);
        return throwError(() => new Error('Error adding employee.'));
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
}
