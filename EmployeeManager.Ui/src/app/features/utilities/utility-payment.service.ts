import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtilityPayment, UtilityPaymentCreate, LatestPayment, UtilityPaymentListResponse, PaymentType, UtilityPaymentStatistics, PreviousMonthPayment } from '../../shared/models/utility-payment.model';

@Injectable({
  providedIn: 'root'
})
export class UtilityPaymentService {
  private http = inject(HttpClient);
  private apiUrl = 'api/utilitypayments';

  getLatest(departmentId: string, paymentType: PaymentType, paymentMonth?: string): Observable<PreviousMonthPayment[]> {
    let url = `${this.apiUrl}/latest/${departmentId}/${paymentType}`;
    if (paymentMonth) {
      url += `?paymentMonth=${encodeURIComponent(paymentMonth)}`;
    }
    return this.http.get<PreviousMonthPayment[]>(url);
  }

  getAll(
    departmentId?: string | null,
    paymentType?: PaymentType | null,
    page: number = 1,
    pageSize: number = 10
  ): Observable<UtilityPaymentListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (paymentType !== null && paymentType !== undefined) {
      params = params.set('paymentType', paymentType.toString());
    }

    return this.http.get<UtilityPaymentListResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<UtilityPayment> {
    return this.http.get<UtilityPayment>(`${this.apiUrl}/${id}`);
  }

  getStatistics(
    paymentType: PaymentType,
    departmentId?: string | null,
    startDate?: string,
    endDate?: string
  ): Observable<UtilityPaymentStatistics> {
    let params = new HttpParams()
      .set('paymentType', paymentType.toString());

    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<UtilityPaymentStatistics>(`${this.apiUrl}/statistics`, { params });
  }

  create(payment: UtilityPaymentCreate, billImage?: File): Observable<UtilityPayment> {
    const formData = new FormData();
    
    formData.append('DepartmentId', payment.departmentId);
    if (payment.responsibleEmployeeId) {
      formData.append('ResponsibleEmployeeId', payment.responsibleEmployeeId);
    }
    formData.append('PaymentType', payment.paymentType.toString());
    
    // Helper function to format decimal numbers with dot as separator (invariant culture)
    const formatDecimal = (value: number): string => {
      // Convert to string and ensure dot is used as decimal separator
      // JavaScript numbers always use dot, but we ensure it explicitly
      const str = value.toString();
      return str.replace(',', '.');
    };

    if (payment.previousValue !== null && payment.previousValue !== undefined) {
      formData.append('PreviousValue', formatDecimal(payment.previousValue));
    }
    if (payment.currentValue !== null && payment.currentValue !== undefined) {
      formData.append('CurrentValue', formatDecimal(payment.currentValue));
    }
    if (payment.previousValueNight !== null && payment.previousValueNight !== undefined) {
      formData.append('PreviousValueNight', formatDecimal(payment.previousValueNight));
    }
    if (payment.currentValueNight !== null && payment.currentValueNight !== undefined) {
      formData.append('CurrentValueNight', formatDecimal(payment.currentValueNight));
    }
    formData.append('PricePerUnit', formatDecimal(payment.pricePerUnit));
    if (payment.pricePerUnitNight !== null && payment.pricePerUnitNight !== undefined) {
      formData.append('PricePerUnitNight', formatDecimal(payment.pricePerUnitNight));
    }
    formData.append('TotalAmount', formatDecimal(payment.totalAmount));
    formData.append('paymentMonth', payment.paymentMonth);

    if (billImage) {
      formData.append('billImage', billImage);
    }

    return this.http.post<UtilityPayment>(this.apiUrl, formData);
  }
}
