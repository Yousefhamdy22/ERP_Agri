import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ReceiptDetail, ReceiptListResponse, ReceivePaymentCommand, UnpaidInvoice } from '../models/receive-payment.model';

export interface ReceiptListFilter {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceivePaymentService {
  private base = `${environment.apiUrl}/ReceivePayment`;

  // نفس فكرة تخزين قوائم السندات: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة، وتُفرَّغ
  // بعد أي استلام دفعة جديد لأن القائمة تتغيّر.
  private listCache = new Map<string, Observable<ReceiptListResponse>>();

  constructor(private http: HttpClient) {}

  receive(command: ReceivePaymentCommand): Observable<ReceiptDetail> {
    return this.http.post<ReceiptDetail>(`${this.base}/receive`, command).pipe(tap(() => this.invalidate()));
  }

  getList(filter: ReceiptListFilter = {}): Observable<ReceiptListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number);
      }
      cached = this.http.get<ReceiptListResponse>(`${this.base}/receipts`, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getDetail(id: string): Observable<ReceiptDetail> {
    return this.http.get<ReceiptDetail>(`${this.base}/receipts/${id}`);
  }

  getUnpaidInvoices(customerId: string): Observable<UnpaidInvoice[]> {
    return this.http.get<UnpaidInvoice[]>(`${this.base}/unpaid/${customerId}`);
  }

  private invalidate() {
    this.listCache.clear();
  }
}
