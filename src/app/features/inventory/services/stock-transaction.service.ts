import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StockMovementDto } from '../models/stock-transaction.model';

@Injectable({ providedIn: 'root' })
export class StockTransactionService {
  private base = `${environment.apiUrl}/StockTransactions`;

  constructor(private http: HttpClient) {}

  getMovements(params: {
    productId?: string;
    warehouseId?: string;
    from?: string;
    to?: string;
  } = {}): Observable<StockMovementDto[]> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    }
    return this.http.get<StockMovementDto[]>(`${this.base}/movements`, { params: httpParams });
  }

  getValuation(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/valuation`);
  }
}
