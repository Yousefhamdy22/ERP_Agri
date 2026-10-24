import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ApproveVoucherResult,
  CreateBankTransferDto,
  CreateCashPaymentDto,
  CreateCashReceiptDto,
  CreateCheckReceiptDto,
  CreateVoucherResult,
  CreateWalletPaymentDto,
  CreateWalletReceiptDto,
  CreateWalletVoucherResult,
  PaymentVoucherDetail,
  PaymentVoucherJournalEntry,
  PaymentVoucherListItem,
  PaymentVoucherListResponse,
  VoucherStatus,
  VoucherType,
} from '../models/payment-voucher.model';

export interface PaymentVoucherListFilter {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  partyId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  descending?: boolean;
}

// مؤكَّد حياً 2026-08-10 (لقطة شاشة + عدة رسائل سابقة): type/status يصلان أرقاماً خاماً من
// الباك ايند (مثلاً type=2, status=2) لا نصوصاً كما كان مفترَضاً — النموذج الداخلي في هذا
// الملف يبقى نصياً (أوضح فيما تبقى من الكود)، فتُطبَّع القيم الرقمية هنا فقط عند وصولها بدل
// نشر هذا التطبيع في كل مكان يقرأ type/status. type الرقمي (Payment=1/Receipt=2) لا يميّز
// نقدي/شيك/تحويل — أقرب تمثيل مُتاح هو النوع النقدي المكافئ (CashPayment/CashReceipt).
const VOUCHER_TYPE_NUMERIC_MAP: Record<number, VoucherType> = {
  1: 'CashPayment',
  2: 'CashReceipt',
};

const VOUCHER_STATUS_NUMERIC_MAP: Record<number, VoucherStatus> = {
  1: 'New',
  2: 'Posted',
  3: 'Cancelled',
  4: 'Approved',
};

function normalizeVoucherType(raw: unknown): VoucherType {
  if (typeof raw === 'number') return VOUCHER_TYPE_NUMERIC_MAP[raw] ?? (String(raw) as VoucherType);
  return raw as VoucherType;
}

function normalizeVoucherStatus(raw: unknown): VoucherStatus {
  if (typeof raw === 'number') return VOUCHER_STATUS_NUMERIC_MAP[raw] ?? (String(raw) as VoucherStatus);
  return raw as VoucherStatus;
}

function normalizeListItem(item: PaymentVoucherListItem): PaymentVoucherListItem {
  return { ...item, type: normalizeVoucherType(item.type), status: normalizeVoucherStatus(item.status) };
}

// حقل عدد السجلات الإجمالي غير مؤكَّد الاسم (total مقابل totalCount — نفس اختلاف شُوهد سابقاً
// بين نقاط أخرى في نفس الباك ايند، مثل opening_balances/list). يُقبَل أي منهما بدل الاعتماد
// على اسم واحد يُنتج "undefined" لو كان الاسم الفعلي مختلفاً.
interface RawPaymentVoucherListResponse extends Omit<PaymentVoucherListResponse, 'total'> {
  total?: number;
  totalCount?: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentVoucherService {
  private base = `${environment.apiUrl}/PaymentVouchers`;

  // نفس فكرة تخزين قوائم الفواتير: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة،
  // وتُفرَّغ بعد أي سند جديد أو اعتماد/ترحيل لأن الأرقام تتغيّر.
  private listCache = new Map<string, Observable<PaymentVoucherListResponse>>();

  constructor(private http: HttpClient) {}

  createCashReceipt(dto: CreateCashReceiptDto): Observable<CreateVoucherResult> {
    return this.http.post<CreateVoucherResult>(`${this.base}/create-cash-receipt`, dto).pipe(tap(() => this.invalidate()));
  }

  createCashPayment(dto: CreateCashPaymentDto): Observable<CreateVoucherResult> {
    return this.http.post<CreateVoucherResult>(`${this.base}/create-cash-payment`, dto).pipe(tap(() => this.invalidate()));
  }

  createCheckReceipt(dto: CreateCheckReceiptDto): Observable<CreateVoucherResult> {
    return this.http.post<CreateVoucherResult>(`${this.base}/create-check-receipt`, dto).pipe(tap(() => this.invalidate()));
  }

  createBankTransfer(dto: CreateBankTransferDto): Observable<CreateVoucherResult> {
    return this.http.post<CreateVoucherResult>(`${this.base}/create-bank-transfer`, dto).pipe(tap(() => this.invalidate()));
  }

  // POST /PaymentVouchers/create-wallet-payment|receipt — محافظ إلكترونية (بطلب المستخدم
  // 2026-08-15). خلافاً للأربعة أعلاه، الاستجابة Guid خام (معرّف السند) لا {voucherId,voucherNumber}.
  createWalletPayment(dto: CreateWalletPaymentDto): Observable<CreateWalletVoucherResult> {
    return this.http.post<CreateWalletVoucherResult>(`${this.base}/create-wallet-payment`, dto).pipe(tap(() => this.invalidate()));
  }

  createWalletReceipt(dto: CreateWalletReceiptDto): Observable<CreateWalletVoucherResult> {
    return this.http.post<CreateWalletVoucherResult>(`${this.base}/create-wallet-receipt`, dto).pipe(tap(() => this.invalidate()));
  }

  getList(filter: PaymentVoucherListFilter = {}): Observable<PaymentVoucherListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number | boolean);
      }
      cached = this.http.get<RawPaymentVoucherListResponse>(this.base, { params }).pipe(
        map(r => ({
          ...r,
          items: r.items.map(normalizeListItem),
          total: r.total ?? r.totalCount ?? r.items.length,
        } satisfies PaymentVoucherListResponse)),
        shareReplay(1),
      );
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getDetail(voucherId: string): Observable<PaymentVoucherDetail> {
    return this.http.get<PaymentVoucherDetail>(`${this.base}/${voucherId}`).pipe(
      map(d => ({ ...d, type: normalizeVoucherType(d.type), status: normalizeVoucherStatus(d.status) })),
    );
  }

  // POST /PaymentVouchers/approve — استبدل POST /{voucherId}/approve القديم (مؤكَّد من
  // المستخدم 2026-08-09). voucherId يُرسَل في الجسم صراحة الآن بدل مسار الرابط.
  approve(voucherId: string, approvedByUserId: string): Observable<ApproveVoucherResult> {
    return this.http.post<ApproveVoucherResult>(`${this.base}/approve`, { voucherId, approvedByUserId })
      .pipe(tap(() => this.invalidate()));
  }

  // POST /PaymentVouchers/post — استبدل POST /{voucherId}/post القديم. يرفض أي سند ليس
  // Approved برسالة "Voucher must be approved before posting" — يتطلب fiscalPeriodId
  // (خلافاً لنقطة approve أعلاه).
  post(paymentVoucherId: string, fiscalPeriodId: string, userId: string): Observable<PaymentVoucherJournalEntry> {
    return this.http.post<PaymentVoucherJournalEntry>(`${this.base}/post`, { paymentVoucherId, fiscalPeriodId, userId })
      .pipe(tap(() => this.invalidate()));
  }

  // POST /PaymentVouchers/cancel/{voucherId}?userId={userId} — يُرجع Guid لسند العكس
  // (reversal voucher) المُنشأ تلقائياً. غير مؤكَّد حياً بعد على هذا الباك ايند تحديداً؛
  // مبني حسب المواصفة المُعطاة.
  cancel(voucherId: string, userId: string): Observable<string> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<string>(`${this.base}/cancel/${voucherId}`, {}, { params }).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.listCache.clear();
  }
}
