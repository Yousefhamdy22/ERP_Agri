import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { CustomerService } from '../../services/customer.service';
import { SupplierService } from '../../services/supplier.service';
import { PartyListItem } from '../../models/supplier.model';
import { PaymentService } from '../../../payments/services/payment.service';
import {
  PaymentListItem,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE,
} from '../../../payments/models/payment.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';

type PartyKind = 'Customer' | 'Supplier';

@Component({
  selector: 'app-party-payments-page',
  templateUrl: './party-payments-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent],
})
export class PartyPaymentsPageComponent implements OnInit {
  kind: PartyKind = 'Customer';
  customers: PartyListItem[] = [];
  suppliers: PartyListItem[] = [];
  search = '';
  selectedParty: PartyListItem | null = null;

  payments: PaymentListItem[] = [];
  loading = false;
  refreshing = false;
  loadError = false;

  page = 1;
  pageSize = 10;
  total = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  // عرض دفعات الطرف غير المخصَّصة فقط — GET /payments/unallocated/party/{id}، لا فلتر مكافئ
  // له في /payments/party/{id} العادية.
  unallocatedOnly = false;

  quickActions = SALES_QUICK_ACTIONS;

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'العملاء والموردون' },
    { label: 'دفعات عميل / مورد' },
  ];

  constructor(
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit() {
    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; }, error: () => {} });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });
  }

  get parties(): PartyListItem[] {
    return this.kind === 'Customer' ? this.customers : this.suppliers;
  }

  get partyLabel(): string {
    return this.kind === 'Customer' ? 'العميل' : 'المورد';
  }

  get filteredParties(): PartyListItem[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.parties;
    return this.parties.filter(p => p.name.toLowerCase().includes(q));
  }

  selectKind(kind: PartyKind) {
    if (this.kind === kind) return;
    this.kind = kind;
    this.changeParty();
  }

  selectParty(party: PartyListItem) {
    this.selectedParty = party;
    this.search = '';
    this.unallocatedOnly = false;
    this.page = 1;
    this.load();
  }

  changeParty() {
    this.selectedParty = null;
    this.search = '';
    this.payments = [];
    this.total = 0;
    this.loadError = false;
  }

  load() {
    if (!this.selectedParty) return;
    const partyId = this.selectedParty.id;
    this.loading = this.payments.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;

    const source$ = this.unallocatedOnly
      ? this.paymentService.getUnallocatedByParty(partyId, this.page, this.pageSize)
      : this.paymentService.getByParty(partyId, this.page, this.pageSize);

    source$.subscribe({
      next: r => {
        this.payments = r.items;
        this.total = r.total;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  toggleUnallocatedOnly() {
    if (!this.selectedParty) return;
    this.unallocatedOnly = !this.unallocatedOnly;
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string { return new Date(iso).toLocaleDateString('ar-EG'); }
  methodLabel(m: string): string { return PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? m; }
  methodIcon(m: string): string { return PAYMENT_METHOD_ICONS[m as keyof typeof PAYMENT_METHOD_ICONS] ?? 'fa-solid fa-money-bill'; }
  statusLabel(s: string): string { return PAYMENT_STATUS_LABELS[s as keyof typeof PAYMENT_STATUS_LABELS] ?? s; }
  statusBadgeClass(s: string): string { return PAYMENT_STATUS_BADGE[s as keyof typeof PAYMENT_STATUS_BADGE] ?? 'bg-gray-200 text-gray-800'; }
}
