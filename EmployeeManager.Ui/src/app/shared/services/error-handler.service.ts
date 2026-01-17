import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface AppError {
  message: string;
  statusCode?: number;
  details?: any;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  handleError(error: HttpErrorResponse): Observable<never> {
    const appError: AppError = {
      message: 'An unexpected error occurred',
      statusCode: error.status,
    };

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      appError.message = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      appError.message = error.error?.message || this.getStatusMessage(error.status);
      appError.details = error.error;
    }

    console.error('HTTP Error:', appError);
    return throwError(() => appError);
  }

  private getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. The resource may have been modified or already exists.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Unexpected error (${status}). Please try again.`;
    }
  }
}
