import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FuelPayment, FuelPaymentCreate, LatestFuelPayment, FuelPaymentListResponse, FuelType, FuelPaymentStatistics } from '../../shared/models/fuel-payment.model';

@Injectable({
  providedIn: 'root'
})
export class FuelPaymentService {
  private http = inject(HttpClient);
  private apiUrl = 'api/fuelpayments';

  getLatest(equipmentId: string): Observable<LatestFuelPayment> {
    return this.http.get<LatestFuelPayment>(`${this.apiUrl}/latest/${equipmentId}`);
  }

  getAll(
    departmentId?: string | null,
    fuelType?: FuelType | null,
    page: number = 1,
    pageSize: number = 10
  ): Observable<FuelPaymentListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (fuelType !== null && fuelType !== undefined) {
      params = params.set('fuelType', fuelType.toString());
    }

    return this.http.get<FuelPaymentListResponse>(this.apiUrl, { params });
  }

  getStatistics(
    departmentId?: string | null,
    startDate?: string,
    endDate?: string
  ): Observable<FuelPaymentStatistics> {
    let params = new HttpParams();

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<FuelPaymentStatistics>(`${this.apiUrl}/statistics`, { params });
  }

  create(payment: FuelPaymentCreate, odometerImage?: File): Observable<FuelPayment> {
    const formData = new FormData();
    
    formData.append('DepartmentId', payment.departmentId);
    if (payment.responsibleEmployeeId) {
      formData.append('ResponsibleEmployeeId', payment.responsibleEmployeeId);
    }
    formData.append('EquipmentId', payment.equipmentId);
    formData.append('EntryDate', payment.entryDate);
    
    // Helper function to format decimal numbers with dot as separator (invariant culture)
    const formatDecimal = (value: number): string => {
      const str = value.toString();
      return str.replace(',', '.');
    };

    formData.append('PreviousMileage', formatDecimal(payment.previousMileage));
    formData.append('CurrentMileage', formatDecimal(payment.currentMileage));
    formData.append('PricePerLiter', formatDecimal(payment.pricePerLiter));
    formData.append('FuelType', payment.fuelType.toString());
    formData.append('TotalAmount', formatDecimal(payment.totalAmount));

    if (odometerImage) {
      formData.append('odometerImage', odometerImage);
    }

    return this.http.post<FuelPayment>(this.apiUrl, formData);
  }
}
