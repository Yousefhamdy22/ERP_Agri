import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, map } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { PaymentVoucherService, PaymentVoucherListFilter } from '../../services/payment-voucher.service';
import {
  PaymentVoucherListItem,
  PaymentVoucherDetail,
  VoucherType,
  VoucherStatus,
  VOUCHER_TYPE_LABELS,
  VOUCHER_TYPE_ICONS,
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_BADGE,
} from '../../models/payment-voucher.model';
import { PAYMENT_VOUCHERS_QUICK_ACTIONS } from '../../../../shared/data/payment-vouchers-quick-actions';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | 'New' | 'Approved' | 'Posted' | 'Cancelled';
type TypeFilter = '' | VoucherType;
type SortField = 'VoucherDate' | 'Amount' | 'Status' | 'PartyName';

@Component({
  selector: 'app-payment-voucher-manage-page',
  templateUrl: './payment-voucher-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, InvoicePrintHeaderComponent, CustomSelectComponent,],
})
export class PaymentVoucherManagePageComponent implements OnInit, OnDestroy {
  readonly today = new Date();

  vouchers: PaymentVoucherListItem[] = [];
  loading = false;      // true only for the very first fetch (no rows to show yet)
  refreshing = false;   // true for every fetch after that — table stays visible underneath
  loadError = false;

