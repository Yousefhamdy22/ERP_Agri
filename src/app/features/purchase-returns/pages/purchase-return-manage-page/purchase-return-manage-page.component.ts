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
import { PurchaseReturnService } from '../../services/purchase-return.service';
import {
  PurchaseReturnListItem,
  PurchaseReturnDetailsDto,
  PURCHASE_RETURN_STATUS_LABELS,
  PURCHASE_RETURN_STATUS_BADGE,
} from '../../models/purchase-return.model';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  INVOICE_PAYMENT_STATUS_LABELS,
  INVOICE_PAYMENT_STATUS_BADGE,
} from '../../../invoices/models/invoice.model';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type SortField = 'invoiceDate' | 'invoiceNumber' | 'grandTotal' | 'supplierName';

@Component({
  selector: 'app-purchase-return-manage-page',
  templateUrl: './purchase-return-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class PurchaseReturnManagePageComponent implements OnInit {
  printMode: 'return' | 'deliveryNote' = 'return';
  allReturns: PurchaseReturnListItem[] = [];
  loading = false;
  loadError = false;

  status = '';
  search = '';
  sortBy: SortField = 'invoiceDate';
  descending = true;

  page = 1;
  pageSize = 20;

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'اضافة مرتجع', icon: 'fa-solid fa-plus', route: '/purchase-returns/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير مرتجع التوريد', route: '/sales?module=purchases&tab=main' },
    { label: 'ادارة فواتير مرتجع توريد' },
  ];

  selectedReturn: PurchaseReturnDetailsDto | null = null;
  detailLoading = false;

  confirming = false;
  openPeriodId = '';

  constructor(
    private purchaseReturnService: PurchaseReturnService,
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
    this.purchaseReturnService.getAll().subscribe({
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
          supplierName: item.supplierName || item.partyName || (item.party ? item.party.name : 'مورد غير محدد'),
        }));
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير مرتجع التوريد');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  get filtered(): PurchaseReturnListItem[] {
    const result = this.allReturns.filter(r => {
      if (this.status && r.status !== this.status) return false;
      if (this.search) {
        const q = this.search.trim().toLowerCase();
        const haystack = `${r.invoiceNumber} ${r.supplierName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy) {
        case 'invoiceDate': cmp = a.invoiceDate.localeCompare(b.invoiceDate); break;
        case 'invoiceNumber': cmp = a.invoiceNumber.localeCompare(b.invoiceNumber); break;
        case 'grandTotal': cmp = a.grandTotal - b.grandTotal; break;
        case 'supplierName': cmp = a.supplierName.localeCompare(b.supplierName); break;
      }
      return this.descending ? -cmp : cmp;
    });
  }

  get total(): number { return this.filtered.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pagedReturns(): PurchaseReturnListItem[] {
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  statusLabel(s: string): string { return INVOICE_STATUS_LABELS[s] ?? s; }
  statusBadgeClass(s: string): string { return INVOICE_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }
  paymentStatusLabel(s: string): string { return INVOICE_PAYMENT_STATUS_LABELS[s] ?? s; }
  paymentStatusBadgeClass(s: string): string { return INVOICE_PAYMENT_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  returnStatusLabel(s: string): string { return PURCHASE_RETURN_STATUS_LABELS[s as keyof typeof PURCHASE_RETURN_STATUS_LABELS] ?? s; }
  returnStatusBadgeClass(s: string): string { return PURCHASE_RETURN_STATUS_BADGE[s as keyof typeof PURCHASE_RETURN_STATUS_BADGE] ?? 'bg-gray-200 text-gray-800'; }

  openDetail(returnId: string) {
    this.detailLoading = true;
    this.selectedReturn = null;
    this.purchaseReturnService.getDetail(returnId).subscribe({
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

  printDeliveryNote() {
    this.printMode = 'deliveryNote';
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
    this.purchaseReturnService.confirmReturn(returnId, this.openPeriodId, userId).subscribe({
      next: (res: any) => {
        this.confirming = false;
        this.notify.success(`تم تأكيد وترحيل مرتجع التوريد بنجاح رقم: ${res || ''}`);
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
    const header = ['رقم الفاتورة', 'المورد', 'الإجمالي', 'المتبقي بعد المرتجع', 'المدفوع', 'التاريخ', 'الحالة', 'حالة السداد'];
    const dataRows = rows.map(r => [
      r.invoiceNumber, r.supplierName, r.grandTotal, r.amountOutstanding, r.amountPaid,
      this.formatDate(r.invoiceDate), this.statusLabel(r.status), this.paymentStatusLabel(r.paymentStatus || ''),
    ]);
    const csv = [header, ...dataRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printRowReturn(returnId: string) {
    this.printMode = 'return';
    this.detailLoading = true;
    this.selectedReturn = null;
    this.appRef.tick();
    this.purchaseReturnService.getDetail(returnId).subscribe({
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

  printRowDeliveryNote(returnId: string) {
    this.printMode = 'deliveryNote';
    this.detailLoading = true;
    this.selectedReturn = null;
    this.appRef.tick();
    this.purchaseReturnService.getDetail(returnId).subscribe({
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
