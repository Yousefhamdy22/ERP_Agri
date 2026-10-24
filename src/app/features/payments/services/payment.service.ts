import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SalesInvoiceService } from '../../invoices/services/sales-invoice.service';
import { PurchaseInvoiceService } from '../../invoices/services/purchase-invoice.service';
import {
  AllocatePaymentDto,
  AllocatePaymentResult,
  ApproveOrPostResult,
  CancelPaymentRequest,
  CancelPaymentResult,
  CreatePaymentDto,
  CreatePaymentResult,
  PAYMENT_METHOD_ORDINAL,
  PAYMENT_TYPE_ORDINAL,
  PaymentDetailDto,
  PaymentListQuery,
  PaymentListResponse,
} from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private base = `${environment.apiUrl}/payments`;

  constructor(
    private http: HttpClient,
    private salesInvoiceService: SalesInvoiceService,
    private purchaseInvoiceService: PurchaseInvoiceService,
  ) {}

  // أي إجراء يغيّر حالة/تخصيص دفعة يُغيّر أيضاً "المتبقي"/حالة السداد على فاتورة المبيعات
  // أو فاتورة التوريد المرتبطة بها — دون أن تعرف خدمتا الفواتير بحدوث ذلك أصلاً (الدفعات
  // مبنية في feature منفصل). فتفريغ الكاش هنا هو ما يجعل صفحات إدارة الفواتير تعرض
  // الأرقام المحدَّثة عند العودة إليها بدل قيمة مخزَّنة من قبل الدفعة.
  private invalidateInvoiceCaches() {
    this.salesInvoiceService.invalidateCache();
    this.purchaseInvoiceService.invalidateCache();
  }

  // CreatePaymentCommand هو positional C# record مربوط مباشرة عبر [FromBody] —
  // الـ body المتوقَّع مسطّح (BranchId/PartyId/Amount/...) بدون أي تغليف بخاصية "command".
  // محاولة تغليفه سابقاً هي ما جعلت PartyId/BranchId يصلان كـ Guid.Empty (لم يجدهما الـ
  // binder عند الجذر) فيرجع الباك ايند "Not found error". قيم enum (method/type) ما زالت
  // تُرسَل كرقم ordinal لا نص — هذا الجزء وحده كان سبب الخطأ الأصلي "$.method ... could not
  // be converted"، ويُفسّر أيضاً رسالة "command field is required" (فشل ASP.NET في بناء
  // الـ parameter المسمّى command بالكامل بسبب فشل تحويل method، فأبلغ عن الـ parameter نفسه).
  create(dto: CreatePaymentDto): Observable<CreatePaymentResult> {
    const body = {
      ...dto,
      method: PAYMENT_METHOD_ORDINAL[dto.method],
      type: PAYMENT_TYPE_ORDINAL[dto.type],
    };
    return this.http.post<CreatePaymentResult>(`${this.base}/create`, body).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  update(dto: any): Observable<PaymentDetailDto> {
    const body = {
      ...dto,
      method: PAYMENT_METHOD_ORDINAL[dto.method as keyof typeof PAYMENT_METHOD_ORDINAL],
      type: PAYMENT_TYPE_ORDINAL[dto.type as keyof typeof PAYMENT_TYPE_ORDINAL],
    };
    return this.http.post<PaymentDetailDto>(`${this.base}/update`, body).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  allocate(paymentId: string, dto: AllocatePaymentDto): Observable<AllocatePaymentResult> {
    return this.http.post<AllocatePaymentResult>(`${this.base}/${paymentId}/allocate`, dto).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  approve(paymentId: string, approvedByUserId: string): Observable<ApproveOrPostResult> {
    return this.http.post<ApproveOrPostResult>(`${this.base}/${paymentId}/approve`, { approvedByUserId }).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  post(paymentId: string, postedByUserId: string): Observable<ApproveOrPostResult> {
    return this.http.post<ApproveOrPostResult>(`${this.base}/${paymentId}/post`, { postedByUserId }).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  cancel(paymentId: string, reason: string): Observable<CancelPaymentResult> {
    const body: CancelPaymentRequest = { reason };
    return this.http.post<CancelPaymentResult>(`${this.base}/${paymentId}/cancel`, body).pipe(tap(() => this.invalidateInvoiceCaches()));
  }

  getDetail(paymentId: string): Observable<PaymentDetailDto> {
    return this.http.get<PaymentDetailDto>(`${this.base}/${paymentId}`);
  }

  getList(query: PaymentListQuery = {}): Observable<PaymentListResponse> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 10);
    if (query.branchId) params = params.set('branchId', query.branchId);
    if (query.partyId) params = params.set('partyId', query.partyId);
    if (query.status) params = params.set('status', query.status);
    if (query.method) params = params.set('method', query.method);
    if (query.type) params = params.set('type', query.type);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);
    if (query.searchText) params = params.set('searchText', query.searchText);
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortDescending != null) params = params.set('sortDescending', query.sortDescending);
    return this.http.get<PaymentListResponse>(`${this.base}/list`, { params });
  }

  // GET /payments/unallocated/party/{partyId} — مؤكَّد حياً 2026-08-02. دفعات الطرف التي لم
  // تُخصَّص (كلياً أو جزئياً) لأي فاتورة بعد — لا يوجد فلتر مكافئ لها عبر /list.
  getUnallocatedByParty(partyId: string, page = 1, pageSize = 10): Observable<PaymentListResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaymentListResponse>(`${this.base}/unallocated/party/${partyId}`, { params });
  }

  // GET /payments/party/{partyId} — مؤكَّد حياً 2026-08-02. كل دفعات طرف واحد (كل الحالات)،
  // مستخدَمة في شاشة "دفعات عميل/مورد" المخصَّصة للبحث السريع بدل /list بكل فلاترها الإضافية.
  getByParty(partyId: string, page = 1, pageSize = 10): Observable<PaymentListResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PaymentListResponse>(`${this.base}/party/${partyId}`, { params });
  }
}
