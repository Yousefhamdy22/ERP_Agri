import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { AccountService } from '../../../../shared/services/account.service';
import { Account } from '../../../../shared/models/account.model';
import { SupplierService } from '../../../parties/services/supplier.service';
import { CustomerService } from '../../../parties/services/customer.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { OpeningBalanceService } from '../../services/opening-balance.service';
import {
  OpeningBalanceListItem,
  OpeningBalanceStatus,
  BalanceSide,
  BALANCE_SIDE_LABELS,
  OPENING_BALANCE_STATUS_LABELS,
  OPENING_BALANCE_STATUS_BADGE,
} from '../../models/opening-balance.model';
import {
  OpeningBalanceCategory,
  OpeningBalanceSource,
  OPENING_BALANCE_CATEGORY_LABELS,
  OPENING_BALANCE_SOURCE_LABELS,
  OPENING_BALANCE_SOURCE_ICONS,
  OPENING_BALANCE_SOURCE_BADGE,
} from '../../../../shared/models/accounting-enums.model';
import { OPENING_BALANCE_QUICK_ACTIONS } from '../../../../shared/data/opening-balance-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

const SORT_BY_OPTIONS = [
  { value: 'date', label: 'التاريخ' },
  { value: 'amount', label: 'المبلغ' },
  { value: 'accountCode', label: 'كود الحساب' },
  { value: 'status', label: 'الحالة' },
];

