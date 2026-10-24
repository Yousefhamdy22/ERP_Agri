import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { PurchaseJournalService } from '../../services/purchase-journal.service';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';
import {
  PurchaseJournalDto,
  PurchaseJournalType,
  PurchaseJournalStatus,
  PURCHASE_JOURNAL_TYPE_LABELS,
  PURCHASE_JOURNAL_TYPE_BADGE,
  PURCHASE_JOURNAL_STATUS_LABELS,
  PURCHASE_JOURNAL_STATUS_BADGE,
} from '../../models/purchase-journal.model';

type TypeFilter = '' | PurchaseJournalType;
type StatusFilter = '' | PurchaseJournalStatus;
type SortField = 'entryDate' | 'entryNumber' | 'amount' | 'supplierName';

@Component({
  selector: 'app-purchase-journal-manage-page',
  templateUrl: './purchase-journal-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class PurchaseJournalManagePageComponent implements OnInit {
  // نقاط GET هنا (period/{id}, All) ترجع مصفوفة مسطّحة بلا فلترة/ترتيب/ترقيم صفحات
  // موثّق على الخادم، فتُنفَّذ جميعها هنا في الواجهة على القائمة الكاملة المحمَّلة.
  allJournals: PurchaseJournalDto[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  loading = false;
  loadError = false;

  periodId = '';
  type: TypeFilter = '';
  status: StatusFilter = '';
  fromDate = '';
  toDate = '';
  search = '';
  sortBy: SortField = 'entryDate';
  descending = true;

  typeOptions: { value: TypeFilter; label: string }[] = [
    { value: '', label: 'كل الأنواع' },
    ...(Object.entries(PURCHASE_JOURNAL_TYPE_LABELS) as [PurchaseJournalType, string][]).map(([value, label]) => ({ value, label })),
  ];

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    ...(Object.entries(PURCHASE_JOURNAL_STATUS_LABELS) as [PurchaseJournalStatus, string][]).map(([value, label]) => ({ value, label })),
  ];

  sortOptions: { value: SortField; label: string }[] = [
    { value: 'entryDate', label: 'التاريخ' },
    { value: 'entryNumber', label: 'رقم القيد' },
    { value: 'amount', label: 'المبلغ' },
    { value: 'supplierName', label: 'اسم المورد' },
  ];

  page = 1;
  pageSize = 20;

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'ادارة فواتير التوريد', icon: 'fa-solid fa-file-invoice', route: '/invoices/purchase/manage' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الحسابات', route: '/sales?module=accounts&tab=main' },
    { label: 'ادارة دفاتر المشتريات' },
  ];

  selectedJournal: PurchaseJournalDto | null = null;
  detailLoading = false;

  constructor(
    private journalService: PurchaseJournalService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.fiscalPeriodService.getAll().subscribe({ next: p => { this.fiscalPeriods = p; }, error: () => {} });
    this.load();
  }

  load() {
    this.loading = this.allJournals.length === 0 && !this.loadError;
    this.loadError = false;
    const source = this.periodId ? this.journalService.getByPeriod(this.periodId) : this.journalService.getAll();
    source.subscribe({
      next: journals => {
        this.allJournals = journals;
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل دفاتر المشتريات');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  get filtered(): PurchaseJournalDto[] {
    const result = this.allJournals.filter(j => {
      if (this.type && j.type !== this.type) return false;
      if (this.status && j.status !== this.status) return false;
      if (this.fromDate && j.entryDate < this.fromDate) return false;
      if (this.toDate && j.entryDate > this.toDate) return false;
      if (this.search) {
        const q = this.search.trim().toLowerCase();
        const haystack = `${j.entryNumber} ${j.supplierName ?? ''} ${j.invoiceNumber ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy) {
        case 'entryDate': cmp = a.entryDate.localeCompare(b.entryDate); break;
        case 'entryNumber': cmp = a.entryNumber.localeCompare(b.entryNumber); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'supplierName': cmp = (a.supplierName ?? '').localeCompare(b.supplierName ?? ''); break;
      }
      return this.descending ? -cmp : cmp;
    });
  }

  get total(): number { return this.filtered.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pagedJournals(): PurchaseJournalDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  onFilterChange() { this.page = 1; }
  onPeriodChange() { this.page = 1; this.load(); }

  toggleSortDirection() { this.descending = !this.descending; }

  clearFilters() {
    this.periodId = '';
    this.type = '';
    this.status = '';
    this.fromDate = '';
    this.toDate = '';
    this.search = '';
    this.sortBy = 'entryDate';
    this.descending = true;
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage) this.page++; }
  prevPage() { if (this.hasPreviousPage) this.page--; }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  typeLabel(t: string): string { return PURCHASE_JOURNAL_TYPE_LABELS[t as PurchaseJournalType] ?? t; }
  typeBadgeClass(t: string): string { return PURCHASE_JOURNAL_TYPE_BADGE[t as PurchaseJournalType] ?? 'bg-gray-200 text-gray-800'; }
  statusLabel(s: string): string { return PURCHASE_JOURNAL_STATUS_LABELS[s as PurchaseJournalStatus] ?? s; }
  statusBadgeClass(s: string): string { return PURCHASE_JOURNAL_STATUS_BADGE[s as PurchaseJournalStatus] ?? 'bg-gray-200 text-gray-800'; }

  openDetail(journalId: string) {
    this.detailLoading = true;
    this.selectedJournal = null;
    this.journalService.getDetail(journalId).subscribe({
      next: j => { this.selectedJournal = j; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل الدفتر'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedJournal = null; }

  printJournal() { window.print(); }

  exportCsv() {
    const rows = this.filtered;
    if (!rows.length) { this.notify.info('لا توجد بيانات للتصدير'); return; }
    const header = ['رقم القيد', 'النوع', 'المورد', 'المبلغ', 'التاريخ', 'رقم الفاتورة', 'الحالة'];
    const dataRows = rows.map(j => [
      j.entryNumber, this.typeLabel(j.type), j.supplierName || '', j.amount, this.formatDate(j.entryDate),
      j.invoiceNumber || '', this.statusLabel(j.status),
    ]);
    const csv = [header, ...dataRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-journals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
