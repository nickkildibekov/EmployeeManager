import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Equipment } from './equipment/equipment';
import { catchError, Observable, throwError } from 'rxjs';

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
}
