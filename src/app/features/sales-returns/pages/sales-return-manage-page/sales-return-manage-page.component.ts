import { ApplicationRef, Component, OnInit } from '@angular/core';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { SalesReturnService } from '../../services/sales-return.service';
import {
  SalesReturnListItem,
  SalesReturnDetailsDto,
  SALES_RETURN_STATUS_LABELS,
  SALES_RETURN_STATUS_BADGE,
} from '../../models/sales-return.model';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_PAYMENT_STATUS_BADGE,
} from '../../../invoices/models/invoice.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type SortField = 'invoiceDate' | 'invoiceNumber' | 'grandTotal' | 'customerName';

@Component({
  selector: 'app-sales-return-manage-page',
  templateUrl: './sales-return-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class SalesReturnManagePageComponent implements OnInit {
  printMode: 'return' | 'receivingNote' = 'return';
  allReturns: SalesReturnListItem[] = [];
  loading = false;
  loadError = false;

  status = '';
  search = '';
  sortBy: SortField = 'invoiceDate';
  descending = true;

  page = 1;
  pageSize = 20;

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'اضافة مرتجع', icon: 'fa-solid fa-plus', route: '/sales-returns/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير مرتجع مبيعات', route: '/sales?module=sales&tab=main' },
    { label: 'ادارة فواتير مرتجع مبيعات' },
  ];

  selectedReturn: SalesReturnDetailsDto | null = null;
  detailLoading = false;

  confirming = false;
  openPeriodId = '';

  constructor(
    private salesReturnService: SalesReturnService,
    private fiscalPeriodService: FiscalPeriodService,
    private auth: AuthService,
    private notify: NotificationService,
    private appRef: ApplicationRef,
  ) {}

  ngOnInit() {
    this.load();
    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        const openPeriods = periods.filter(p => p.status === 'Open');
        if (openPeriods.length) this.openPeriodId = openPeriods[0].id;
      }
    });
  }

  load() {
    this.loading = this.allReturns.length === 0 && !this.loadError;
    this.loadError = false;
    this.salesReturnService.getAll().subscribe({
      next: (r: any) => {
        const rawItems = r?.data || r?.items || (Array.isArray(r) ? r : []);
        this.allReturns = rawItems.map((item: any) => ({
          ...item,
          id: item.id || item.returnId,
          invoiceNumber: item.invoiceNumber || item.returnEntryNumber || 'بدون رقم',
          invoiceDate: item.invoiceDate || item.returnDate || new Date().toISOString(),
          grandTotal: item.grandTotal !== undefined ? item.grandTotal : (item.returnAmount || 0),
          amountOutstanding: item.amountOutstanding !== undefined ? item.amountOutstanding : (item.remainingAmount || 0),
          amountPaid: item.amountPaid || 0,
          status: item.status || item.returnStatus || 'Draft',
          customerName: item.customerName || item.partyName || (item.party ? item.party.name : 'عميل غير محدد'),
        }));
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير مرتجع المبيعات');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  get filtered(): SalesReturnListItem[] {
    const result = this.allReturns.filter(r => {
      const returnStatus = r.returnStatus || r.status || '';
      if (this.status && returnStatus !== this.status) return false;
      if (this.search) {
        const q = this.search.trim().toLowerCase();
        const num = r.returnEntryNumber || r.invoiceNumber || '';
        const cust = r.customerName || '';
        const haystack = `${num} ${cust}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...result].sort((a, b) => {
      let cmp = 0;
      const dateA = a.returnDate || a.invoiceDate || '';
      const dateB = b.returnDate || b.invoiceDate || '';
      const numA = a.returnEntryNumber || a.invoiceNumber || '';
      const numB = b.returnEntryNumber || b.invoiceNumber || '';
      const totalA = a.returnAmount || a.grandTotal || 0;
      const totalB = b.returnAmount || b.grandTotal || 0;
      const custA = a.customerName || '';
      const custB = b.customerName || '';

      switch (this.sortBy) {
        case 'invoiceDate': cmp = dateA.localeCompare(dateB); break;
        case 'invoiceNumber': cmp = numA.localeCompare(numB); break;
        case 'grandTotal': cmp = totalA - totalB; break;
        case 'customerName': cmp = custA.localeCompare(custB); break;
      }
      return this.descending ? -cmp : cmp;
    });
  }

  get total(): number { return this.filtered.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pagedReturns(): SalesReturnListItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  onFilterChange() { this.page = 1; }
  toggleSortDirection() { this.descending = !this.descending; }

  clearFilters() {
    this.status = '';
    this.search = '';
    this.sortBy = 'invoiceDate';
    this.descending = true;
    this.page = 1;
  }

  nextPage() { if (this.hasNextPage) this.page++; }
  prevPage() { if (this.hasPreviousPage) this.page--; }

  formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  statusLabel(s: string): string { return INVOICE_STATUS_LABELS[s] ?? s; }
  statusBadgeClass(s: string): string { return INVOICE_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }
  paymentStatusLabel(s: string): string { return INVOICE_PAYMENT_STATUS_LABELS[s] ?? s; }
  paymentStatusBadgeClass(s: string): string { return INVOICE_PAYMENT_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  returnStatusLabel(s: string): string { return SALES_RETURN_STATUS_LABELS[s] ?? s; }
  returnStatusBadgeClass(s: string): string { return SALES_RETURN_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  openDetail(returnId: string) {
    this.detailLoading = true;
    this.selectedReturn = null;
    this.salesReturnService.getDetail(returnId).subscribe({
      next: r => { this.selectedReturn = r; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل المرتجع'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedReturn = null; }
  printReturn() {
    this.printMode = 'return';
    this.appRef.tick();
    triggerPrint(() => { this.printMode = 'return'; this.appRef.tick(); });
  }

  printReceivingNote() {
    this.printMode = 'receivingNote';
    this.appRef.tick();
    triggerPrint(() => { this.printMode = 'return'; this.appRef.tick(); });
  }

  confirmReturn(returnId: string) {
    if (!this.openPeriodId) {
      this.notify.error('لا يمكن تأكيد المرتجع: لا توجد فترة مالية مفتوحة حالياً.');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد المرتجع: لم يتم العثور على معرّف المستخدم الحالي.');
      return;
    }

    if (!confirm('هل أنت متأكد من رغبتك في تأكيد هذا المرتجع وترحيله للمخازن والحسابات؟')) {
      return;
    }

    this.confirming = true;
    this.salesReturnService.confirmReturn(returnId, this.openPeriodId, userId).subscribe({
      next: (res: any) => {
        this.confirming = false;
        this.notify.success(`تم تأكيد وترحيل مرتجع المبيعات بنجاح رقم: ${res || ''}`);
        this.closeDetail();
        this.load();
      },
      error: (err: any) => {
        this.confirming = false;
        this.notify.error(friendlyErrorMessage(err, 'فشل تأكيد المرتجع'));
      }
    });
  }

  exportCsv() {
    const rows = this.filtered;
    if (!rows.length) { this.notify.info('لا توجد بيانات للتصدير'); return; }
    const header = ['رقم الفاتورة', 'المطابقة للأصل', 'الإجمالي', 'المتبقي بعد المرتجع', 'التاريخ', 'الحالة'];
    const dataRows = rows.map(r => [
      r.returnEntryNumber || r.invoiceNumber,
      r.originalEntryNumber || '',
      r.returnAmount || r.grandTotal,
      r.remainingAmount || 0,
      this.formatDate(r.returnDate || r.invoiceDate),
      this.returnStatusLabel(r.returnStatus || r.status || '')
    ]);
    const csv = [header, ...dataRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printRowReturn(returnId: string) {
    this.printMode = 'return';
    this.detailLoading = true;
    this.selectedReturn = null;
    this.appRef.tick();
    this.salesReturnService.getDetail(returnId).subscribe({
      next: detail => {
        this.selectedReturn = detail;
        this.detailLoading = false;
        this.appRef.tick();
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'return'; this.appRef.tick(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.appRef.tick();
        this.notify.error('تعذّر تحميل تفاصيل المرتجع للطباعة');
      }
    });
  }

  printRowReceivingNote(returnId: string) {
    this.printMode = 'receivingNote';
    this.detailLoading = true;
    this.selectedReturn = null;
    this.appRef.tick();
    this.salesReturnService.getDetail(returnId).subscribe({
      next: detail => {
        this.selectedReturn = detail;
        this.detailLoading = false;
        this.appRef.tick();
        window.setTimeout(() => {
          triggerPrint(() => { this.printMode = 'return'; this.appRef.tick(); });
        }, 150);
      },
      error: () => {
        this.detailLoading = false;
        this.printMode = 'return';
        this.appRef.tick();
        this.notify.error('تعذّر تحميل تفاصيل المرتجع للطباعة');
      }
    });
  }

}