@Component({
  selector: 'app-opening-balance-manage-page',
  templateUrl: './opening-balance-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class OpeningBalanceManagePageComponent implements OnInit, OnDestroy {
  branches: BranchListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  accounts: Account[] = [];
  suppliers: PartyListItem[] = [];
  customers: PartyListItem[] = [];
  branchesLoading = true;
  fiscalPeriodsLoading = true;
  accountsLoading = true;
  branchesError = false;
  fiscalPeriodsError = false;
  accountsError = false;

  branchId = '';
  fiscalPeriodId = '';
  accountId = '';
  balanceType: '' | OpeningBalanceCategory = '';
  status: '' | OpeningBalanceStatus = '';
  source: '' | OpeningBalanceSource = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  fromDate = '';
  toDate = '';
  sortBy = 'date';
  sortAscending = false;
  search = '';

  showMoreFilters = false;

  categoryOptions: { value: '' | OpeningBalanceCategory; label: string }[] = [
    { value: '', label: 'كل التصنيفات' },
    ...(Object.entries(OPENING_BALANCE_CATEGORY_LABELS) as [OpeningBalanceCategory, string][]).map(([value, label]) => ({ value, label })),
  ];
  statusOptions: { value: '' | OpeningBalanceStatus; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    ...(Object.entries(OPENING_BALANCE_STATUS_LABELS) as [OpeningBalanceStatus, string][]).map(([value, label]) => ({ value, label })),
  ];
  sourceOptions: { value: '' | OpeningBalanceSource; label: string }[] = [
    { value: '', label: 'كل المصادر' },
    ...(Object.entries(OPENING_BALANCE_SOURCE_LABELS) as [OpeningBalanceSource, string][]).map(([value, label]) => ({ value, label })),
  ];
  sortByOptions = SORT_BY_OPTIONS;

  balances: OpeningBalanceListItem[] = [];
  loading = false;
  refreshing = false;
  loadError = false;

  page = 1;
  pageSize = 10;
  total = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = OPENING_BALANCE_QUICK_ACTIONS;
  topButton = { label: 'اضافة رصيد افتتاحي', icon: 'fa-solid fa-plus', route: '/opening-balance/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'رصيد اول المدة', route: '/sales?module=opening-balance&tab=def' },
    { label: 'ادارة الأرصدة الافتتاحية' },
  ];

  deletingBalance: OpeningBalanceListItem | null = null;
  deleteLoading = false;

  confirmingBalance: OpeningBalanceListItem | null = null;
  confirmSingleLoading = false;

  revertingBalance: OpeningBalanceListItem | null = null;
  revertLoading = false;

  private search$ = new Subject<string>();

  constructor(
    private openingBalanceService: OpeningBalanceService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private accountService: AccountService,
    private supplierService: SupplierService,
    private customerService: CustomerService,
    private notify: NotificationService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.loadLookups();
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  private loadLookups() {
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; this.branchesLoading = false; },
      error: () => { this.branchesError = true; this.branchesLoading = false; },
    });
    this.fiscalPeriodService.getAll().subscribe({
      next: p => { this.fiscalPeriods = p; this.fiscalPeriodsLoading = false; },
      error: () => { this.fiscalPeriodsError = true; this.fiscalPeriodsLoading = false; },
    });
    this.accountService.getSelectable().subscribe({
      next: a => { this.accounts = a; this.accountsLoading = false; },
      error: () => { this.accountsError = true; this.accountsLoading = false; },
    });
    this.supplierService.getAll().subscribe({
      next: r => { this.suppliers = r.items; },
      error: () => {},
    });
    this.customerService.getAll().subscribe({
      next: r => { this.customers = r.items; },
      error: () => {},
    });
  }

  retryLookups() {
    this.branchesLoading = true;
    this.fiscalPeriodsLoading = true;
    this.accountsLoading = true;
    this.branchesError = false;
    this.fiscalPeriodsError = false;
    this.accountsError = false;
    this.loadLookups();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number) {
    return {
      page,
      pageSize: this.pageSize,
      branchId: this.branchId || undefined,
      fiscalPeriodId: this.fiscalPeriodId || undefined,
      accountId: this.accountId || undefined,
      balanceType: this.balanceType || undefined,
      status: this.status || undefined,
      source: this.source || undefined,
      minAmount: this.minAmount ?? undefined,
      maxAmount: this.maxAmount ?? undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      sortBy: this.sortBy,
      sortAscending: this.sortAscending,
      search: this.search || undefined,
    };
  }

  load() {
    this.loading = this.balances.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.openingBalanceService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        this.balances = r.items;
        this.total = r.total;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل الأرصدة الافتتاحية');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.openingBalanceService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
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
    this.branchId = '';
    this.fiscalPeriodId = '';
    this.accountId = '';
    this.balanceType = '';
    this.status = '';
    this.source = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.fromDate = '';
    this.toDate = '';
    this.sortBy = 'date';
    this.sortAscending = false;
    this.search = '';
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  toggleSortDirection() { this.sortAscending = !this.sortAscending; this.onFilterChange(); }

  sideLabel(s: string | null): string { return s ? (BALANCE_SIDE_LABELS[s as keyof typeof BALANCE_SIDE_LABELS] ?? s) : '—'; }
  statusLabel(s: string): string { return OPENING_BALANCE_STATUS_LABELS[s as keyof typeof OPENING_BALANCE_STATUS_LABELS] ?? s; }
  statusBadgeClass(s: string): string { return OPENING_BALANCE_STATUS_BADGE[s as keyof typeof OPENING_BALANCE_STATUS_BADGE] ?? 'bg-gray-200 text-gray-800'; }
  // b.source هو OpeningBalanceSource الحقيقي (يدوي/مُرحَّل فقط) — لا يوجد حقل تصنيف حساب
  // (OpeningBalanceCategory) في استجابة القائمة إطلاقاً، فقط قابل للفلترة عبر balanceType.
  sourceLabel(s: string): string { return OPENING_BALANCE_SOURCE_LABELS[s as keyof typeof OPENING_BALANCE_SOURCE_LABELS] ?? s; }
  sourceIcon(s: string): string { return OPENING_BALANCE_SOURCE_ICONS[s as keyof typeof OPENING_BALANCE_SOURCE_ICONS] ?? 'fa-solid fa-circle'; }
  sourceBadgeClass(s: string): string { return OPENING_BALANCE_SOURCE_BADGE[s as keyof typeof OPENING_BALANCE_SOURCE_BADGE] ?? 'bg-gray-100 text-gray-700'; }

  openDelete(b: OpeningBalanceListItem) { this.deletingBalance = b; }
  closeDelete() { this.deletingBalance = null; }

  confirmDelete() {
    if (!this.deletingBalance) return;
    this.deleteLoading = true;
    this.openingBalanceService.delete(this.deletingBalance.id).subscribe({
      next: () => {
        this.notify.success('تم حذف الرصيد الافتتاحي');
        this.deleteLoading = false;
        this.deletingBalance = null;
        this.load();
      },
      error: () => {
        this.notify.error('تعذّر حذف الرصيد الافتتاحي');
        this.deleteLoading = false;
      },
    });
  }

  openConfirmSingle(b: OpeningBalanceListItem) { this.confirmingBalance = b; }
  closeConfirmSingle() {
    if (this.confirmSingleLoading) return;
    this.confirmingBalance = null;
  }

  // تأكيد رصيد واحد فردياً — بجانب "تأكيد الأرصدة الافتتاحية" الجماعي (confirmAll) بلا أي
  // تعديل عليه. الصف يُحدَّث من المرجع المحلي balance مباشرة بعد النجاح بدل البحث بمعرِّف من
  // الاستجابة (نفس درس خطأ result.paymentId سابقاً مع اعتماد/ترحيل الدفعات — أسماء حقول
  // نقاط غير مؤكَّدة حياً قد لا تطابق الافتراض، والمرجع المحلي مضمون دائماً).
  confirmSingle() {
    if (!this.confirmingBalance) return;
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الرصيد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    const balance = this.confirmingBalance;
    this.confirmSingleLoading = true;
    this.openingBalanceService.confirmSingle(balance.id, userId).subscribe({
      next: res => {
        this.confirmSingleLoading = false;
        this.confirmingBalance = null;
        balance.status = res.status || 'Confirmed';
        this.notify.success(res.journalNumber ? `تم تأكيد الرصيد الافتتاحي — رقم القيد: ${res.journalNumber}` : 'تم تأكيد الرصيد الافتتاحي بنجاح');
      },
      error: err => {
        this.confirmSingleLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تأكيد الرصيد الافتتاحي'));
      },
    });
  }

  openRevert(b: OpeningBalanceListItem) { this.revertingBalance = b; }
  closeRevert() {
    if (this.revertLoading) return;
    this.revertingBalance = null;
  }

  revertSingle() {
    if (!this.revertingBalance) return;
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن إرجاع الرصيد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    const balance = this.revertingBalance;
    this.revertLoading = true;
    this.openingBalanceService.revertSingle(balance.id, userId).subscribe({
      next: res => {
        this.revertLoading = false;
        this.revertingBalance = null;
        balance.status = res.status || 'Draft';
        this.notify.success('تم إرجاع الرصيد الافتتاحي للمسودة بنجاح');
      },
      error: err => {
        this.revertLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إرجاع الرصيد الافتتاحي'));
      },
    });
  }

  // ── Edit modal ──
  editingBalance: OpeningBalanceListItem | null = null;
  editLoading = false;
  editAmount: number = 0;
  editSide: BalanceSide = 'Debit';
  editNotes: string = '';
  editQuantity: number | null = null;
  editUnitPrice: number | null = null;
  editPartyId: string = '';

  openEdit(b: OpeningBalanceListItem) {
    this.editingBalance = b;
    this.editAmount = b.amount;
    this.editSide = b.balanceType;
    this.editNotes = '';
    this.editQuantity = b.quantity ?? null;
    this.editUnitPrice = b.unitPrice ?? null;
    this.editPartyId = b.partyId || '';
  }

  closeEdit() {
    if (this.editLoading) return;
    this.editingBalance = null;
  }

  get isInventoryEdit(): boolean {
    return this.editingBalance?.source === 'Inventory' && this.editingBalance?.productName != null;
  }

  get isPartyEdit(): boolean {
    return this.editingBalance?.source === 'Supplier' || this.editingBalance?.source === 'Customer' || (this.editingBalance?.partyId != null && this.editingBalance?.partyId !== '');
  }

  saveEdit() {
    if (!this.editingBalance) return;
    this.editLoading = true;

    const finalAmount = this.isInventoryEdit && this.editQuantity != null && this.editUnitPrice != null
      ? this.editQuantity * this.editUnitPrice
      : this.editAmount;

    this.openingBalanceService.update({
      id: this.editingBalance.id,
      amount: finalAmount,
      side: this.editSide,
      notes: this.editNotes || null,
      quantity: this.isInventoryEdit ? this.editQuantity : null,
      unitPrice: this.isInventoryEdit ? this.editUnitPrice : null,
      partyId: this.editPartyId || null,
    }).subscribe({
      next: () => {
        this.editLoading = false;
        this.editingBalance = null;
        this.notify.success('تم تحديث الرصيد الافتتاحي بنجاح');
        this.load();
      },
      error: err => {
        this.editLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تحديث الرصيد الافتتاحي'));
      },
    });
  }

  confirming = false;

  confirmAll() {
    let targetPeriodId = this.fiscalPeriodId;
    if (!targetPeriodId) {
      const openPeriod = this.fiscalPeriods.find(p => p.status === 'Open');
      if (openPeriod) {
        targetPeriodId = openPeriod.id;
      } else {
        this.notify.error('يرجى اختيار الفترة المالية من الفلاتر أولاً لتأكيد أرصدتها');
        return;
      }
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الأرصدة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    if (!confirm('هل تريد تأكيد كل الأرصدة الافتتاحية المسودة لهذه الفترة المالية؟ سيقوم هذا بإنشاء قيود يومية.')) return;

    this.confirming = true;
    this.openingBalanceService.confirm(targetPeriodId, userId).subscribe({
      next: res => {
        this.confirming = false;
        const count = typeof res === 'number' ? res : (res.value ?? 0);
        this.notify.success(`تم تأكيد ${count} أرصدة افتتاحية بنجاح!`);
        this.load();
      },
      error: err => {
        this.confirming = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تأكيد الأرصدة الافتتاحية'));
      }
    });
  }
}