  status: StatusFilter = '';
  type: TypeFilter = '';
  fromDate = '';
  toDate = '';
  search = '';
  sortBy: SortField = 'VoucherDate';
  descending = true;

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    { value: 'New', label: 'جديد' },
    { value: 'Approved', label: 'معتمد' },
    { value: 'Posted', label: 'مرحّل' },
    { value: 'Cancelled', label: 'ملغى' },
  ];

  typeOptions: { value: TypeFilter; label: string }[] = [
    { value: '', label: 'كل الأنواع' },
    ...(Object.entries(VOUCHER_TYPE_LABELS) as [VoucherType, string][]).map(([value, label]) => ({ value, label })),
  ];

  sortOptions: { value: SortField; label: string }[] = [
    { value: 'VoucherDate', label: 'التاريخ' },
    { value: 'Amount', label: 'المبلغ' },
    { value: 'Status', label: 'الحالة' },
    { value: 'PartyName', label: 'اسم الطرف' },
  ];

  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = PAYMENT_VOUCHERS_QUICK_ACTIONS;
  topButton = { label: 'اضافة سند', icon: 'fa-solid fa-plus', route: '/payment-vouchers/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'المدفوعات والمقبوضات', route: '/sales?module=accounts&tab=main' },
    { label: 'ادارة السندات' },
  ];

  selectedVoucher: PaymentVoucherDetail | null = null;
  detailLoading = false;
  actionLoading = false;

  // تحديد صفوف لتنفيذ اعتماد/ترحيل جماعي — يلف نفس نقطتي approve()/post() الفرديتين
  // (forkJoin) بدل نقطة bulk مخصّصة غير موجودة على الباك ايند.
  selectedIds = new Set<string>();

  fiscalPeriods: FiscalPeriod[] = [];

  showApproveDialog = false;
  approving = false;

  showPostDialog = false;
  postFiscalPeriodId = '';
  posting = false;

  private search$ = new Subject<string>();

  constructor(
    private voucherService: PaymentVoucherService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const type = this.route.snapshot.queryParamMap.get('type') as VoucherType | null;
    if (type && VOUCHER_TYPE_LABELS[type]) this.type = type;

    this.fiscalPeriodService.getAll().subscribe({
      next: p => {
        this.fiscalPeriods = p;
        const open = p.find(x => x.status === 'Open');
        if (open && !this.postFiscalPeriodId) this.postFiscalPeriodId = open.id;
      },
      error: () => {},
    });

    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number): PaymentVoucherListFilter {
    return {
      page,
      pageSize: this.pageSize,
      status: this.status || undefined,
      type: this.type || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      search: this.search || undefined,
      sortBy: this.sortBy,
      descending: this.descending,
    };
  }

  load() {
    this.selectedIds.clear();
    this.loading = this.vouchers.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.voucherService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        this.vouchers = r.items;
        this.total = r.total;
        this.totalPages = r.totalPages;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل السندات');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.voucherService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  toggleSortDirection() {
    this.descending = !this.descending;
    this.onFilterChange();
  }

  clearFilters() {
    this.status = '';
    this.type = '';
    this.fromDate = '';
    this.toDate = '';
    this.search = '';
    this.sortBy = 'VoucherDate';
    this.descending = true;
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  typeLabel(t: string): string { return VOUCHER_TYPE_LABELS[t as VoucherType] ?? t; }
  typeIcon(t: string): string { return VOUCHER_TYPE_ICONS[t as VoucherType] ?? 'fa-solid fa-file-invoice-dollar'; }
  // لتوقيع الطباعة: سندات القبض (نقدي/شيك) يُوقِّعها الدافع، سندات الصرف (نقدي/تحويل) يُوقِّعها المستلم.
  isReceiptType(t: string): boolean { return t === 'CashReceipt' || t === 'CheckReceipt'; }
  statusLabel(s: string): string { return VOUCHER_STATUS_LABELS[s] ?? s; }
  statusBadgeClass(s: string): string { return VOUCHER_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  // خط زمني بصري لتدفق الحالات الإلزامي الآن (New→Approved→Posted). Cancelled تُعرض كشارة
  // منفصلة بدل الخط الزمني (قد تصل من أي حالة، لا مكان ثابت لها ضمن التسلسل الخطي).
  readonly timelineSteps: VoucherStatus[] = ['New', 'Approved', 'Posted'];

  private timelineStatusIndex(status: string): number {
    return this.timelineSteps.indexOf(status as VoucherStatus);
  }

  isTimelineStepDone(status: string, stepIndex: number): boolean {
    return this.timelineStatusIndex(status) >= stepIndex;
  }

  get hasSelection(): boolean { return this.selectedIds.size > 0; }
  get isAllSelected(): boolean { return this.vouchers.length > 0 && this.vouchers.every(v => this.selectedIds.has(v.id)); }
  get selectedNewCount(): number { return this.vouchers.filter(v => this.selectedIds.has(v.id) && v.status === 'New').length; }
  get selectedApprovedCount(): number { return this.vouchers.filter(v => this.selectedIds.has(v.id) && v.status === 'Approved').length; }

  toggleSelect(id: string) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  toggleSelectAll() {
    if (this.isAllSelected) this.vouchers.forEach(v => this.selectedIds.delete(v.id));
    else this.vouchers.forEach(v => this.selectedIds.add(v.id));
  }

  openDetail(voucherId: string) {
    this.detailLoading = true;
    this.selectedVoucher = null;
    this.voucherService.getDetail(voucherId).subscribe({
      next: detail => {
        this.selectedVoucher = detail;
        this.detailLoading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل تفاصيل السند');
        this.detailLoading = false;
      },
    });
  }

  closeDetail() {
    this.selectedVoucher = null;
  }

  // اعتماد — خطوة إلزامية الآن قبل الترحيل (New→Approved). حوار غني بدل confirm() الخام،
  // يعرض تفاصيل السند قبل التأكيد بدل رسالة عامة.
  openApproveDialog() {
    if (!this.selectedVoucher) return;
    this.showApproveDialog = true;
  }

  closeApproveDialog() {
    if (this.approving) return;
    this.showApproveDialog = false;
  }

  confirmApprove() {
    if (!this.selectedVoucher) return;
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن اعتماد السند: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }

    const voucherId = this.selectedVoucher.id;
    this.approving = true;
    this.voucherService.approve(voucherId, userId).subscribe({
      next: () => {
        this.approving = false;
        this.showApproveDialog = false;
        this.notify.success('تم اعتماد السند بنجاح');
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.approving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر اعتماد السند'));
      },
    });
  }

  // ترحيل — يتطلب الآن اعتماد سابق (Approved فقط)، ويرفض غير ذلك برسالة "Voucher must be
  // approved before posting" من الباك ايند مباشرة. يحتاج فترة مالية (خلافاً لـ approve).
  openPostDialog() {
    if (!this.selectedVoucher) return;
    this.showPostDialog = true;
  }

  closePostDialog() {
    if (this.posting) return;
    this.showPostDialog = false;
  }

  confirmPost() {
    if (!this.selectedVoucher) return;
    if (!this.postFiscalPeriodId) { this.notify.error('اختر الفترة المالية أولاً'); return; }
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن ترحيل السند: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }

    const voucherId = this.selectedVoucher.id;
    this.posting = true;
    this.voucherService.post(voucherId, this.postFiscalPeriodId, userId).subscribe({
      next: entry => {
        this.posting = false;
        this.showPostDialog = false;
        this.notify.success(`تم ترحيل السند بنجاح — رقم القيد: ${entry.entryNumber}`);
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.posting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر ترحيل السند'));
      },
    });
  }

  // إلغاء سند — يُنشئ الباك ايند سند عكس (reversal) تلقائياً بدل حذف السند الأصلي. متاح فقط
  // لـ New/Approved (يُخفى الزر في القالب لـ Posted/Cancelled) حتى يقرر الباك ايند نفسه رفضه
  // كقاعدة عمل لو لزم (409)، لا داعي لتضييق أكثر هنا بلا تأكيد حي.
  cancelVoucher() {
    if (!this.selectedVoucher) return;
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن إلغاء السند: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm(`هل تريد إلغاء السند ${this.selectedVoucher.voucherNumber}؟ سيتم إنشاء سند عكس تلقائياً.`)) return;

    this.actionLoading = true;
    this.voucherService.cancel(this.selectedVoucher.id, userId).subscribe({
      next: () => {
        this.notify.success('تم إلغاء السند وإنشاء سند العكس بنجاح');
        this.actionLoading = false;
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إلغاء السند'));
        this.actionLoading = false;
      },
    });
  }

  // لا توجد نقطة "اعتماد جماعي" على الباك ايند — تُنفَّذ بلفّ نفس نقطة الاعتماد الفردية
  // لكل سند محدد (forkJoin)، مع التقاط فشل أي سند على حدة بدل إفشال الدفعة كلها.
  bulkApprove() {
    const eligible = this.vouchers.filter(v => this.selectedIds.has(v.id) && v.status === 'New');
    if (!eligible.length) { this.notify.error('اختر سندات جديدة أولاً'); return; }
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن اعتماد السندات: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm(`هل تريد اعتماد ${eligible.length} سند؟`)) return;

    this.actionLoading = true;
    forkJoin(eligible.map(v => this.voucherService.approve(v.id, userId).pipe(
      map(() => true),
      catchError(() => of(false)),
    ))).subscribe(results => {
      this.actionLoading = false;
      const okCount = results.filter(Boolean).length;
      const failCount = results.length - okCount;
      if (failCount === 0) this.notify.success(`تم اعتماد ${okCount} سند`);
      else this.notify.info(`تم اعتماد ${okCount} سند — تعذّر اعتماد ${failCount}`);
      this.load();
    });
  }

  // الترحيل الجماعي يحتاج فترة مالية واحدة تُطبَّق على كل السندات المحدَّدة — يُعاد استخدام
  // postFiscalPeriodId نفسه (نفس الحقل المستخدم في حوار الترحيل الفردي، مُعبَّأ افتراضياً
  // بالفترة المفتوحة) بدل بناء واجهة اختيار منفصلة للعملية الجماعية.
  bulkPost() {
    const eligible = this.vouchers.filter(v => this.selectedIds.has(v.id) && v.status === 'Approved');
    if (!eligible.length) { this.notify.error('اختر سندات معتمدة أولاً'); return; }
    if (!this.postFiscalPeriodId) { this.notify.error('اختر الفترة المالية أولاً (حوار الترحيل)'); return; }
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن ترحيل السندات: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm(`هل تريد ترحيل ${eligible.length} سند؟`)) return;

    this.actionLoading = true;
    forkJoin(eligible.map(v => this.voucherService.post(v.id, this.postFiscalPeriodId, userId).pipe(
      map(() => true),
      catchError(() => of(false)),
    ))).subscribe(results => {
      this.actionLoading = false;
      const okCount = results.filter(Boolean).length;
      const failCount = results.length - okCount;
      if (failCount === 0) this.notify.success(`تم ترحيل ${okCount} سند`);
      else this.notify.info(`تم ترحيل ${okCount} سند — تعذّر ترحيل ${failCount}`);
      this.load();
    });
  }

  // كان window.print() الخام هنا يطبع الصفحة كما تظهر على الشاشة حرفياً (بلا شعار/ترويسة
  // شركة، وبلا عزل حقيقي عن باقي الواجهة) — نفس آلية العزل المستخدمة فعلياً في طباعة الفواتير
  // (print-root + triggerPrint) مطبَّقة هنا الآن لإخراج موحَّد واحترافي.
  printVoucher() {
    triggerPrint();
  }

  // لا توجد نقطة GET /PaymentVouchers/all مؤكدة — يُعاد استخدام getList نفسها بحجم صفحة
  // كبير بدل اختراع نقطة جديدة غير مؤكدة.
  exportCsv() {
    this.voucherService.getList({ ...this.buildFilter(1), pageSize: 1000 }).subscribe({
      next: r => {
        if (!r.items.length) { this.notify.info('لا توجد بيانات للتصدير'); return; }
        const header = ['رقم السند', 'النوع', 'الطرف', 'المبلغ', 'التاريخ', 'الفاتورة المرتبطة', 'الحالة'];
        const dataRows = r.items.map(v => [
          v.voucherNumber, this.typeLabel(v.type), v.partyName, v.amount, this.formatDate(v.voucherDate),
          v.linkedInvoiceNumber || '', this.statusLabel(v.status),
        ]);
        const csv = [header, ...dataRows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment-vouchers-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('تعذّر تصدير البيانات'),
    });
  }
}
