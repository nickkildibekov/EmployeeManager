import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Specialization } from '../../shared/models/specialization.model';

@Injectable({
  providedIn: 'root',
})
export class SpecializationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/Specializations';

  getAllSpecializations(): Observable<Specialization[]> {
    return this.http.get<Specialization[]>(this.apiUrl);
  }

  getSpecializationById(id: number): Observable<Specialization> {
    return this.http.get<Specialization>(`${this.apiUrl}/${id}`);
  }
}
