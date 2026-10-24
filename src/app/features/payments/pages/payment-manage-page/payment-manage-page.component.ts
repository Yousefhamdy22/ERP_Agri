import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { CustomerService } from '../../../parties/services/customer.service';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { SalesInvoiceService } from '../../../invoices/services/sales-invoice.service';
import { PurchaseInvoiceService } from '../../../invoices/services/purchase-invoice.service';
import { PaymentService } from '../../services/payment.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import {
  PaymentListItem,
  PaymentDetailDto,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_BADGE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE,
} from '../../models/payment.model';
import { PAYMENTS_QUICK_ACTIONS } from '../../../../shared/data/payments-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | PaymentStatus;
type MethodFilter = '' | PaymentMethod;
type TypeFilter = '' | PaymentType;

// صف فاتورة قابلة للتخصيص — نفس تركيبة AllocatableRow في صفحة إضافة دفعة
// (payment-add-page)، لكن هنا لتخصيص إضافي على دفعة Pending موجودة بالفعل بدل الإنشاء.
interface AllocatableRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  selected: boolean;
  allocatedAmount: number;
  discountTaken: number;
}

@Component({
  selector: 'app-payment-manage-page',
  templateUrl: './payment-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class PaymentManagePageComponent implements OnInit, OnDestroy {
  branches: BranchListItem[] = [];
  parties: PartyListItem[] = [];

  branchId = '';
  partyId = '';
  status: StatusFilter = '';
  method: MethodFilter = '';
  type: TypeFilter = '';
  fromDate = '';
  toDate = '';
  search = '';
  descending = true;

  // فلتر "غير مخصَّصة فقط" — يعتمد على GET /payments/unallocated/party/{partyId}، وهو
  // نقطة مستقلة عن /list بلا فلتر مكافئ فيها، لذا يُتاح فقط عند اختيار طرف محدد.
  unallocatedOnly = false;

  private search$ = new Subject<string>();

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    ...(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([value, label]) => ({ value, label })),
  ];

  methodOptions: { value: MethodFilter; label: string }[] = [
    { value: '', label: 'كل الطرق' },
    ...(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => ({ value, label })),
  ];

  typeOptions: { value: TypeFilter; label: string }[] = [
    { value: '', label: 'كل الأنواع' },
    ...(Object.entries(PAYMENT_TYPE_LABELS) as [PaymentType, string][]).map(([value, label]) => ({ value, label })),
  ];

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

  quickActions = PAYMENTS_QUICK_ACTIONS;
  topButton = { label: 'اضافة دفعة', icon: 'fa-solid fa-plus', route: '/payments/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الحسابات', route: '/sales?module=accounts&tab=main' },
    { label: 'ادارة الدفعات' },
  ];

  selectedPayment: PaymentDetailDto | null = null;
  detailLoading = false;
  actionLoading = false;
  cancelReason = '';
  cancellingPayment: PaymentDetailDto | null = null;

  // تخصيص فواتير إضافية على دفعة Pending موجودة — منفصل عمداً عن تخصيص الإنشاء
  // (payment-add-page): هنا الفواتير المخصَّصة سابقاً (p.allocations) تُستبعَد من قائمة
  // الاختيار وتُعرَض للقراءة فقط، ويُطلَب أن يساوي إجمالي التخصيص الجديد بالضبط
  // "المبلغ المتبقي غير المخصَّص" من مبلغ الدفعة (amount - إجمالي المخصَّص سابقاً)
  // بدل مبلغ الدفعة كاملاً، تجنباً لتكرار احتساب التخصيصات القديمة.
  allocatingPayment: PaymentDetailDto | null = null;
  allocationRows: AllocatableRow[] = [];
  allocationSearch = '';
  loadingAllocationInvoices = false;
  allocating = false;

  constructor(
    private paymentService: PaymentService,
    private branchService: BranchService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private salesInvoiceService: SalesInvoiceService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const partyIdParam = this.route.snapshot.queryParamMap.get('partyId');
    if (partyIdParam) this.partyId = partyIdParam;

    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length && !this.branchId) {
          this.branchId = b[0].id;
          this.load();
        }
      },
      error: () => {},
    });
    this.customerService.getAll().subscribe({ next: r => { this.parties = [...this.parties, ...r.items]; }, error: () => {} });
    this.supplierService.getAll().subscribe({ next: r => { this.parties = [...this.parties, ...r.items]; }, error: () => {} });
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildQuery(page: number) {
    return {
      page,
      pageSize: this.pageSize,
      branchId: this.branchId || undefined,
      partyId: this.partyId || undefined,
      status: this.status || undefined,
      method: this.method || undefined,
      type: this.type || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      searchText: this.search || undefined,
      sortDescending: this.descending,
    };
  }

  load() {
    this.loading = this.payments.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;

    const source$ = this.unallocatedOnly && this.partyId
      ? this.paymentService.getUnallocatedByParty(this.partyId, this.page, this.pageSize)
      : this.paymentService.getList(this.buildQuery(this.page));

    source$.subscribe({
      next: r => {
        this.payments = r.items;
        this.total = r.total;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل الدفعات');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    const next$ = this.unallocatedOnly && this.partyId
      ? this.paymentService.getUnallocatedByParty(this.partyId, this.page + 1, this.pageSize)
      : this.paymentService.getList(this.buildQuery(this.page + 1));
    next$.subscribe({ error: () => {} });
  }

  toggleUnallocatedOnly() {
    if (!this.partyId) return;
    this.unallocatedOnly = !this.unallocatedOnly;
    this.page = 1;
    this.load();
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  toggleSortDirection() {
    this.descending = !this.descending;
    this.onFilterChange();
  }

  onBranchChange() {
    this.page = 1;
    this.load();
  }

  onFilterChange() {
    if (!this.partyId) this.unallocatedOnly = false;
    this.page = 1;
    this.load();
  }

  clearFilters() {
    this.partyId = '';
    this.status = '';
    this.method = '';
    this.type = '';
    this.fromDate = '';
    this.toDate = '';
    this.search = '';
    this.descending = true;
    this.unallocatedOnly = false;
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  typeLabel(t: string): string { return PAYMENT_TYPE_LABELS[t as keyof typeof PAYMENT_TYPE_LABELS] ?? t; }
  typeBadgeClass(t: string): string { return PAYMENT_TYPE_BADGE[t as keyof typeof PAYMENT_TYPE_BADGE] ?? 'bg-gray-100 text-gray-800'; }
  methodLabel(m: string): string { return PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? m; }
  methodIcon(m: string): string { return PAYMENT_METHOD_ICONS[m as keyof typeof PAYMENT_METHOD_ICONS] ?? 'fa-solid fa-money-bill'; }
  statusLabel(s: string): string { return PAYMENT_STATUS_LABELS[s as keyof typeof PAYMENT_STATUS_LABELS] ?? s; }
  statusBadgeClass(s: string): string { return PAYMENT_STATUS_BADGE[s as keyof typeof PAYMENT_STATUS_BADGE] ?? 'bg-gray-200 text-gray-800'; }

  openDetail(paymentId: string) {
    this.detailLoading = true;
    this.selectedPayment = null;
    this.paymentService.getDetail(paymentId).subscribe({
      next: p => { this.selectedPayment = p; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل الدفعة'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedPayment = null; }

  // الباك ايند CQRS — نقطة القائمة (getList) قد تتأخر لحظات عن انعكاس نتيجة أمر
  // approve/post/cancel (read model منفصل عن الـ write model)، فيبدو للمستخدم أن الحالة
  // "لا تتحدّث إلا بعد أكثر من تحديث". لتفادي الاعتماد على توقيت الباك ايند، تُحدَّث حالة
  // الصف محلياً فوراً من نتيجة الأمر نفسه (result.status) — بدون إعادة استدعاء load()
  // بعدها مباشرة، لأن ذلك قد يُعيد نفس القائمة القديمة من read model لم يتحدَّث بعد
  // ويُلغي هذا الإصلاح بالضبط. الصف يبقى صحيحاً حتى أي تحديث/فلترة تالية طبيعية.
  private patchLocalStatus(paymentId: string | undefined, status: PaymentStatus) {
    if (!paymentId) return;
    const row = this.payments.find(p => p.id === paymentId);
    if (row) row.status = status;
  }

  approvePayment() {
    if (!this.selectedPayment) return;
    const isDirectCheckOrAdvance = this.selectedPayment.type === 'AdvancePayment' ||
                                   this.selectedPayment.type === 'CheckIssued' ||
                                   this.selectedPayment.type === 'CheckReceived';
    if (this.selectedPayment.allocations.length === 0 && !isDirectCheckOrAdvance) {
      this.notify.error('لا يمكن اعتماد الدفعة قبل تخصيص فاتورة واحدة على الأقل');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن اعتماد الدفعة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm(`تأكيد اعتماد الدفعة ${this.selectedPayment.paymentNumber} بمبلغ ${this.selectedPayment.amount}؟`)) return;

    this.actionLoading = true;
    this.paymentService.approve(this.selectedPayment.id, userId).subscribe({
      next: result => {
        this.notify.success('تم اعتماد الدفعة');
        this.actionLoading = false;
        this.patchLocalStatus(result.id ?? result.paymentId, result.status);
        this.closeDetail();
      },
      error: err => { this.notify.error(friendlyErrorMessage(err, 'تعذّر اعتماد الدفعة')); this.actionLoading = false; },
    });
  }

  postPayment() {
    if (!this.selectedPayment) return;
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن ترحيل الدفعة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm('تأكيد الترحيل إلى دفتر الأستاذ؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    this.actionLoading = true;
    this.paymentService.post(this.selectedPayment.id, userId).subscribe({
      next: result => {
        this.notify.success('تم ترحيل الدفعة بنجاح');
        this.actionLoading = false;
        this.patchLocalStatus(result.id ?? result.paymentId, result.status);
        this.closeDetail();
      },
      error: err => { this.notify.error(friendlyErrorMessage(err, 'تعذّر ترحيل الدفعة')); this.actionLoading = false; },
    });
  }

  openCancel() {
    if (!this.selectedPayment) return;
    this.cancellingPayment = this.selectedPayment;
    this.cancelReason = '';
  }

  closeCancel() { this.cancellingPayment = null; }

  confirmCancel() {
    if (!this.cancellingPayment) return;
    if (!this.cancelReason.trim()) { this.notify.error('أدخل سبب الإلغاء'); return; }

    this.actionLoading = true;
    this.paymentService.cancel(this.cancellingPayment.id, this.cancelReason.trim()).subscribe({
      next: result => {
        this.notify.success('تم إلغاء الدفعة');
        this.actionLoading = false;
        this.patchLocalStatus(result.id ?? result.paymentId, result.status);
        this.cancellingPayment = null;
        this.closeDetail();
      },
      error: err => { this.notify.error(friendlyErrorMessage(err, 'تعذّر إلغاء الدفعة')); this.actionLoading = false; },
    });
  }

  editingPayment: PaymentDetailDto | null = null;
  editPaymentLoading = false;
  editPaymentNumber = '';
  editPaymentAmount = 0;
  editPaymentDate = '';
  editPaymentMethod: PaymentMethod = 'Cash';
  editPaymentType: PaymentType = 'Receipt';
  editPaymentReference = '';

  editMethodOptions = (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => ({ value, label }));
  editTypeOptions = (Object.entries(PAYMENT_TYPE_LABELS) as [PaymentType, string][]).map(([value, label]) => ({ value, label }));

  openEdit(p: PaymentDetailDto) {
    this.editingPayment = p;
    this.editPaymentNumber = p.paymentNumber;
    this.editPaymentAmount = p.amount;
    this.editPaymentDate = p.paymentDate.slice(0, 10);
    this.editPaymentMethod = p.method;
    this.editPaymentType = p.type;
    this.editPaymentReference = p.reference === 'N/A' ? '' : (p.reference || '');
  }

  closeEdit() {
    if (this.editPaymentLoading) return;
    this.editingPayment = null;
  }

  saveEdit() {
    if (!this.editingPayment) return;
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ التعديلات: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.editPaymentLoading = true;
    this.paymentService.update({
      paymentId: this.editingPayment.id,
      userId,
      paymentNumber: this.editPaymentNumber,
      amount: this.editPaymentAmount,
      method: this.editPaymentMethod,
      type: this.editPaymentType,
      paymentDate: new Date(this.editPaymentDate).toISOString(),
      reference: this.editPaymentReference || null,
      allocations: null
    }).subscribe({
      next: updated => {
        this.editPaymentLoading = false;
        this.editingPayment = null;
        this.notify.success('تم تحديث الدفعة بنجاح');
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.editPaymentLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تحديث الدفعة'));
      }
    });
  }

  openAllocate() {
    if (!this.selectedPayment) return;
    this.allocatingPayment = this.selectedPayment;
    this.allocationSearch = '';
    this.loadAllocationInvoices();
  }

  closeAllocate() {
    this.allocatingPayment = null;
    this.allocationRows = [];
  }

  private loadAllocationInvoices() {
    const p = this.allocatingPayment;
    if (!p) return;
    if (p.type === 'AdvancePayment' || p.type === 'CheckIssued' || p.type === 'CheckReceived') {
      this.notify.info('لا يتطلب هذا النوع تخصيص فواتير');
      return;
    }

    this.loadingAllocationInvoices = true;
    const alreadyAllocatedIds = new Set(p.allocations.map(a => a.invoiceId));
    // نفس التمييز المستخدَم في صفحة إضافة دفعة: Payment (دفع لمورد) يجلب فواتير التوريد،
    // وأي نوع آخر (Receipt) يجلب فواتير المبيعات. النوعان يرجعان أشكال بيانات مختلفة
    // (SalesInvoiceListItem/PurchaseInvoiceListItem) — تُوحَّد هنا عبر map() فور الجلب
    // حتى يصبح النوع الناتج واحداً قابلاً للاشتراك فيه (نفس حل payment-add-page).
    const source$ = p.type === 'Payment'
      ? this.purchaseInvoiceService.getList({ supplierId: p.partyId, status: 'Confirmed', pageSize: 100 }).pipe(
          map(r => r.items.map(i => ({
            id: i.id, invoiceNumber: i.invoiceNumber, invoiceDate: i.invoiceDate, dueDate: i.dueDate,
            amount: i.grandTotal, outstanding: i.amountOutstanding,
          }))),
        )
      : this.salesInvoiceService.getList({ customerId: p.partyId, status: 'Confirmed', pageSize: 100 }).pipe(
          map(r => r.items.map(i => ({
            id: i.id, invoiceNumber: i.invoiceNumber, invoiceDate: i.invoiceDate, dueDate: i.dueDate,
            amount: i.grandTotal, outstanding: i.amountOutstanding,
          }))),
        );

    source$.subscribe({
      next: items => {
        this.allocationRows = items
          .filter(i => !alreadyAllocatedIds.has(i.id) && i.outstanding > 0)
          .map(i => ({ ...i, selected: false, allocatedAmount: 0, discountTaken: 0 }));
        this.loadingAllocationInvoices = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير الطرف المحدد');
        this.loadingAllocationInvoices = false;
      },
    });
  }

  get filteredAllocationRows(): AllocatableRow[] {
    if (!this.allocationSearch) return this.allocationRows;
    const q = this.allocationSearch.trim().toLowerCase();
    return this.allocationRows.filter(r => r.invoiceNumber.toLowerCase().includes(q));
  }

  get allFilteredAllocationSelected(): boolean {
    return this.filteredAllocationRows.length > 0 && this.filteredAllocationRows.every(r => r.selected);
  }

  // إجمالي ما سبق تخصيصه على الدفعة قبل هذه الجلسة — مستبعَد من المبلغ الواجب تغطيته الآن.
  get existingAllocatedTotal(): number {
    if (!this.allocatingPayment) return 0;
    return this.allocatingPayment.allocations.reduce((s, a) => s + a.allocatedAmount + a.discountTaken, 0);
  }

  get remainingToAllocate(): number {
    return this.allocatingPayment ? this.allocatingPayment.amount - this.existingAllocatedTotal : 0;
  }

  get selectedAllocationRows(): AllocatableRow[] { return this.allocationRows.filter(r => r.selected); }
  get newAllocatedTotal(): number { return this.selectedAllocationRows.reduce((s, r) => s + (Number(r.allocatedAmount) || 0), 0); }
  get newDiscountTotal(): number { return this.selectedAllocationRows.reduce((s, r) => s + (Number(r.discountTaken) || 0), 0); }
  get newPaymentTotal(): number { return this.newAllocatedTotal + this.newDiscountTotal; }

  // زر الحفظ يُفعَّل فقط عند تطابق إجمالي التخصيص الجديد تماماً مع المبلغ المتبقي —
  // فرق دون 0.01 يُعامَل كصفر تجنباً لمشاكل تقريب الفاصلة العائمة.
  get allocationBalanced(): boolean {
    return this.selectedAllocationRows.length > 0 && Math.abs(this.newPaymentTotal - this.remainingToAllocate) < 0.01;
  }

  remainingAllocationBalance(row: AllocatableRow): number {
    return row.outstanding - ((Number(row.allocatedAmount) || 0) + (Number(row.discountTaken) || 0));
  }

  toggleAllocationRow(row: AllocatableRow) {
    row.selected = !row.selected;
    row.allocatedAmount = row.selected ? Math.min(row.outstanding, Math.max(0, this.remainingToAllocate)) : 0;
    row.discountTaken = 0;
  }

  toggleSelectAllAllocationRows() {
    const target = !this.allFilteredAllocationSelected;
    for (const row of this.filteredAllocationRows) {
      row.selected = target;
      row.allocatedAmount = target ? Math.min(row.outstanding, Math.max(0, this.remainingToAllocate)) : 0;
      row.discountTaken = 0;
    }
  }

  submitAllocation() {
    if (!this.allocatingPayment) return;
    if (this.selectedAllocationRows.length === 0) {
      this.notify.error('اختر فاتورة واحدة على الأقل لتخصيصها');
      return;
    }
    if (!this.allocationBalanced) {
      this.notify.error('إجمالي التخصيص الجديد يجب أن يساوي المبلغ المتبقي من الدفعة بالضبط');
      return;
    }

    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن تخصيص الفواتير: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }

    this.allocating = true;
    const paymentId = this.allocatingPayment.id;
    this.paymentService.allocate(paymentId, {
      paymentId,
      userId,
      allocations: this.selectedAllocationRows.map(r => ({
        invoiceId: r.id,
        allocatedAmount: Number(r.allocatedAmount) || 0,
        discountTaken: Number(r.discountTaken) || 0,
      })),
    }).subscribe({
      next: () => {
        this.notify.success('تم تخصيص الفواتير للدفعة');
        this.allocating = false;
        this.closeAllocate();
        this.openDetail(paymentId);
      },
      error: err => {
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تخصيص الفواتير'));
        this.allocating = false;
      },
    });
  }
}
