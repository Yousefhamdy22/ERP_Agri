import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ConfirmSalesInvoiceDto,
  InvoiceActionResult,
  SalesInvoiceDetail,
  SalesInvoiceDraftResult,
  SalesInvoiceListItem,
  SalesInvoiceListResponse,
  SaveSalesInvoiceDraftDto,
} from '../models/invoice.model';

export interface SalesInvoiceListFilter {
  page?: number;
  pageSize?: number;
  status?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  descending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SalesInvoiceService {
  private base = `${environment.apiUrl}/Invoices/sales`;

  // نفس فكرة تخزين قوائم فواتير التوريد: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة،
  // وتُفرَّغ بعد أي مسودة/تأكيد جديد لأن الأرقام تتغيّر.
  private listCache = new Map<string, Observable<SalesInvoiceListResponse>>();

  constructor(private http: HttpClient) {}

  getList(filter: SalesInvoiceListFilter = {}): Observable<SalesInvoiceListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number | boolean);
      }
      cached = this.http.get<SalesInvoiceListResponse>(this.base, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getAll(filter: { status?: string; customerId?: string } = {}): Observable<SalesInvoiceListItem[]> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    return this.http.get<SalesInvoiceListItem[]>(`${this.base}/all`, { params });
  }

  getDetail(invoiceId: string): Observable<SalesInvoiceDetail> {
    return this.http.get<SalesInvoiceDetail>(`${this.base}/${invoiceId}`);
  }

  // مؤكَّد حياً 2026-07-31: جسم مباشر بلا تغليف "command"، مع warehouseId على كل سطر ومع
  // branchId على مستوى الرأس ينجح (200). القرارات السابقة هنا (تغليف بـ command، حذف
  // warehouseId من كل سطر) كانت مبنية على أخطاء تبيَّن أنها ناتجة عن مشاكل أخرى (تغليف
  // command نفسه على الأرجح)، وليس عن warehouseId في السطر تحديداً — يُرسَل الآن كما هو
  // بلا أي تعديل على شكل الأسطر.
  saveDraft(dto: SaveSalesInvoiceDraftDto): Observable<SalesInvoiceDraftResult> {
    return this.http.post<SalesInvoiceDraftResult>(`${this.base}/draft`, dto).pipe(tap(() => this.invalidateCache()));
  }

  // مؤكَّد حياً 2026-08-01: الجسم رقم الفاتورة كنص خام (مثال: "SAL-2026-06609")، وليس JSON
  // صالحاً كائناً ({invoiceNumber}) ولا حتى نصاً مقتبَساً بالضرورة — استخدام post<T> العادي
  // (JSON.parse ضمنياً) كان يفشل بصمت أحياناً فتُعامَل استجابة 200 ناجحة فعلياً كخطأ HTTP
  // ("تعذّر تأكيد الفاتورة" رغم نجاح التأكيد الحقيقي على الباك ايند). responseType:'text' هنا
  // يتجاوز أي محاولة تحليل JSON بالكامل ويقرأ الجسم كما هو دائماً بأمان.
  confirm(dto: ConfirmSalesInvoiceDto): Observable<string> {
    return this.http.post(`${this.base}/confirm`, dto, { responseType: 'text' }).pipe(
      map(text => text.replace(/^"|"$/g, '')),
      tap(() => this.invalidateCache()),
    );
  }

  cancelInvoice(invoiceId: string, reason?: string): Observable<InvoiceActionResult> {
    return this.http.post<InvoiceActionResult>(`${this.base}/${invoiceId}/cancel`, { reason }).pipe(
      tap(() => this.invalidateCache()),
    );
  }

  deleteInvoice(invoiceId: string): Observable<InvoiceActionResult> {
    return this.http.delete<InvoiceActionResult>(`${this.base}/${invoiceId}`).pipe(
      tap(() => this.invalidateCache()),
    );
  }

  invalidateCache() {
    this.listCache.clear();
  }
}
