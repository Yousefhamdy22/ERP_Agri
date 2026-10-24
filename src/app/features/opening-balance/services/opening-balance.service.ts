import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ConfirmSingleOpeningBalanceResult,
  RevertSingleOpeningBalanceResult,
  CreateBankOpeningBalanceDto,
  CreateCustomerOpeningBalanceDto,
  CreateInventoryOpeningBalanceDto,
  CreateManualOpeningBalanceDto,
  CreateSupplierOpeningBalanceDto,
  UpdateOpeningBalanceDto,
  OpeningBalanceImportResult,
  OpeningBalanceListItem,
  OpeningBalanceListResponse,
  OpeningBalanceStatus,
} from '../models/opening-balance.model';
import { OpeningBalanceCategory, OpeningBalanceSource, NORMAL_BALANCE_VALUES } from '../../../shared/models/accounting-enums.model';

// شكل الاستجابة الخام كما يعيده الباك ايند فعلياً — حقل العدد الإجمالي اسمه totalCount
// وليس total. تغليف {$id,$values} المحتمل (ReferenceHandler.Preserve في .NET) يُفكّ عالمياً
// في dotnetJsonNormalizeInterceptor قبل وصول الاستجابة هنا، فـ items مصفوفة عادية دائماً.
interface RawOpeningBalanceListResponse {
  items: OpeningBalanceListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// مطابق حرفياً لمعاملات GET /api/opening_balances/list الحقيقية (كونترولر + Swagger،
// مؤكَّد حياً 2026-07-18) — balanceType هنا هو OpeningBalanceCategory (تصنيف حساب، 10 قيم)
// رغم أن اسم المعامل نفسه "balanceType"؛ لا علاقة له بحقل balanceType (مدين/دائن) في كل صف.
export interface OpeningBalanceListFilter {
  page?: number;
  pageSize?: number;
  fiscalPeriodId?: string;
  branchId?: string;
  accountId?: string;
  accountCode?: string;
  search?: string;
  balanceType?: OpeningBalanceCategory;
  status?: OpeningBalanceStatus;
  source?: OpeningBalanceSource;
  minAmount?: number;
  maxAmount?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortAscending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OpeningBalanceService {
  private base = `${environment.apiUrl}/opening_balances`;

  // نفس نمط باقي الخدمات: قوائم مخزَّنة حسب تركيبة الفلتر، تُفرَّغ بعد أي إضافة/حذف.
  private listCache = new Map<string, Observable<OpeningBalanceListResponse>>();

  constructor(private http: HttpClient) {}

  getList(filter: OpeningBalanceListFilter = {}): Observable<OpeningBalanceListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams()
        .set('page', filter.page ?? 1)
        .set('pageSize', filter.pageSize ?? 10)
        .set('sortBy', filter.sortBy ?? 'date')
        .set('sortAscending', String(filter.sortAscending ?? false));
      if (filter.fiscalPeriodId) params = params.set('fiscalPeriodId', filter.fiscalPeriodId);
      if (filter.branchId) params = params.set('branchId', filter.branchId);
      if (filter.accountId) params = params.set('accountId', filter.accountId);
      if (filter.accountCode) params = params.set('accountCode', filter.accountCode);
      if (filter.search) params = params.set('search', filter.search);
      if (filter.balanceType) params = params.set('balanceType', filter.balanceType);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.source) params = params.set('source', filter.source);
      if (filter.minAmount != null) params = params.set('minAmount', filter.minAmount);
      if (filter.maxAmount != null) params = params.set('maxAmount', filter.maxAmount);
      if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
      if (filter.toDate) params = params.set('toDate', filter.toDate);
      cached = this.http.get<RawOpeningBalanceListResponse>(`${this.base}/list`, { params }).pipe(
        map(r => ({
          items: r.items,
          total: r.totalCount,
          page: r.page,
          pageSize: r.pageSize,
          totalPages: r.totalPages,
          hasNextPage: r.hasNextPage,
          hasPreviousPage: r.hasPreviousPage,
        } satisfies OpeningBalanceListResponse)),
        shareReplay(1),
      );
      this.listCache.set(key, cached);
    }
    return cached;
  }

  // تصحيح 2026-07-19: side هنا أيضاً لا يستخدم JsonStringEnumConverter (خلافاً للافتراض
  // السابق المبني على شكل استجابات GET) — نفس خطأ 400 "$.side: The JSON value could not be
  // converted" ظهر حياً لـ create-manual كما ظهر لـ create-supplier/create-customer. يُرسَل
  // كرقم صحيح (Debit=1/Credit=2) هنا أيضاً.
  createManual(dto: CreateManualOpeningBalanceDto): Observable<{ id: string }> {
    const body = { ...dto, side: NORMAL_BALANCE_VALUES[dto.side] };
    return this.http.post<{ id: string }>(`${this.base}/create-manual-opening-balance`, body)
      .pipe(tap(() => this.invalidate()));
  }

  createBank(dto: CreateBankOpeningBalanceDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/create-bank-opening-balance`, dto)
      .pipe(tap(() => this.invalidate()));
  }

  // على عكس create-manual-opening-balance، حقل Side في CreateSupplierOpeningBalanceCommand/
  // CreateCustomerOpeningBalanceCommand لا يستخدم JsonStringEnumConverter — إرسال النص
  // ('Debit'/'Credit') يفشل حياً بـ 400 "$.side: The JSON value could not be converted"
  // (مؤكَّد 2026-07-19). يُرسَل هنا كرقم صحيح (Debit=1/Credit=2) بدل النص لهذين الأمرين فقط.
  createSupplier(dto: CreateSupplierOpeningBalanceDto): Observable<{ id: string }> {
    const body = { ...dto, side: NORMAL_BALANCE_VALUES[dto.side] };
    return this.http.post<{ id: string }>(`${this.base}/create-supplier-opening-balance`, body)
      .pipe(tap(() => this.invalidate()));
  }

  createCustomer(dto: CreateCustomerOpeningBalanceDto): Observable<{ id: string }> {
    const body = { ...dto, side: NORMAL_BALANCE_VALUES[dto.side] };
    return this.http.post<{ id: string }>(`${this.base}/create-customer-opening-balance`, body)
      .pipe(tap(() => this.invalidate()));
  }

  createInventory(dto: CreateInventoryOpeningBalanceDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/create-inventory-opening-balance`, dto)
      .pipe(tap(() => this.invalidate()));
  }

  update(dto: UpdateOpeningBalanceDto): Observable<void> {
    const body = { ...dto, side: NORMAL_BALANCE_VALUES[dto.side] };
    return this.http.put<void>(`${this.base}/${dto.id}`, body).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidate()));
  }

  // warehouseId أصبح إلزامياً على مستوى الطلب (لا عمود مخزن في ملف Excel نفسه بعد الآن —
  // مؤكَّد حياً 2026-08-04: ImportInventoryOpeningBalanceCommand أضاف WarehouseId Guid).
  importInventory(file: File, balanceDate: string, fiscalPeriodId: string, branchId: string, warehouseId: string, userId: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('balanceDate', balanceDate);
    formData.append('fiscalPeriodId', fiscalPeriodId);
    formData.append('branchId', branchId);
    formData.append('warehouseId', warehouseId);
    formData.append('userId', userId);
    return this.http.post<any>(`${this.base}/import-inventory-opening-balance`, formData).pipe(tap(() => this.invalidate()));
  }

  // POST /api/opening_balances/import-supplier-opening-balance — استيراد جماعي (Excel) لأرصدة
  // افتتاحية للموردين، منفصل تماماً عن create-supplier-opening-balance الفردي (لا يُعدَّل).
  // اسم حقل الملف هنا "excelFile" — مختلف عمداً عن "file" المستخدَم في import-inventory
  // (مؤكَّد من المستخدم 2026-08-12، توثيق ImportPartyOpeningBalanceResultDto).
  importSupplier(file: File, balanceDate: string, fiscalPeriodId: string, branchId: string, userId: string): Observable<OpeningBalanceImportResult> {
    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('balanceDate', balanceDate);
    formData.append('fiscalPeriodId', fiscalPeriodId);
    formData.append('branchId', branchId);
    formData.append('userId', userId);
    return this.http.post<OpeningBalanceImportResult>(`${this.base}/import-supplier-opening-balance`, formData).pipe(tap(() => this.invalidate()));
  }

  // POST /api/opening_balances/import-customer-opening-balance — نفس فكرة importSupplier أعلاه للعملاء.
  importCustomer(file: File, balanceDate: string, fiscalPeriodId: string, branchId: string, userId: string): Observable<OpeningBalanceImportResult> {
    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('balanceDate', balanceDate);
    formData.append('fiscalPeriodId', fiscalPeriodId);
    formData.append('branchId', branchId);
    formData.append('userId', userId);
    return this.http.post<OpeningBalanceImportResult>(`${this.base}/import-customer-opening-balance`, formData).pipe(tap(() => this.invalidate()));
  }

  confirm(fiscalPeriodId: string, userId: string): Observable<{ value: number; error: any }> {
    return this.http.post<{ value: number; error: any }>(`${this.base}/confirm`, { fiscalPeriodId, userId }).pipe(tap(() => this.invalidate()));
  }

  // POST /api/opening_balances/confirm-single — تأكيد رصيد واحد فردياً (بجانب confirm الجماعي
  // أعلاه، لا يستبدله). يُفرَّغ الكاش نفسه لأن كل تأكيد يُنشئ قيد يومية ويُحدِّث أرصدة الحسابات.
  confirmSingle(openingBalanceId: string, userId: string): Observable<ConfirmSingleOpeningBalanceResult> {
    return this.http.post<ConfirmSingleOpeningBalanceResult>(`${this.base}/confirm-single`, { openingBalanceId, userId })
      .pipe(tap(() => this.invalidate()));
  }

  revertSingle(openingBalanceId: string, userId: string): Observable<RevertSingleOpeningBalanceResult> {
    return this.http.post<RevertSingleOpeningBalanceResult>(`${this.base}/revert-single`, { openingBalanceId, userId })
      .pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.listCache.clear();
  }
}
