import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Specialization } from '../../shared/models/specialization.model';

@Injectable({
  providedIn: 'root',
})
export class SpecializationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/Specializations';

  getAllSpecializations(): Observable<Specialization[]> {
    return this.http.get<Specialization[]>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Помилка при завантаженні спеціальностей';
        return throwError(() => new Error(message));
      })
    );
  }

  getSpecializationById(id: string): Observable<Specialization> {
    return this.http.get<Specialization>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Помилка при завантаженні спеціальності';
        return throwError(() => new Error(message));
      })
    );
  }

  createSpecialization(name: string): Observable<Specialization> {
    return this.http.post<Specialization>(this.apiUrl, { name }).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Помилка при створенні спеціальності';
        return throwError(() => new Error(message));
      })
    );
  }

  updateSpecialization(id: string, name: string): Observable<Specialization> {
    return this.http.put<Specialization>(`${this.apiUrl}/${id}`, { name }).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Помилка при оновленні спеціальності';
        return throwError(() => new Error(message));
      })
    );
  }

  deleteSpecialization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Помилка при видаленні спеціальності';
        return throwError(() => new Error(message));
      })
    );
  }
}
