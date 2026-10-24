import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CustomerService } from '../../services/customer.service';
import { SupplierService } from '../../services/supplier.service';
import { PartyAccountingService } from '../../services/party-accounting.service';
import { PartyListItem } from '../../models/supplier.model';
import { PartyAccountingSummary, PartyStatementSummary } from '../../models/party-accounting.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type PartyKind = 'Customer' | 'Supplier';

// أنواع مستندات معروفة من /statement (documentType) — تُترجَم لعرض عربي مفهوم؛ أي نوع غير
// مدرَج هنا يُعرض كما وصل من الباك ايند بدل إخفائه أو كسر الصفحة.
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SalesInvoice: 'فاتورة مبيعات',
  Sales: 'فاتورة مبيعات',
  Purchase: 'فاتورة مشتريات',
  PurchaseInvoice: 'فاتورة مشتريات',
  Receipt: 'سند قبض',
  Payment: 'سند صرف',
  SalesReturn: 'مرتجع مبيعات',
  PurchaseReturn: 'مرتجع مشتريات',
  OpeningBalance: 'رصيد افتتاحي',
  AdvancePayment: 'سند صرف دفعة مقدمة',
  AdvanceReceipt: 'سند قبض دفعة مقدمة',
  CheckIssued: 'شيك صادر',
  CheckReceived: 'شيك وارد',
  Check: 'شيك',
};

@Component({
  selector: 'app-party-statement-page',
  templateUrl: './party-statement-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, InvoicePrintHeaderComponent, CustomSelectComponent,],
})
export class PartyStatementPageComponent implements OnInit {
  readonly today = new Date();

  kind: PartyKind = 'Customer';
  partyId = '';
  fromDate = '';
  toDate = '';

  customers: PartyListItem[] = [];
  suppliers: PartyListItem[] = [];

  // نداءان مستقلّان (accounting + statement) يُطلَقان معاً عند اختيار طرف — كل واحد بمؤشر
  // تحميل/خطأ خاص به بدل مؤشر واحد مشترك قد يُطفَأ قبل اكتمال الآخر أو يُظهر خطأً أحدهما
  // كأنه فشل الاثنين معاً رغم نجاح الآخر.
  accountingLoading = false;
  statementLoading = false;
  statementLoadError = false;
  accounting: PartyAccountingSummary | null = null;
  statement: PartyStatementSummary | null = null;

  get loading(): boolean { return this.accountingLoading || this.statementLoading; }

  quickActions = SALES_QUICK_ACTIONS;

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'العملاء والموردون' },
    { label: 'كشف حساب' },
  ];

  constructor(
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private partyAccountingService: PartyAccountingService,
    private notify: NotificationService,
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

  page = 1;
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];

  get totalPages(): number {
    if (!this.statement?.lines?.length) return 1;
    return Math.ceil(this.statement.lines.length / this.pageSize);
  }

  get pagedLines() {
    if (!this.statement?.lines) return [];
    const start = (this.page - 1) * this.pageSize;
    return this.statement.lines.slice(start, start + this.pageSize);
  }

  get startItemIndex(): number {
    if (!this.statement?.lines?.length) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get endItemIndex(): number {
    if (!this.statement?.lines?.length) return 0;
    return Math.min(this.page * this.pageSize, this.statement.lines.length);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
    }
  }

  onPageSizeChange(newSize: number | string): void {
    this.pageSize = Number(newSize) || 25;
    this.page = 1;
  }

  selectKind(kind: PartyKind) {
    if (this.kind === kind) return;
    this.kind = kind;
    this.partyId = '';
    this.accounting = null;
    this.statement = null;
    this.showPartyDropdown = false;
    this.partySearchText = '';
    this.page = 1;
  }

  showPartyDropdown = false;
  partySearchText = '';

  get filteredParties(): PartyListItem[] {
    if (!this.partySearchText.trim()) return this.parties;
    const q = this.partySearchText.toLowerCase();
    return this.parties.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }

  get selectedParty(): PartyListItem | undefined {
    return this.parties.find(p => p.id === this.partyId);
  }

  togglePartyDropdown(event: Event) {
    event.stopPropagation();
    this.showPartyDropdown = !this.showPartyDropdown;
    if (this.showPartyDropdown) {
      this.partySearchText = '';
    }
  }

  closePartyDropdown() {
    this.showPartyDropdown = false;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.showPartyDropdown) {
      this.showPartyDropdown = false;
    }
  }

  selectParty(p: PartyListItem) {
    this.partyId = p.id;
    this.showPartyDropdown = false;
    this.partySearchText = '';
    this.onPartySelected();
  }

  onPartySelected() {
    this.accounting = null;
    this.statement = null;
    this.page = 1;
    if (!this.partyId) return;
    this.loadAccounting();
    this.loadStatement();
  }

  // فلتر التاريخ يُعيد تحميل كشف الحساب فقط (لا داعي لإعادة تحميل معلومات الحساب المرتبط
  // في /accounting — لا تتأثر بفترة زمنية أصلاً).
  applyDateFilter() {
    if (!this.partyId) return;
    this.page = 1;
    this.loadStatement();
  }

  clearDateFilter() {
    this.fromDate = '';
    this.toDate = '';
    this.page = 1;
    if (this.partyId) this.loadStatement();
  }

  private loadAccounting() {
    this.accountingLoading = true;
    this.partyAccountingService.getAccounting(this.partyId).subscribe({
      next: s => { this.accounting = s; this.accountingLoading = false; },
      // لا يُعرَض كخطأ حاجب للصفحة — كشف الحساب التفصيلي (statement) هو المصدر الأساسي؛
      // فشل /accounting فقط يُخفي بطاقة "الحساب المرتبط" دون منع باقي الصفحة من العمل.
      error: () => { this.accountingLoading = false; },
    });
  }

  private loadStatement() {
    const partyId = this.partyId;
    if (!partyId) return;
    this.statementLoading = true;
    this.statementLoadError = false;
    this.partyAccountingService.getStatement(partyId, this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: s => { this.statement = s; this.statementLoading = false; },
      error: () => {
        this.statementLoadError = true;
        this.statementLoading = false;
        this.notify.error('تعذّر تحميل كشف الحساب');
      },
    });
  }

  documentTypeLabel(t: string): string {
    return DOCUMENT_TYPE_LABELS[t] || t;
  }

  partyTypeLabel(t: string): string {
    if (t === 'Customer') return 'عميل';
    if (t === 'Supplier') return 'مورد';
    return t;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  printStatement() {
    triggerPrint();
  }
}
