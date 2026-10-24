import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { CustomerService } from '../../../parties/services/customer.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { CASH_ACCOUNTS } from '../../../payment-vouchers/models/payment-voucher.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { ReceivePaymentService } from '../../services/receive-payment.service';
import { RECEIPT_PAYMENT_METHODS, ReceivePaymentCommand, UnpaidInvoice } from '../../models/receive-payment.model';
import { RECEIVE_PAYMENT_QUICK_ACTIONS } from '../../../../shared/data/receive-payment-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface AllocationRow extends UnpaidInvoice {
  allocated: number;
}

@Component({
  selector: 'app-receive-payment-add-page',
  templateUrl: './receive-payment-add-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class ReceivePaymentAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;
  loadingInvoices = false;

  branches: BranchListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  customers: PartyListItem[] = [];
  paymentMethods = RECEIPT_PAYMENT_METHODS;
  cashAccounts = CASH_ACCOUNTS;

  invoiceRows: AllocationRow[] = [];

  quickActions = RECEIVE_PAYMENT_QUICK_ACTIONS;
  topButton = { label: 'ادارة الإيصالات', icon: 'fa-solid fa-table-list', route: '/receive-payment' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'المدفوعات والمقبوضات', route: '/sales?module=accounts&tab=main' },
    { label: 'استلام دفعة' },
  ];

  form = this.fb.group({
    customerId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentMethod: [RECEIPT_PAYMENT_METHODS[0].value, Validators.required],
    paymentAccountCode: [CASH_ACCOUNTS[0].code, Validators.required],
    paymentDate: [new Date().toISOString().slice(0, 10), Validators.required],
    fiscalPeriodId: ['', Validators.required],
    branchId: ['', Validators.required],
    referenceNo: [''],
    notes: [''],
  });

  constructor(
    private receivePaymentService: ReceivePaymentService,
    private customerService: CustomerService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; } });

    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.form.value.branchId) this.form.patchValue({ branchId: b[0].id }); },
      error: () => this.notify.error('تعذّر تحميل قائمة الفروع'),
    });

    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        this.fiscalPeriods = periods.filter(p => p.status === 'Open');
        if (this.fiscalPeriods.length) this.form.patchValue({ fiscalPeriodId: this.fiscalPeriods[0].id });
      },
      error: () => {},
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onCustomerSelected() {
    this.invoiceRows = [];
    const customerId = this.form.value.customerId;
    if (!customerId) return;

    this.loadingInvoices = true;
    this.receivePaymentService.getUnpaidInvoices(customerId).subscribe({
      next: invoices => {
        this.invoiceRows = [...invoices]
          .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())
          .map(inv => ({ ...inv, allocated: 0 }));
        this.loadingInvoices = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل الفواتير غير المسددة لهذا العميل');
        this.loadingInvoices = false;
      },
    });
  }

  // يوزّع مبلغ الاستلام على الفواتير الأقدم أولاً حتى ينفد المبلغ أو تنتهي الفواتير —
  // الفرق المتبقي بعدها (إن وُجد) يُرسَل كدفعة على الحساب بدون ربط بفاتورة (invoiceId: null)
  // لأن الباك ايند لا يقبل توزيع نداء واحد على عدة فواتير.
  autoAllocate() {
    let remaining = Number(this.form.value.amount) || 0;
    for (const row of this.invoiceRows) {
      const take = Math.min(remaining, row.amountOutstanding);
      row.allocated = Math.round(take * 100) / 100;
      remaining -= row.allocated;
    }
  }

  clearAllocations() {
    for (const row of this.invoiceRows) row.allocated = 0;
  }

  get totalAllocated(): number {
    return Math.round(this.invoiceRows.reduce((sum, r) => sum + (r.allocated || 0), 0) * 100) / 100;
  }

  get remainderOnAccount(): number {
    const amount = Number(this.form.value.amount) || 0;
    return Math.round((amount - this.totalAllocated) * 100) / 100;
  }

  get isOverAllocated(): boolean {
    return this.totalAllocated > (Number(this.form.value.amount) || 0) + 0.01;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.isOverAllocated) { this.notify.error('إجمالي التوزيع على الفواتير أكبر من مبلغ الاستلام'); return; }

    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن حفظ الاستلام: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }

    const v = this.form.value;
    const base: Omit<ReceivePaymentCommand, 'amount' | 'invoiceId'> = {
      branchId: v.branchId!,
      customerId: v.customerId!,
      paymentMethod: v.paymentMethod!,
      paymentAccountCode: v.paymentAccountCode!,
      paymentDate: new Date(v.paymentDate!).toISOString(),
      referenceNo: v.referenceNo || null,
      notes: v.notes || null,
      fiscalPeriodId: v.fiscalPeriodId!,
      userId,
    };

    const calls: ReceivePaymentCommand[] = this.invoiceRows
      .filter(r => r.allocated > 0.009)
      .map(r => ({ ...base, amount: r.allocated, invoiceId: r.invoiceId }));

    if (this.remainderOnAccount > 0.009) calls.push({ ...base, amount: this.remainderOnAccount, invoiceId: null });

    if (!calls.length) { this.notify.error('لا يوجد مبلغ لاستلامه — أدخل المبلغ ووزّعه على الفواتير أو اتركه بدون ربط'); return; }

    this.saving = true;
    forkJoin(calls.map(c => this.receivePaymentService.receive(c).pipe(
      map(() => true),
      catchError(() => of(false)),
    ))).subscribe(results => {
      this.saving = false;
      const okCount = results.filter(Boolean).length;
      const failCount = results.length - okCount;
      if (failCount === 0) {
        this.notify.success('تم تسجيل الاستلام بنجاح');
        this.router.navigate(['/receive-payment']);
      } else if (okCount > 0) {
        this.notify.info(`تم تسجيل ${okCount} من ${results.length} — تعذّر تسجيل ${failCount}`);
        this.router.navigate(['/receive-payment']);
      } else {
        this.notify.error(friendlyErrorMessage(null, 'تعذّر تسجيل الاستلام'));
      }
    });
  }
}
