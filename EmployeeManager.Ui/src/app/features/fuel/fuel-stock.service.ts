import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FuelStockEntry, FuelStockEntryCreate } from '../../shared/models/fuel-stock-entry.model';
import { FuelType } from '../../shared/models/fuel-payment.model';

@Injectable({
  providedIn: 'root',
})
export class FuelStockService {
  private http = inject(HttpClient);
  private apiUrl = 'api/fuelincomes';

  getAll(
    departmentId?: string | null,
    fuelType?: FuelType | null
  ): Observable<FuelStockEntry[]> {
    let params = new HttpParams();

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (fuelType !== null && fuelType !== undefined) {
      params = params.set('fuelType', fuelType.toString());
    }

    return this.http.get<FuelStockEntry[]>(this.apiUrl, { params });
  }

  create(entry: FuelStockEntryCreate): Observable<FuelStockEntry> {
    return this.http.post<FuelStockEntry>(this.apiUrl, entry);
  }
}

