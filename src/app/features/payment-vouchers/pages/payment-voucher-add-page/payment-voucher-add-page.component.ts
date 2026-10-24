import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { PAYMENT_VOUCHERS_QUICK_ACTIONS } from '../../../../shared/data/payment-vouchers-quick-actions';
import { CustomerService } from '../../../parties/services/customer.service';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { SalesInvoiceService } from '../../../invoices/services/sales-invoice.service';
import { PurchaseInvoiceService } from '../../../invoices/services/purchase-invoice.service';
import { PaymentService } from '../../../payments/services/payment.service';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { PaymentVoucherService } from '../../services/payment-voucher.service';
import { CASH_ACCOUNTS, CREDIT_CHARGE_ACCOUNTS, VOUCHER_TYPE_LABELS, VoucherType, WALLET_PROVIDERS } from '../../models/payment-voucher.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { CashSafeService } from '../../../accounting/services/cash-safe.service';
import { CashSafe } from '../../../accounting/models/cash-safe.model';
import { BankAccountService } from '../../../accounting/services/bank-account.service';
import { BankAccount } from '../../../accounting/models/bank-account.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface LinkableInvoice { id: string; label: string; }
interface LinkablePayment { id: string; label: string; }

@Component({
  selector: 'app-payment-voucher-add-page',
  templateUrl: './payment-voucher-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class PaymentVoucherAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;

  // WalletPayment/WalletReceipt مُستبعَدان من أزرار التبويب المتولِّدة تلقائياً — يُعرَضان
  // كتبويب واحد "محفظة إلكترونية" (انظر usesWallet/selectWallet) مع مبدِّل اتجاه قبض/صرف
  // داخلي بدل زرَّين منفصلين في الشريط العلوي.
  voucherTypes: { value: VoucherType; label: string }[] = (Object.entries(VOUCHER_TYPE_LABELS) as [VoucherType, string][])
    .filter(([value]) => value !== 'WalletPayment' && value !== 'WalletReceipt')
    .map(([value, label]) => ({ value, label }));
  activeType: VoucherType = 'CashReceipt';

  cashAccounts = CASH_ACCOUNTS;
  creditChargeAccounts = CREDIT_CHARGE_ACCOUNTS;
  walletProviders = WALLET_PROVIDERS;
  walletProvider: 2 | 3 = 2;

  customers: PartyListItem[] = [];
  suppliers: PartyListItem[] = [];
  linkableInvoices: LinkableInvoice[] = [];
  linkablePayments: LinkablePayment[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  branches: BranchListItem[] = [];

  // خزائن نقدية (CashReceipt/CashPayment) وحسابات بنكية (BankTransfer/CheckReceipt/Wallet)
  // تُحمَّل حسب الفرع المختار.
  cashSafes: CashSafe[] = [];
  bankAccounts: BankAccount[] = [];

  quickActions = PAYMENT_VOUCHERS_QUICK_ACTIONS;
  topButton = { label: 'ادارة السندات', icon: 'fa-solid fa-table-list', route: '/payment-vouchers' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'المدفوعات والمقبوضات', route: '/sales?module=accounts&tab=main' },
    { label: 'اضافة سند' },
  ];

  form = this.fb.group({
    branchId: ['', Validators.required],
    partyId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
    cashAccountCode: [CASH_ACCOUNTS[0].code, Validators.required],
    creditChargeAccountCode: [CREDIT_CHARGE_ACCOUNTS[0].code, Validators.required],
    // خزينة نقدية (Cash) أو حساب بنكي (Bank Transfer) — بديل عن الاختيار المباشر من
    // cashAccountCode لِـ CashReceipt/CashPayment/BankTransfer (انظر onBranchChange).
    cashSafeId: [''],
    bankAccountId: [''],
    linkedInvoiceId: [''],
    // Cash Payment only
    paymentId: [''],
    // Check Receipt only
    checkNumber: [''],
    issuingBank: [''],
    checkIssueDate: [new Date().toISOString().slice(0, 10)],
    // Bank Transfer only
    transferReference: [''],
    bankName: [''],
    transferDate: [new Date().toISOString().slice(0, 10)],
    // Check Receipt + Bank Transfer only.
    fiscalPeriodId: [''],
    // محفظة إلكترونية فقط (WalletPayment/WalletReceipt) — رقم العملية من تطبيق المحفظة.
    transactionReference: [''],
  });

  constructor(
    private voucherService: PaymentVoucherService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private salesInvoiceService: SalesInvoiceService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private paymentService: PaymentService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private cashSafeService: CashSafeService,
    private bankAccountService: BankAccountService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; } });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; } });
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length && !this.form.value.branchId) {
          this.form.patchValue({ branchId: b[0].id });
        }
        this.onBranchChange();
      },
      error: () => this.notify.error('تعذّر تحميل قائمة الفروع'),
    });
    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        // الفترات المغلقة لا يمكن إنشاء سندات فيها (Fiscal Period Lock) — لا داعي لعرضها كخيار.
        this.fiscalPeriods = periods.filter(p => p.status === 'Open');
        if (this.fiscalPeriods.length) this.form.patchValue({ fiscalPeriodId: this.fiscalPeriods[0].id });
      },
      error: () => {},
    });

    const type = this.route.snapshot.queryParamMap.get('type') as VoucherType | null;
    if (type && VOUCHER_TYPE_LABELS[type]) this.selectType(type);
  }

  get isReceipt(): boolean { return this.activeType === 'CashReceipt' || this.activeType === 'CheckReceipt' || this.activeType === 'WalletReceipt'; }
  get partyLabel(): string { return this.isReceipt ? 'العميل' : 'المورد'; }
  get parties(): PartyListItem[] { return this.isReceipt ? this.customers : this.suppliers; }

  get usesCashSafe(): boolean { return this.activeType === 'CashReceipt' || this.activeType === 'CashPayment'; }
  // CheckReceipt أُضيف بطلب المستخدم 2026-08-15 (كان بلا خزينة/حساب بنكي مخصَّص سابقاً) —
  // كلا الحلقين اختياريان لكل الأنواع، عند عدم الاختيار يُستخدَم cashAccountCode العادي.
  get usesBankAccount(): boolean { return this.activeType === 'BankTransfer' || this.activeType === 'CheckReceipt'; }
  // محفظة إلكترونية (InstaPay/VodafoneCash) — بطلب المستخدم 2026-08-15. خلافاً لـ
  // usesCashSafe/usesBankAccount أعلاه، bankAccountId هنا إلزامي.
  get usesWallet(): boolean { return this.activeType === 'WalletPayment' || this.activeType === 'WalletReceipt'; }

  get filteredCashSafes(): CashSafe[] {
    return this.cashSafes;
  }

  get filteredBankAccounts(): BankAccount[] {
    return this.bankAccounts.filter(a => a.type == null || a.type === 1);
  }

  get filteredWallets(): BankAccount[] {
    return this.bankAccounts.filter(a => a.type === this.walletProvider);
  }

  // النقر على تبويب "محفظة إلكترونية" وهو نشط بالفعل لا يُعيد ضبط الحقول (لا يستدعي
  // selectType) — فقط يدخل التبويب أول مرة بالاتجاه الافتراضي (قبض).
  selectWalletTab() {
    if (!this.usesWallet) this.selectType('WalletReceipt');
  }

  selectType(type: VoucherType) {
    this.activeType = type;
    this.form.patchValue({ partyId: '', linkedInvoiceId: '', paymentId: '', cashSafeId: '', bankAccountId: '', transactionReference: '' });
    this.linkableInvoices = [];
    this.linkablePayments = [];
    // لا نفرغ cashSafes/bankAccounts لأنها مرتبطة بالفرع الذي لم يتغير
  }

  onWalletProviderChange(type: 2 | 3) {
    this.walletProvider = type;
    this.form.patchValue({ bankAccountId: '' });
  }

  // خزينة/حساب بنكي يُحمَّلان عند تغيير الفرع
  onBranchChange() {
    this.form.patchValue({ cashSafeId: '', bankAccountId: '' });
    this.cashSafes = [];
    this.bankAccounts = [];
    const branchId = this.form.value.branchId;
    if (!branchId) return;

    this.cashSafeService.getByBranch(branchId).subscribe({
      next: safes => { this.cashSafes = safes.filter(s => s.isActive); },
      error: () => this.notify.error('تعذّر تحميل خزائن هذا الفرع'),
    });

    this.bankAccountService.getByBranch(branchId).subscribe({
      next: accounts => { this.bankAccounts = accounts.filter(a => a.isActive); },
      error: () => this.notify.error('تعذّر تحميل الحسابات البنكية لهذا الفرع'),
    });
  }

  // cashAccountCode يبقى الحقل الذي يُرسَل فعلياً للـ API (مؤكَّد حياً) — يُشتَق تلقائياً من
  // accountCode الخاص بالخزينة/الحساب البنكي المختار بدل اختياره يدوياً من قائمة مسطَّحة.
  onCashSafeSelected() {
    const safe = this.cashSafes.find(s => s.id === this.form.value.cashSafeId);
    if (safe) this.form.patchValue({ cashAccountCode: safe.accountCode });
  }

  onBankAccountSelected() {
    const account = this.bankAccounts.find(a => a.id === this.form.value.bankAccountId);
    if (account) this.form.patchValue({ cashAccountCode: account.accountCode });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onPartySelected() {
    this.form.patchValue({ linkedInvoiceId: '', paymentId: '' });
    const partyId = this.form.value.partyId;
    this.linkableInvoices = [];
    this.linkablePayments = [];
    if (!partyId) return;

    if (this.isReceipt) {
      this.salesInvoiceService.getList({ customerId: partyId, status: 'Confirmed', pageSize: 100 }).subscribe({
        next: r => { this.linkableInvoices = r.items.map(i => ({ id: i.id, label: `${i.invoiceNumber} — ${i.amountOutstanding.toFixed(2)} متبقي` })); },
        error: () => {},
      });
    } else {
      this.purchaseInvoiceService.getList({ supplierId: partyId, status: 'Confirmed', pageSize: 100 }).subscribe({
        next: r => { this.linkableInvoices = r.items.map(i => ({ id: i.id, label: `${i.invoiceNumber} — ${i.amountOutstanding.toFixed(2)} متبقي` })); },
        error: () => {},
      });
    }

    // سند "صرف نقدي" (CashPayment) يُسدِّد دفعة (Payment) منشأة فعلاً في وحدة المدفوعات —
    // الباك ايند يرفض create-cash-payment بدون PaymentId حقيقي (400: "The PaymentId field
    // is required"). كان هذا الحقل سابقاً نصاً حراً اختيارياً باسم خاطئ "مرجع الشراء".
    if (this.activeType === 'CashPayment') {
      this.paymentService.getList({ partyId, type: 'Payment', pageSize: 100 }).subscribe({
        next: r => { this.linkablePayments = r.items.map(p => ({ id: p.id, label: `${p.paymentNumber} — ${p.amount.toFixed(2)}` })); },
        error: () => {},
      });
    }
  }

  private orNull(v: string | null | undefined): string | null {
    const t = (v ?? '').trim();
    return t ? t : null;
  }

  submit() {
    // cashAccountCode غير مطلوب لسندات المحفظة الإلكترونية — لا يوجد لها حقل بديل في
    // CreateWalletPaymentDto/CreateWalletReceiptDto أصلاً (cashSafeId إلزامي بدلاً منه).
    if (this.form.get('branchId')?.invalid || this.form.get('partyId')?.invalid || this.form.get('amount')?.invalid
      || (!this.usesWallet && this.form.get('cashAccountCode')?.invalid) || this.form.get('creditChargeAccountCode')?.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ السند: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    const v = this.form.value;
    const branchId = v.branchId!;
    const partyId = v.partyId!;
    const amount = Number(v.amount);
    const description = v.description!;
    const cashAccountCode = v.cashAccountCode!;
    const creditChargeAccountCode = v.creditChargeAccountCode!;
    const linkedInvoiceId = this.orNull(v.linkedInvoiceId);
    // كلاهما اختياري لكل الأنواع (بطلب المستخدم 2026-08-15) — عند عدم الاختيار يُستخدَم
    // cashAccountCode العادي أعلاه فقط، لا حجب لإرسال السند.
    const cashSafeId = this.usesCashSafe ? this.orNull(v.cashSafeId) : null;
    const bankAccountEntityId = this.usesBankAccount ? this.orNull(v.bankAccountId) : null;

    this.saving = true;

    switch (this.activeType) {
      case 'CashReceipt':
        this.voucherService.createCashReceipt({
          payerId: partyId, receiptAmount: amount, description,
          cashAccountCode, cashSafeId, creditAccountCode: creditChargeAccountCode,
          linkedInvoiceId, branchId, userId,
        }).subscribe(this.createHandlers());
        break;

      case 'CashPayment':
        if (!v.paymentId) {
          this.saving = false;
          this.notify.error('اختر الدفعة المطلوب سداد سند صرف نقدي لها');
          return;
        }
        this.voucherService.createCashPayment({
          payeeId: partyId, paymentAmount: amount, description,
          paymentId: v.paymentId,
          cashAccountCode, cashSafeId, chargeAccountCode: creditChargeAccountCode,
          branchId, userId,
        }).subscribe(this.createHandlers());
        break;

      case 'CheckReceipt':
        if (!v.checkNumber || !v.issuingBank || !v.checkIssueDate || !v.fiscalPeriodId) {
          this.saving = false;
          this.notify.error('أكمل بيانات الشيك (الرقم، البنك، التاريخ، الفترة المالية)');
          return;
        }
        this.voucherService.createCheckReceipt({
          payerId: partyId, receiptAmount: amount, description,
          checkNumber: v.checkNumber, issuingBank: v.issuingBank,
          checkIssueDate: new Date(v.checkIssueDate).toISOString(),
          cashAccountCode, bankAccountEntityId, creditAccountCode: creditChargeAccountCode,
          linkedInvoiceId, fiscalPeriodId: v.fiscalPeriodId, branchId, userId,
        }).subscribe(this.createHandlers());
        break;

      case 'BankTransfer':
        if (!v.transferReference || !v.bankName || !v.transferDate || !v.fiscalPeriodId) {
          this.saving = false;
          this.notify.error('أكمل بيانات التحويل (المرجع، البنك، التاريخ، الفترة المالية)');
          return;
        }
        this.voucherService.createBankTransfer({
          payeeId: partyId, paymentAmount: amount, description,
          transferReference: v.transferReference, bankName: v.bankName,
          transferDate: new Date(v.transferDate).toISOString(),
          cashAccountCode, bankAccountEntityId, chargeAccountCode: creditChargeAccountCode,
          linkedInvoiceId, fiscalPeriodId: v.fiscalPeriodId, branchId, userId,
        }).subscribe(this.createHandlers());
        break;

      case 'WalletReceipt':
        if (!v.bankAccountId) {
          this.saving = false;
          this.notify.error('اختر المحفظة الإلكترونية أولاً');
          return;
        }
        if (!v.transactionReference?.trim()) {
          this.saving = false;
          this.notify.error('رقم العملية مطلوب لسندات المحفظة الإلكترونية');
          return;
        }
        this.voucherService.createWalletReceipt({
          payerId: partyId, receiptAmount: amount, description,
          bankAccountEntityId: v.bankAccountId, creditAccountCode: creditChargeAccountCode,
          transactionReference: v.transactionReference.trim(), branchId, userId,
        }).subscribe(this.createWalletHandlers());
        break;

      case 'WalletPayment':
        if (!v.bankAccountId) {
          this.saving = false;
          this.notify.error('اختر المحفظة الإلكترونية أولاً');
          return;
        }
        if (!v.transactionReference?.trim()) {
          this.saving = false;
          this.notify.error('رقم العملية مطلوب لسندات المحفظة الإلكترونية');
          return;
        }
        this.voucherService.createWalletPayment({
          payeeId: partyId, paymentAmount: amount, description,
          bankAccountEntityId: v.bankAccountId, chargeAccountCode: creditChargeAccountCode,
          transactionReference: v.transactionReference.trim(), branchId, userId,
        }).subscribe(this.createWalletHandlers());
        break;
    }
  }

  private createHandlers() {
    return {
      next: (result: { voucherNumber: string }) => {
        this.saving = false;
        this.notify.success(`تم حفظ السند بنجاح (${result.voucherNumber})`);
        this.router.navigate(['/payment-vouchers']);
      },
      error: (err: unknown) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حفظ السند'));
      },
    };
  }

  // create-wallet-payment/receipt يُرجعان Guid خام لا {voucherId,voucherNumber} — لا رقم
  // سند لعرضه في رسالة النجاح (انظر CreateWalletVoucherResult في النموذج).
  private createWalletHandlers() {
    return {
      next: () => {
        this.saving = false;
        this.notify.success('تم حفظ سند المحفظة الإلكترونية بنجاح');
        this.router.navigate(['/payment-vouchers']);
      },
      error: (err: unknown) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حفظ السند'));
      },
    };
  }
}
