import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ConfirmPurchaseInvoiceDto,
  InvoiceActionResult,
  InvoiceDraftResult,
  PurchaseInvoiceDetail,
  PurchaseInvoiceListResponse,
  SavePurchaseInvoiceDraftDto,
} from '../models/invoice.model';

export interface PurchaseInvoiceListFilter {
  page?: number;
  pageSize?: number;
  status?: string;
  supplierId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  descending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PurchaseInvoiceService {
  private base = `${environment.apiUrl}/Invoices/purchase`;

  // نفس فكرة تخزين قوائم المنتجات: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة لتحميل
  // سريع عند الرجوع لنفس الصفحة، وتُفرَّغ بعد أي مسودة/تأكيد/إلغاء/حذف لأن الأرقام تتغيّر.
  private listCache = new Map<string, Observable<PurchaseInvoiceListResponse>>();

  constructor(private http: HttpClient) {}

  getList(filter: PurchaseInvoiceListFilter = {}): Observable<PurchaseInvoiceListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number | boolean);
      }
      cached = this.http.get<PurchaseInvoiceListResponse>(this.base, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getDetail(invoiceId: string): Observable<PurchaseInvoiceDetail> {
    return this.http.get<PurchaseInvoiceDetail>(`${this.base}/${invoiceId}`);
  }

  cancelInvoice(invoiceId: string): Observable<InvoiceActionResult> {
    return this.http.post<InvoiceActionResult>(`${this.base}/${invoiceId}/cancel`, {}).pipe(tap(() => this.invalidateCache()));
  }

  deleteInvoice(invoiceId: string): Observable<InvoiceActionResult> {
    return this.http.delete<InvoiceActionResult>(`${this.base}/${invoiceId}`).pipe(tap(() => this.invalidateCache()));
  }

  saveDraft(dto: SavePurchaseInvoiceDraftDto): Observable<InvoiceDraftResult> {
    return this.http.post<InvoiceDraftResult>(`${this.base}/draft`, dto).pipe(tap(() => this.invalidateCache()));
  }

  confirm(dto: ConfirmPurchaseInvoiceDto): Observable<InvoiceDraftResult> {
    return this.http.post<InvoiceDraftResult>(`${this.base}/confirm`, dto).pipe(tap(() => this.invalidateCache()));
  }

  updateInvoice(dto: any): Observable<any> {
    return this.http.put<any>(`${this.base}`, dto).pipe(tap(() => this.invalidateCache()));
  }

  // عام حتى تستطيع خدمات أخرى (مثل PaymentService) تفريغ الكاش عند تغيّر أرقام الفواتير
  // (المتبقي/الحالة) بسبب إجراء تم خارج هذه الخدمة تماماً — كتسجيل دفعة.
  invalidateCache() {
    this.listCache.clear();
  }
}
