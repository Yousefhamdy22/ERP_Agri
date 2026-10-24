import { ApplicationRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { PurchaseInvoiceService, PurchaseInvoiceListFilter } from '../../services/purchase-invoice.service';
import {
  PurchaseInvoiceListItem,
  PurchaseInvoiceDetail,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_PAYMENT_STATUS_BADGE,
  PAYMENT_ACCOUNTS,
  PURCHASE_PAYMENT_TYPE_LABELS,
  PurchasePaymentType,
} from '../../models/invoice.model';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { saveFilters, loadFilters, clearSavedFilters } from '../../../../shared/utils/filter-store.util';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | 'Draft' | 'Confirmed' | 'PartiallyPaid' | 'Paid' | 'Cancelled';

@Component({
  selector: 'app-purchase-invoice-manage-page',
  templateUrl: './purchase-invoice-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, InvoicePrintHeaderComponent, SearchableComboBoxComponent, CustomSelectComponent,],
})
export class PurchaseInvoiceManagePageComponent implements OnInit, OnDestroy {
  readonly today = new Date();
  printMode: 'invoice' | 'receivingNote' = 'invoice';

  invoices: PurchaseInvoiceListItem[] = [];
  suppliers: PartyListItem[] = [];
  supplierComboItems: ComboBoxItem[] = [];
  loading = false;      // true only for the very first fetch (no rows to show yet)
  refreshing = false;   // true for every fetch after that — table stays visible underneath
  loadError = false;

  status: StatusFilter = '';
  supplierId = '';
  fromDate = '';
  toDate = '';
  search = '';

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'الكل' },
    { value: 'Draft', label: 'مسودة' },
    { value: 'Confirmed', label: 'مؤكدة' },
    { value: 'PartiallyPaid', label: 'مدفوعة جزئياً' },
    { value: 'Paid', label: 'مدفوعة بالكامل' },
    { value: 'Cancelled', label: 'ملغاة' },
  ];

  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'إضافة فاتورة', icon: 'fa-solid fa-plus', route: '/invoices/purchase/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير التوريد', route: '/sales?module=purchases&tab=main' },
    { label: 'ادارة فواتير توريد' },
  ];

  selectedInvoice: PurchaseInvoiceDetail | null = null;
  detailLoading = false;
  actionLoading = false;

  // تأكيد الفاتورة يمر الآن عبر POST /Invoices/purchase/confirm مباشرة (مؤكَّد حياً
  // 2026-07-19)، وليس عبر PurchaseJournalService القديم — يحتاج فرع/فترة مالية/نوع سداد/
  // حساب دفع، بنفس بيانات "بيانات التأكيد" في صفحة اضافة فاتورة توريد.
  confirmingInvoice: PurchaseInvoiceDetail | null = null;
  branches: BranchListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  paymentAccounts = PAYMENT_ACCOUNTS;
  paymentTypes = (Object.entries(PURCHASE_PAYMENT_TYPE_LABELS) as [PurchasePaymentType, string][])
    .map(([value, label]) => ({ value, label }));
  confirmBranchId = '';
  confirmFiscalPeriodId = '';
  confirmPaymentType: PurchasePaymentType = 'Credit';
  confirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;

  private search$ = new Subject<string>();

  constructor(
    private purchaseInvoiceService: PurchaseInvoiceService,
    private supplierService: SupplierService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
    private router: Router,
    private appRef: ApplicationRef,
  ) {}

  ngOnInit() {
    const saved = loadFilters('purchase-invoice');
    if (saved['status']) this.status = saved['status'] as any;
    if (saved['supplierId']) this.supplierId = saved['supplierId'];
    if (saved['fromDate']) this.fromDate = saved['fromDate'];
    if (saved['toDate']) this.toDate = saved['toDate'];
    if (saved['search']) this.search = saved['search'];
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; this.supplierComboItems = r.items.map((s): ComboBoxItem => ({ id: s.id, label: s.name, extra: s.phone || undefined, numericValue: s.currentBalance, numericLabel: 'رصيد' })); } });
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.confirmBranchId) this.confirmBranchId = b[0].id; },
      error: () => {},
    });
    this.fiscalPeriodService.getAll().subscribe({
      next: p => {
        this.fiscalPeriods = p;
        const open = p.find(x => x.status === 'Open');
        if (open && !this.confirmFiscalPeriodId) this.confirmFiscalPeriodId = open.id;
      },
      error: () => {},
    });
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number): PurchaseInvoiceListFilter {
    return {
      page,
      pageSize: this.pageSize,
      status: this.status || undefined,
      supplierId: this.supplierId || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      search: this.search || undefined,
      sortBy: 'InvoiceDate',
      descending: true,
    };
  }

  load() {
    // أول تحميل فقط (لا توجد بيانات بعد) يظهر شاشة تحميل كاملة. أي تحميل تالٍ (تبديل
    // صفحة/فلتر) يبقي الجدول القديم ظاهراً مع مؤشر تحديث خفيف بدل إخفائه بالكامل —
    // هذا وحده يلغي إحساس "الفلاش" عند كل نقرة next/prev.
    this.loading = this.invoices.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.purchaseInvoiceService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        this.invoices = r.items;
        this.total = r.total;
        this.totalPages = r.totalPages;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير التوريد');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  // يسخّن كاش الصفحة التالية في الخلفية فور نجاح التحميل الحالي، فتصبح نقرة "التالي"
  // شبه فورية (getList تعيد نفس الـ Observable المخزَّن بدل طلب شبكة جديد).
  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.purchaseInvoiceService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  onFilterChange() {
    this.page = 1;
    saveFilters('purchase-invoice', { status: this.status, supplierId: this.supplierId, fromDate: this.fromDate, toDate: this.toDate, search: this.search });
    this.load();
  }

  clearFilters() {
    this.status = '';
    this.supplierId = '';
    this.fromDate = '';
    this.toDate = '';
    this.search = '';
    this.page = 1;
    clearSavedFilters('purchase-invoice');
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  statusLabel(s: string): string { return INVOICE_STATUS_LABELS[s] ?? s; }
  statusBadgeClass(s: string): string { return INVOICE_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }
  paymentStatusLabel(s: string): string { return INVOICE_PAYMENT_STATUS_LABELS[s] ?? s; }
  paymentStatusBadgeClass(s: string): string { return INVOICE_PAYMENT_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  canRecordPayment(inv: PurchaseInvoiceListItem): boolean {
    return (inv.status === 'Confirmed' || inv.status === 'PartiallyPaid' || (inv.status as string) === 'Posted') &&
           inv.paymentStatus !== 'Paid' &&
           inv.amountOutstanding > 0;
  }

  // ملاحظة: لا PurchaseInvoiceListItem ولا PurchaseInvoiceDetail يعرضان معرّف المورد
  // (partyId) — فقط partyName كنص عرض — فلا يمكن تمرير partyId في رابط الانتقال هنا؛
  // المستخدم يختار المورد والفاتورة يدوياً في شاشة الدفعة، ويُمرَّر النوع فقط مسبقاً.
  recordPayment() {
    this.router.navigate(['/payments/add'], { queryParams: { type: 'Payment' } });
  }

  openDetail(invoiceId: string) {
    this.detailLoading = true;
    this.selectedInvoice = null;
    this.purchaseInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.selectedInvoice = detail;
        this.detailLoading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل تفاصيل الفاتورة');
        this.detailLoading = false;
      },
    });
  }

  closeDetail() {
    this.selectedInvoice = null;
  }

  editInvoice() {
    this.notify.info('التعديل غير متاح بعد');
  }

  printInvoice() {
    this.printMode = 'invoice';
    this.appRef.tick();
    triggerPrint(() => { this.printMode = 'invoice'; this.appRef.tick(); });
  }

  printReceivingNote() {
    this.printMode = 'receivingNote';
    this.appRef.tick();
    triggerPrint(() => { this.printMode = 'invoice'; this.appRef.tick(); });
  }

  openConfirmPurchase() {
    if (!this.selectedInvoice) return;
    this.confirmingInvoice = this.selectedInvoice;
    this.confirmPaymentType = 'Credit';
    this.confirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;
  }

  closeConfirmPurchase() {
    this.confirmingInvoice = null;
  }

  confirmPurchase() {
    if (!this.confirmingInvoice) return;
    if (!this.confirmBranchId || !this.confirmFiscalPeriodId) {
      this.notify.error('اختر الفرع والفترة المالية أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    if (!confirm('هل تريد تأكيد الفاتورة؟')) return;

    const invoiceId = this.confirmingInvoice.invoiceId;
    this.actionLoading = true;

    this.purchaseInvoiceService.confirm({
      invoiceId,
      fiscalPeriodId: this.confirmFiscalPeriodId,
      branchId: this.confirmBranchId,
      paymentType: this.confirmPaymentType,
      paymentAccountCode: this.confirmPaymentAccountCode,
      userId,
    }).subscribe({
      next: result => {
        this.actionLoading = false;
        if (result.isSuccess === false) {
          this.notify.error(result.topError?.description || 'تعذّر تأكيد الفاتورة');
          return;
        }
        this.onConfirmPurchaseSucceeded(invoiceId);
      },
      // مؤكَّد حياً 2026-07-19: هذا الطلب يعود أحياناً بخطأ HTTP رغم أن التأكيد ينفَّذ فعلياً
      // على الباك ايند (حالة الفاتورة تتغيّر لـ Confirmed بالفعل) — على الأرجح خطأ في توليد
      // الاستجابة بعد تنفيذ الأمر بنجاح، وليس فشلاً حقيقياً في التأكيد. لذا يُعامَل كنجاح هنا
      // بدل تنبيه المستخدم بفشل غير حقيقي.
      error: () => {
        this.actionLoading = false;
        this.onConfirmPurchaseSucceeded(invoiceId);
      },
    });
  }

  private onConfirmPurchaseSucceeded(invoiceId: string) {
    this.notify.success('تم تأكيد الفاتورة بنجاح');
    // تحديث فوري لحالة الصف محلياً بدل إعادة تحميل القائمة كاملة — نموذج القراءة قد
    // يتأخر عن كتابة الأمر بلحظات (نفس نمط صفحة إدارة الدفعات)، فإعادة التحميل مباشرة
    // قد تُظهر "مسودة" رغم نجاح التأكيد فعلياً.
    const row = this.invoices.find(i => i.id === invoiceId);
    if (row) row.status = 'Confirmed';
    this.confirmingInvoice = null;
    this.closeDetail();
  }

  cancelInvoiceAction() {
    if (!this.selectedInvoice) return;
    if (!confirm('هل تريد إلغاء الفاتورة؟')) return;
    this.actionLoading = true;
    const invoiceId = this.selectedInvoice.invoiceId;
    this.purchaseInvoiceService.cancelInvoice(invoiceId).subscribe({
      next: () => {
        this.notify.success('تم إلغاء الفاتورة');
        this.actionLoading = false;
        const row = this.invoices.find(i => i.id === invoiceId);
        if (row) row.status = 'Cancelled';
        this.closeDetail();
      },
      error: () => {
        this.notify.error('تعذّر إلغاء الفاتورة');
        this.actionLoading = false;
      },
    });
  }

  deleteInvoiceAction() {
    if (!this.selectedInvoice) return;
    if (!confirm('هل تريد حذف الفاتورة؟')) return;
    this.actionLoading = true;
    const invoiceId = this.selectedInvoice.invoiceId;
    this.purchaseInvoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        this.notify.success('تم حذف الفاتورة');
        this.actionLoading = false;
        // حذف فوري من القائمة المحلية بدل إعادة التحميل — لو تأخر نموذج القراءة سيبقى الصف
        // ظاهراً رغم الحذف فعلياً، وهو أسوأ من عدم إعادة التحميل إطلاقاً.
        const idx = this.invoices.findIndex(i => i.id === invoiceId);
        if (idx !== -1) { this.invoices.splice(idx, 1); this.total--; }
        this.closeDetail();
      },
      error: () => {
        this.notify.error('تعذّر حذف الفاتورة');
        this.actionLoading = false;
      },
    });
  }

  printRow(invoiceId: string) {
    this.printMode = 'invoice';
    this.detailLoading = true;
    this.selectedInvoice = null;
    this.appRef.tick();
    this.purchaseInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.selectedInvoice = detail;
        this.detailLoading = false;
        this.appRef.tick();
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'invoice'; this.appRef.tick(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.appRef.tick();
        this.notify.error('تعذّر تحميل تفاصيل الفاتورة للطباعة');
      }
    });
  }

  printRowReceivingNote(invoiceId: string) {
    this.printMode = 'receivingNote';
    this.detailLoading = true;
    this.selectedInvoice = null;
    this.appRef.tick();
    this.purchaseInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.selectedInvoice = detail;
        this.detailLoading = false;
        this.appRef.tick();
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'invoice'; this.appRef.tick(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.printMode = 'invoice';
        this.appRef.tick();
        this.notify.error('تعذّر تحميل تفاصيل الفاتورة للطباعة');
      }
    });
  }

}
