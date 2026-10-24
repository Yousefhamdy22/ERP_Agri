import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { PAYMENTS_QUICK_ACTIONS } from '../../../../shared/data/payments-quick-actions';
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
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';
import {
  PaymentType,
  PaymentMethod,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
} from '../../models/payment.model';

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
  selector: 'app-payment-add-page',
  templateUrl: './payment-add-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class PaymentAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly Math = Math;
  readonly today = new Date().toISOString().slice(0, 10);

  saving = false;
  loadingInvoices = false;

  branches: BranchListItem[] = [];
  customers: PartyListItem[] = [];
  suppliers: PartyListItem[] = [];
  invoiceRows: AllocatableRow[] = [];
  invoiceSearch = '';

  typeOptions = (Object.entries(PAYMENT_TYPE_LABELS) as [PaymentType, string][]).map(([value, label]) => ({ value, label }));
  methodOptions = (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => ({ value, label, icon: PAYMENT_METHOD_ICONS[value] }));

  quickActions = PAYMENTS_QUICK_ACTIONS;
  topButton = { label: 'ادارة الدفعات', icon: 'fa-solid fa-table-list', route: '/payments' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الحسابات', route: '/sales?module=accounts&tab=main' },
    { label: 'اضافة دفعة' },
  ];

  form = this.fb.group({
    branchId: ['', Validators.required],
    partyId: ['', Validators.required],
    type: [null as PaymentType | null, Validators.required],
    method: [null as PaymentMethod | null, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reference: ['', Validators.maxLength(255)],
    checkNumber: ['', Validators.maxLength(100)],
    checkDate: [''],
    checkBank: ['', Validators.maxLength(100)],
  });

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
    private router: Router,
  ) {}

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.form.value.branchId) this.form.patchValue({ branchId: b[0].id }); },
      error: () => {},
    });
    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; }, error: () => {} });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });

    const qp = this.route.snapshot.queryParamMap;
    const type = qp.get('type') as PaymentType | null;
    const partyId = qp.get('partyId');
    const invoiceId = qp.get('invoiceId');
    if (type && PAYMENT_TYPE_LABELS[type]) this.form.patchValue({ type });
    if (partyId) {
      this.form.patchValue({ partyId });
      this.onPartyOrTypeChange(invoiceId || undefined);
    }
  }

  get isAdvance(): boolean { return this.form.value.type === 'AdvancePayment'; }
  get isCheckIssued(): boolean { return this.form.value.type === 'CheckIssued'; }
  get isCheckReceived(): boolean { return this.form.value.type === 'CheckReceived'; }
  get isDirectCheck(): boolean { return this.isCheckIssued || this.isCheckReceived; }

  get parties(): PartyListItem[] {
    if (this.isDirectCheck) {
      // Check payments support all 4 combinations (issued/received × customer/supplier)
      return [...this.customers, ...this.suppliers];
    }
    return this.form.value.type === 'Payment' ? this.suppliers : this.customers;
  }

  get partyLabel(): string {
    if (this.isDirectCheck) return 'العميل / المورد';
    return this.form.value.type === 'Payment' ? 'المورد' : 'العميل';
  }

  get filteredRows(): AllocatableRow[] {
    if (!this.invoiceSearch) return this.invoiceRows;
    const q = this.invoiceSearch.trim().toLowerCase();
    return this.invoiceRows.filter(r => r.invoiceNumber.toLowerCase().includes(q));
  }

  get selectedRows(): AllocatableRow[] { return this.invoiceRows.filter(r => r.selected); }
  get totalInvoiceAmountSelected(): number { return this.selectedRows.reduce((s, r) => s + r.amount, 0); }
  get totalAllocated(): number { return this.selectedRows.reduce((s, r) => s + (Number(r.allocatedAmount) || 0), 0); }
  get totalDiscount(): number { return this.selectedRows.reduce((s, r) => s + (Number(r.discountTaken) || 0), 0); }
  get totalPaymentAmount(): number { return this.totalAllocated + this.totalDiscount; }
  get unallocatedAmount(): number { return (Number(this.form.value.amount) || 0) - this.totalPaymentAmount; }

  remainingBalance(row: AllocatableRow): number {
    return row.outstanding - ((Number(row.allocatedAmount) || 0) + (Number(row.discountTaken) || 0));
  }

  onPartyOrTypeChange(preselectInvoiceId?: string) {
    this.invoiceRows = [];
    const partyId = this.form.value.partyId;
    const type = this.form.value.type;

    if (this.isDirectCheck) {
      this.form.patchValue({ method: 'Check' });
    }

    if (!partyId || !type || type === 'AdvancePayment' || this.isDirectCheck) return;

    this.loadingInvoices = true;
    // النوعان يرجعان أشكال بيانات مختلفة (SalesInvoiceListItem/PurchaseInvoiceListItem) —
    // تُوحَّد هنا عبر map() فور الجلب حتى يصبح النوع الناتج واحداً قابلاً للاشتراك فيه.
    const source$ = type === 'Receipt'
      ? this.salesInvoiceService.getList({ customerId: partyId, pageSize: 100 }).pipe(
          map(r => r.items.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled' && i.status !== 'Paid' && i.amountOutstanding > 0).map(i => ({
            id: i.id, invoiceNumber: i.invoiceNumber, invoiceDate: i.invoiceDate, dueDate: i.dueDate,
            amount: i.grandTotal, outstanding: i.amountOutstanding,
          }))),
        )
      : this.purchaseInvoiceService.getList({ supplierId: partyId, pageSize: 100 }).pipe(
          map(r => r.items.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled' && i.status !== 'Paid' && i.amountOutstanding > 0).map(i => ({
            id: i.id, invoiceNumber: i.invoiceNumber, invoiceDate: i.invoiceDate, dueDate: i.dueDate,
            amount: i.grandTotal, outstanding: i.amountOutstanding,
          }))),
        );

    source$.subscribe({
      next: items => {
        this.invoiceRows = items.map(i => ({
          ...i,
          selected: false,
          allocatedAmount: 0,
          discountTaken: 0,
        }));
        if (preselectInvoiceId) {
          const row = this.invoiceRows.find(r2 => r2.id === preselectInvoiceId);
          if (row) this.toggleRow(row);
        }
        this.loadingInvoices = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل فواتير الطرف المحدد');
        this.loadingInvoices = false;
      },
    });
  }

  toggleRow(row: AllocatableRow) {
    row.selected = !row.selected;
    if (row.selected) {
      row.allocatedAmount = row.outstanding;
      row.discountTaken = 0;
    } else {
      row.allocatedAmount = 0;
      row.discountTaken = 0;
    }
    this.syncAmount();
  }

  get allFilteredSelected(): boolean {
    return this.filteredRows.length > 0 && this.filteredRows.every(r => r.selected);
  }

  toggleSelectAll() {
    const target = !this.allFilteredSelected;
    for (const row of this.filteredRows) {
      row.selected = target;
      row.allocatedAmount = target ? row.outstanding : 0;
      row.discountTaken = 0;
    }
    this.syncAmount();
  }

  onRowInputChange() {
    this.syncAmount();
  }

  private syncAmount() {
    this.form.patchValue({ amount: this.totalPaymentAmount || null });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  clearForm() {
    if (!confirm('مسح النموذج؟ سيتم فقد أي بيانات غير محفوظة')) return;
    this.form.reset({
      branchId: this.branches[0]?.id ?? '',
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: '',
    });
    this.invoiceRows = [];
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ الدفعة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    if (this.isAdvance) {
      this.submitAdvance(userId);
      return;
    }

    if (this.isDirectCheck) {
      this.submitCheck(userId);
      return;
    }

    if (this.selectedRows.length === 0) {
      this.notify.error('اختر فاتورة واحدة على الأقل لتخصيص الدفعة');
      return;
    }
    if (Math.abs(this.unallocatedAmount) > 0.01) {
      this.notify.error('يوجد مبلغ غير مخصّص — تحقق من التخصيصات قبل الحفظ');
      return;
    }

    this.saving = true;
    const v = this.form.value;
    this.paymentService.create({
      branchId: v.branchId!,
      partyId: v.partyId!,
      userId,
      amount: Number(v.amount),
      method: v.method!,
      type: v.type!,
      paymentDate: new Date(v.paymentDate!).toISOString(),
      reference: v.reference || null,
      allocations: this.selectedRows.map(r => ({
        invoiceId: r.id,
        allocatedAmount: Number(r.allocatedAmount) || 0,
        discountTaken: Number(r.discountTaken) || 0,
      })),
    }).subscribe({
      next: result => {
        this.saving = false;
        this.notify.success(`تم إنشاء الدفعة بنجاح (${result.paymentNumber})`);
        this.router.navigate(['/payments']);
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إنشاء الدفعة'));
      },
    });
  }

  // دفعة مقدمة: لا ترتبط بأي فاتورة (allocations فارغة — الحقل إلزامي في الشكل لكن الباك ايند
  // يقبل مصفوفة فارغة لهذا النوع تحديداً). تُنشأ ثم تُرحَّل مباشرة (create ثم approve ثم post).
  private submitAdvance(userId: string) {
    this.saving = true;
    const v = this.form.value;
    this.paymentService.create({
      branchId: v.branchId!,
      partyId: v.partyId!,
      userId,
      amount: Number(v.amount),
      method: v.method!,
      type: v.type!,
      paymentDate: new Date(v.paymentDate!).toISOString(),
      reference: v.reference || null,
      allocations: [],
    }).pipe(
      switchMap(result => this.paymentService.approve(result.id, userId).pipe(
        switchMap(() => this.paymentService.post(result.id, userId)),
        map(() => result)
      )),
    ).subscribe({
      next: result => {
        this.saving = false;
        this.notify.success(`تم إنشاء وترحيل الدفعة المقدمة بنجاح (${result.paymentNumber})`);
        this.router.navigate(['/payments']);
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إنشاء الدفعة المقدمة'));
      },
    });
  }

  // شيك بالسالب (صادر أو وارد): لا يرتبط بفاتورة ويُرحَّل مباشرة لحساب الطرف
  private submitCheck(userId: string) {
    this.saving = true;
    const v = this.form.value;
    this.paymentService.create({
      branchId: v.branchId!,
      partyId: v.partyId!,
      userId,
      amount: Number(v.amount),
      method: 'Check',
      type: v.type!,
      paymentDate: new Date(v.paymentDate!).toISOString(),
      reference: v.reference || null,
      allocations: [],
      checkNumber: v.checkNumber || null,
      checkDate: v.checkDate ? new Date(v.checkDate).toISOString() : null,
      checkBank: v.checkBank || null,
    }).pipe(
      switchMap(result => this.paymentService.approve(result.id, userId).pipe(
        switchMap(() => this.paymentService.post(result.id, userId)),
        map(() => result)
      )),
    ).subscribe({
      next: result => {
        this.saving = false;
        const msg = v.type === 'CheckIssued'
          ? `تم إنشاء وترحيل الشيك الصادر بنجاح (${result.paymentNumber})`
          : `تم إنشاء وترحيل الشيك الوارد بنجاح (${result.paymentNumber})`;
        this.notify.success(msg);
        this.router.navigate(['/payments']);
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إنشاء الشيك'));
      },
    });
  }
}
