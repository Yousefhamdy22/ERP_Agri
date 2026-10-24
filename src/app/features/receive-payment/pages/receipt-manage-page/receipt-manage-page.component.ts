import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ReceivePaymentService, ReceiptListFilter } from '../../services/receive-payment.service';
import { RECEIPT_PAYMENT_METHODS, ReceiptDetail, ReceiptListItem } from '../../models/receive-payment.model';
import { RECEIVE_PAYMENT_QUICK_ACTIONS } from '../../../../shared/data/receive-payment-quick-actions';

@Component({
  selector: 'app-receipt-manage-page',
  templateUrl: './receipt-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent],
})
export class ReceiptManagePageComponent implements OnInit, OnDestroy {
  receipts: ReceiptListItem[] = [];
  loading = false;      // true only for the very first fetch (no rows to show yet)
  refreshing = false;   // true for every fetch after that — table stays visible underneath
  loadError = false;

  search = '';

  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = RECEIVE_PAYMENT_QUICK_ACTIONS;
  topButton = { label: 'استلام دفعة', icon: 'fa-solid fa-plus', route: '/receive-payment/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'المدفوعات والمقبوضات', route: '/sales?module=accounts&tab=main' },
    { label: 'ادارة الإيصالات' },
  ];

  selectedReceipt: ReceiptDetail | null = null;
  detailLoading = false;

  private search$ = new Subject<string>();

  constructor(
    private receivePaymentService: ReceivePaymentService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number): ReceiptListFilter {
    return { page, pageSize: this.pageSize, search: this.search || undefined };
  }

  load() {
    this.loading = this.receipts.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.receivePaymentService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        this.receipts = r.items;
        this.total = r.total;
        this.totalPages = r.totalPages;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل الإيصالات');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.receivePaymentService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  clearFilters() {
    this.search = '';
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  paymentMethodLabel(m: string): string {
    return RECEIPT_PAYMENT_METHODS.find(p => p.value === m)?.label ?? m;
  }

  openDetail(id: string) {
    this.detailLoading = true;
    this.selectedReceipt = null;
    this.receivePaymentService.getDetail(id).subscribe({
      next: detail => { this.selectedReceipt = detail; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل الإيصال'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedReceipt = null; }
}
