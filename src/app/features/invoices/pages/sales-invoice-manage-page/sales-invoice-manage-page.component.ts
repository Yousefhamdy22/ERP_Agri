import { ApplicationRef, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { SalesInvoiceService, SalesInvoiceListFilter } from '../../services/sales-invoice.service';
import {
  SalesInvoiceListItem,
  SalesInvoiceDetail,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_PAYMENT_STATUS_BADGE,
  PAYMENT_ACCOUNTS,
} from '../../models/invoice.model';
import { CustomerService } from '../../../parties/services/customer.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { saveFilters, loadFilters, clearSavedFilters } from '../../../../shared/utils/filter-store.util';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { isInsufficientStockError, friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | 'Draft' | 'Confirmed' | 'PartiallyPaid' | 'Paid' | 'Cancelled';
type SortField = 'InvoiceDate' | 'InvoiceNumber' | 'CustomerName' | 'GrandTotal';

@Component({
  selector: 'app-sales-invoice-manage-page',
  templateUrl: './sales-invoice-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, InvoicePrintHeaderComponent, SearchableComboBoxComponent, CustomSelectComponent,],
})
export class SalesInvoiceManagePageComponent implements OnInit, OnDestroy {
  readonly today = new Date();
  printMode: 'invoice' | 'deliveryNote' = 'invoice';

  invoices: SalesInvoiceListItem[] = [];
  customers: PartyListItem[] = [];
  customerComboItems: ComboBoxItem[] = [];
  loading = false;      // true only for the very first fetch (no rows to show yet)
  refreshing = false;   // true for every fetch after that — table stays visible underneath
  loadError = false;

  status: StatusFilter = '';
  customerId = '';
  fromDate = '';
  toDate = '';
  search = '';
  sortBy: SortField = 'InvoiceDate';
  descending = true;

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'الكل' },
    { value: 'Draft', label: 'مسودة' },
    { value: 'Confirmed', label: 'مؤكدة' },
    { value: 'PartiallyPaid', label: 'مدفوعة جزئياً' },
    { value: 'Paid', label: 'مدفوعة بالكامل' },
    { value: 'Cancelled', label: 'ملغاة' },
  ];

  sortOptions: { value: SortField; label: string }[] = [
    { value: 'InvoiceDate', label: 'التاريخ' },
    { value: 'InvoiceNumber', label: 'رقم الفاتورة' },
    { value: 'CustomerName', label: 'اسم العميل' },
    { value: 'GrandTotal', label: 'الإجمالي' },
  ];

  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'إضافة فاتورة', icon: 'fa-solid fa-plus', route: '/invoices/sales/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير المبيعات', route: '/sales?module=sales&tab=main' },
    { label: 'ادارة فواتير مبيعات' },
  ];

  selectedInvoice: SalesInvoiceDetail | null = null;
  directPrintInvoice: SalesInvoiceDetail | null = null;
  detailLoading = false;
  actionLoading = false;
  paymentAccounts = PAYMENT_ACCOUNTS;
  confirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;
  branches: BranchListItem[] = [];
  confirmBranchId = '';

  // تأكيد سريع من صف الجدول مباشرة — لا يحتاج تحميل تفاصيل الفاتورة الكاملة أولاً
  // (openDetail يستدعي getDetail، وهو غير ضروري لمجرد التأكيد؛ تجاوزه يجعل التأكيد أسرع).
  confirmingRow: SalesInvoiceListItem | null = null;
  rowConfirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;
  rowConfirmBranchId = '';

  private search$ = new Subject<string>();

  constructor(
    private salesInvoiceService: SalesInvoiceService,
    private customerService: CustomerService,
    private branchService: BranchService,
    private notify: NotificationService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private appRef: ApplicationRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const saved = loadFilters('sales-invoice');
    if (saved['status']) this.status = saved['status'] as any;
    if (saved['customerId']) this.customerId = saved['customerId'];
    if (saved['fromDate']) this.fromDate = saved['fromDate'];
    if (saved['toDate']) this.toDate = saved['toDate'];
    if (saved['search']) this.search = saved['search'];
    const printId = this.route.snapshot.queryParamMap.get('printId');
    if (printId) this.printRow(printId);

    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; this.customerComboItems = r.items.map((c): ComboBoxItem => ({ id: c.id, label: c.name, extra: c.phone || undefined, numericValue: c.currentBalance, numericLabel: 'رصيد' })); } });
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length) {
          if (!this.confirmBranchId) this.confirmBranchId = b[0].id;
          if (!this.rowConfirmBranchId) this.rowConfirmBranchId = b[0].id;
        }
      },
      error: () => {},
    });
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number): SalesInvoiceListFilter {
    return {
      page,
      pageSize: this.pageSize,
      status: this.status || undefined,
      customerId: this.customerId || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      search: this.search || undefined,
      sortBy: this.sortBy,
      descending: this.descending,
    };
  }

  load() {
    this.loading = this.invoices.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.salesInvoiceService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        this.invoices = r.items;
        this.total = r.total;
        this.totalPages = r.totalPages;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير المبيعات');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.salesInvoiceService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  onFilterChange() {
    this.page = 1;
    saveFilters('sales-invoice', { status: this.status, customerId: this.customerId, fromDate: this.fromDate, toDate: this.toDate, search: this.search });
    this.load();
  }

  toggleSortDirection() {
    this.descending = !this.descending;
    this.onFilterChange();
  }

  clearFilters() {
    this.status = '';
    this.customerId = '';
    this.fromDate = '';
    this.toDate = '';
    this.search = '';
    this.sortBy = 'InvoiceDate';
    this.descending = true;
    this.page = 1;
    clearSavedFilters('sales-invoice');
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

  editDraft(invoiceId: string) {
    this.router.navigate(['/invoices/sales/add'], { queryParams: { draftId: invoiceId } });
  }

  openDetail(invoiceId: string) {
    this.detailLoading = true;
    this.selectedInvoice = null;
    this.confirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;
    this.salesInvoiceService.getDetail(invoiceId).subscribe({
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

  printInvoice() {
    this.printMode = 'invoice';
    this.cdr.detectChanges();
    triggerPrint(() => { this.printMode = 'invoice'; this.cdr.detectChanges(); });
  }

  printDeliveryNote() {
    this.printMode = 'deliveryNote';
    this.cdr.detectChanges();
    triggerPrint(() => { this.printMode = 'invoice'; this.cdr.detectChanges(); });
  }

  // لا يحمل خطأ 409 هنا معرّف الصنف (فقط GUID خام في النص)، وتفاصيل الفاتورة هنا (lines) لا
  // تحمل productId لمطابقته به — فقط productSku/productName. لو كان للفاتورة سطر واحد فالمقصود
  // مؤكَّد فيُسمَّى صراحة؛ ولو تعددت السطور تُعرض رسالة عامة بدل تخمين أي صنف هو المقصود.
  private insufficientStockMessage(detail: SalesInvoiceDetail | null): string {
    const isAdmin = this.auth.isAdmin;
    const productPart = detail?.lines?.length === 1
      ? `الصنف "${detail.lines[0].productSku} — ${detail.lines[0].productName}"`
      : 'أحد أصناف هذه الفاتورة';
    return isAdmin
      ? `تعذّر تأكيد الفاتورة: الكمية المطلوبة من ${productPart} تتجاوز الرصيد المتاح بالمخزن المحدَّد — فعِّل "السماح بالبيع بالسالب" لهذا المخزن إن كنت تقصد المتابعة، أو عدّل الكمية`
      : `تعذّر تأكيد الفاتورة: الكمية المطلوبة من ${productPart} تتجاوز الرصيد المتاح بالمخزن المحدَّد، ولا تملك صلاحية البيع بالسالب — تواصل مع الأدمن`;
  }

  confirmInvoiceAction() {
    if (!this.selectedInvoice) return;
    const paymentAccountCode = this.confirmPaymentAccountCode.trim();
    if (!paymentAccountCode) {
      this.notify.error('أدخل كود حساب الدفع أولاً');
      return;
    }
    if (!this.confirmBranchId) {
      this.notify.error('اختر الفرع أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    if (!confirm('هل تريد تأكيد الفاتورة؟')) return;

    this.actionLoading = true;
    const invoiceId = this.selectedInvoice.invoiceId;
    this.salesInvoiceService.confirm({ invoiceId, branchId: this.confirmBranchId, paymentAccountCode, userId }).subscribe({
      next: () => {
        this.notify.success('تم تأكيد الفاتورة');
        this.actionLoading = false;
        const row = this.invoices.find(i => i.id === invoiceId);
        if (row) row.status = 'Confirmed';
        this.closeDetail();
      },
      error: (err) => {
        this.actionLoading = false;
        this.salesInvoiceService.getDetail(invoiceId).subscribe({
          next: (detail) => {
            if (detail.status === 'Confirmed') {
              this.notify.success('الفاتورة مؤكدة بالفعل');
              const row = this.invoices.find(i => i.id === invoiceId);
              if (row) row.status = 'Confirmed';
              this.closeDetail();
            } else {
              this.notify.error(friendlyErrorMessage(err, this.insufficientStockMessage(detail)));
            }
          },
          error: () => {
            this.notify.error(friendlyErrorMessage(err, this.insufficientStockMessage(null)));
          },
        });
      },
    });
  }

  openRowConfirm(row: SalesInvoiceListItem) {
    this.confirmingRow = row;
    this.rowConfirmPaymentAccountCode = PAYMENT_ACCOUNTS[0].code;
    if (this.branches.length) this.rowConfirmBranchId = this.branches[0].id;
  }

  closeRowConfirm() {
    this.confirmingRow = null;
  }

  confirmRow() {
    if (!this.confirmingRow) return;
    const paymentAccountCode = this.rowConfirmPaymentAccountCode.trim();
    if (!paymentAccountCode) {
      this.notify.error('اختر حساب الدفع أولاً');
      return;
    }
    if (!this.rowConfirmBranchId) {
      this.notify.error('اختر الفرع أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.actionLoading = true;
    const invoiceId = this.confirmingRow.id;
    this.salesInvoiceService.confirm({ invoiceId, branchId: this.rowConfirmBranchId, paymentAccountCode, userId }).subscribe({
      next: () => {
        this.notify.success('تم تأكيد الفاتورة');
        this.actionLoading = false;
        const row = this.invoices.find(i => i.id === invoiceId);
        if (row) row.status = 'Confirmed';
        this.closeRowConfirm();
      },
      error: (err) => {
        this.actionLoading = false;
        this.salesInvoiceService.getDetail(invoiceId).subscribe({
          next: (detail) => {
            if (detail.status === 'Confirmed') {
              this.notify.success('الفاتورة مؤكدة بالفعل');
              const row = this.invoices.find(i => i.id === invoiceId);
              if (row) row.status = 'Confirmed';
              this.closeRowConfirm();
            } else {
              this.notify.error(friendlyErrorMessage(err, this.insufficientStockMessage(detail)));
            }
          },
          error: () => {
            this.notify.error(friendlyErrorMessage(err, this.insufficientStockMessage(null)));
          },
        });
      },
    });
  }

  cancelInvoiceAction() {
    if (!this.selectedInvoice) return;
    if (!confirm('هل تريد إلغاء الفاتورة؟ سيتم عكس جميع العمليات المرتبطة (المخزون، القيود المحاسبية).')) return;
    this.actionLoading = true;
    const invoiceId = this.selectedInvoice.invoiceId;
    this.salesInvoiceService.cancelInvoice(invoiceId).subscribe({
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
    if (!confirm('هل تريد حذف الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    this.actionLoading = true;
    const invoiceId = this.selectedInvoice.invoiceId;
    this.salesInvoiceService.deleteInvoice(invoiceId).subscribe({
      next: () => {
        this.notify.success('تم حذف الفاتورة');
        this.actionLoading = false;
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

  exportCsv() {
    this.salesInvoiceService.getAll({
      status: this.status || undefined,
      customerId: this.customerId || undefined,
    }).subscribe({
      next: rows => {
        if (!rows.length) { this.notify.info('لا توجد بيانات للتصدير'); return; }
        const header = ['رقم الفاتورة', 'العميل', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'حالة السداد'];
        const dataRows = rows.map(r => [
          r.invoiceNumber, r.customerName, this.formatDate(r.invoiceDate), this.formatDate(r.dueDate),
          r.grandTotal, r.amountPaid, r.amountOutstanding, this.statusLabel(r.status), this.paymentStatusLabel(r.paymentStatus),
        ]);
        const csv = [header, ...dataRows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('تعذّر تصدير البيانات'),
    });
  }

  printRow(invoiceId: string) {
    this.detailLoading = true;
    this.directPrintInvoice = null;
    this.cdr.detectChanges();

    this.salesInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.directPrintInvoice = detail;
        this.detailLoading = false;
        this.cdr.detectChanges();

        // Defer printing to allow browser to layout and style the new DOM elements
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'invoice'; this.cdr.detectChanges(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.detectChanges();
        this.notify.error('تعذّر تحميل تفاصيل الفاتورة للطباعة');
      }
    });
  }

  printRowDeliveryNote(invoiceId: string) {
    this.printMode = 'deliveryNote';
    this.detailLoading = true;
    this.directPrintInvoice = null;
    this.cdr.detectChanges();

    this.salesInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.directPrintInvoice = detail;
        this.detailLoading = false;
        this.cdr.detectChanges();
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'invoice'; this.cdr.detectChanges(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.printMode = 'invoice';
        this.cdr.detectChanges();
        this.notify.error('تعذّر تحميل تفاصيل الفاتورة للطباعة');
      }
    });
  }
}
