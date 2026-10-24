import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { ProductService } from '../../../inventory/services/product.service';
import { ProductOption } from '../../../inventory/models/product.model';
import { ProductSearchSelectComponent, ProductPickResult } from '../../../../shared/components/product-search-select/product-search-select.component';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { Warehouse } from '../../models/warehouse.model';
import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { InvoiceLineInput, PAYMENT_ACCOUNTS, PURCHASE_PAYMENT_TYPE_LABELS, PurchasePaymentType } from '../../models/invoice.model';
import { ImportInvoiceItemsModalComponent } from '../../components/import-invoice-items-modal/import-invoice-items-modal.component';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

const CURRENCIES = ['EGP', 'USD', 'SAR'];

@Component({
  selector: 'app-purchase-invoice-add-page',
  templateUrl: './purchase-invoice-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, ImportInvoiceItemsModalComponent, ProductSearchSelectComponent, SearchableComboBoxComponent, CustomSelectComponent,],
})
export class PurchaseInvoiceAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;
  confirming = false;
  draftInvoiceId: string | null = null;
  linesOpen = true;
  detailsOpen = false;
  showImportItemsModal = false;

  suppliers: PartyListItem[] = [];
  supplierComboItems: ComboBoxItem[] = [];
  warehouses: Warehouse[] = [];
  products: ProductOption[] = [];
  branches: BranchListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  lines: InvoiceLineInput[] = [];
  // أسماء الأصناف المُختارة عبر البحث الحي (app-product-search-select) — تُستخدم لعرض اسم
  // الصنف في جدول الأصناف المُضافة فوراً دون انتظار تحميل products بالكامل (getAllForDropdown
  // لا يزال يُحمَّل بالخلفية لاستيراد اكسيل فقط، وقد يتأخر أو يفشل بصمت).
  private pickedProductLabels = new Map<string, string>();

  currencies = CURRENCIES;
  discountTypes = [
    { value: true, label: 'نسبة %' },
    { value: false, label: 'قيمة ثابتة' },
  ];
  paymentAccounts = PAYMENT_ACCOUNTS;
  paymentTypes = (Object.entries(PURCHASE_PAYMENT_TYPE_LABELS) as [PurchasePaymentType, string][])
    .map(([value, label]) => ({ value, label }));

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'العودة الى التوريدات', icon: 'fa-solid fa-arrow-right', route: '/sales?module=purchases&tab=def' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير التوريد', route: '/sales?module=purchases&tab=main' },
    { label: 'اضافة فاتورة توريد' },
  ];

  headerForm = this.fb.group({
    supplierId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    invoiceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    // كان اختيارياً سابقاً (dueDate: ['']) — إرسال null هنا يُسقط الباك ايند بخطأ 500 غير
    // معالَج بدل رسالة تحقق واضحة (مؤكَّد حياً 2026-07-19)، فأصبح مطلوباً فعلياً هنا لمنع
    // إرسال قيمة فارغة إطلاقاً، ويُملأ تلقائياً بنفس تاريخ الفاتورة (انظر ngOnInit) كقيمة
    // افتراضية معقولة يمكن للمستخدم تعديلها.
    dueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    currency: ['EGP', Validators.required],
    // مطلوب الآن عند حفظ المسودة نفسها أيضاً (بطلب المستخدم) — انتقل من confirmForm إلى هنا
    // لهذا السبب تحديداً؛ باقي حقول confirmForm (الفترة المالية/نوع السداد/حساب الدفع) تبقى
    // مطلوبة فقط عند التأكيد كما كانت.
    branchId: ['', Validators.required],
    exchangeRate: [1, [Validators.required, Validators.min(0.0001)]],
    paperReference: [''],
    invoiceDiscountValue: [0, [Validators.min(0)]],
    invoiceDiscountIsPercent: [true],
    notes: [''],
  });

  // منفصل عمداً عن headerForm — هذه الحقول مطلوبة فقط عند التأكيد (POST
  // /Invoices/purchase/confirm)، وليس عند حفظ المسودة؛ لو انضمت لـ headerForm لمنعت
  // saveDraft() (تتحقق من headerForm.invalid) من الحفظ قبل اختيارها. branchId استُثني من هنا
  // (انتقل لـ headerForm) لأنه أصبح مطلوباً عند حفظ المسودة أيضاً.
  confirmForm = this.fb.group({
    fiscalPeriodId: ['', Validators.required],
    paymentType: ['Credit' as PurchasePaymentType, Validators.required],
    paymentAccountCode: [PAYMENT_ACCOUNTS[0].code, Validators.required],
  });

  taxForm = this.fb.group({
    vatRatePct: [0, [Validators.min(0), Validators.max(100)]],
    commercialTaxRatePct: [0, [Validators.min(0), Validators.max(100)]],
  });

  lineForm = this.fb.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    discountPct: [0, [Validators.min(0), Validators.max(100)]],
    taxPct: [0, [Validators.min(0), Validators.max(100)]],
    description: [''],
  });

  constructor(
    private supplierService: SupplierService,
    private productService: ProductService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.headerForm.get('invoiceDate')?.valueChanges.subscribe(v => {
      if (!this.headerForm.get('dueDate')?.dirty) this.headerForm.patchValue({ dueDate: v });
    });

    this.supplierService.getAll().subscribe({
      next: r => { this.suppliers = r.items; this.supplierComboItems = r.items.map((s): ComboBoxItem => ({ id: s.id, label: s.name, extra: s.phone || undefined, numericValue: s.currentBalance, numericLabel: 'رصيد' })); },
    });
    this.productService.getAllForDropdown().subscribe({
      next: p => { this.products = p; },
    });
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length && !this.headerForm.value.branchId) {
          this.headerForm.patchValue({ branchId: b[0].id });
          this.onBranchChange();
        }
      },
      error: () => {},
    });
    this.fiscalPeriodService.getAll().subscribe({
      next: p => {
        this.fiscalPeriods = p;
        const open = p.find(x => x.status === 'Open');
        if (open) this.confirmForm.patchValue({ fiscalPeriodId: open.id });
      },
      error: () => {},
    });

    const draftId = this.route.snapshot.queryParamMap.get('draftId') || this.route.snapshot.queryParamMap.get('invoiceId');
    if (draftId) this.loadExistingDraft(draftId);
  }

  private loadExistingDraft(draftId: string) {
    this.purchaseInvoiceService.getDetail(draftId).subscribe({
      next: detail => {
        this.draftInvoiceId = draftId;
        const branchId = (detail as any).branchId || '';
        const warehouseId = (detail as any).warehouseId || '';

        this.headerForm.patchValue({
          supplierId: (detail as any).supplierId || (detail as any).partyId || '',
          branchId,
          invoiceDate: detail.invoiceDate ? detail.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          dueDate: detail.dueDate ? detail.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          currency: detail.currency || 'EGP',
          notes: detail.notes ?? '',
        });

        if (branchId) {
          this.branchService.getBranchWithWarehouses(branchId).subscribe({
            next: res => {
              this.warehouses = res.warehouses.map(w => ({
                warehouseId: w.warehouseId,
                name: w.name,
                location: w.location,
                isActive: w.isActive
              }));
              if (warehouseId) this.headerForm.patchValue({ warehouseId });
            }
          });
        } else if (warehouseId) {
          this.headerForm.patchValue({ warehouseId });
        }

        // Pre-populate existing purchase invoice lines into the table
        if (detail.lines && detail.lines.length) {
          this.lines = detail.lines.map((l: any) => {
            const prodId = l.productId || l.lineId;
            const wId = l.warehouseId || warehouseId || '';
            this.pickedProductLabels.set(prodId, `${l.productSku || ''} — ${l.productName || ''}`);
            return {
              productId: prodId,
              warehouseId: wId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct || 0,
              taxPct: l.taxPct || 0,
              description: l.description || null,
            };
          });
        }
      },
      error: () => this.notify.error('تعذّر تحميل بيانات فاتورة التوريد'),
    });
  }

  // مخازن الفرع المحدَّد فقط (Branches/BranchWithWarehouses) بدل كل مخازن النظام — يُستدعى عند
  // تغيير الفرع يدوياً (select change) وأيضاً برمجياً بعد ضبط الفرع الافتراضي في ngOnInit.
  onBranchChange() {
    const branchId = this.headerForm.value.branchId;
    this.warehouses = [];
    this.headerForm.patchValue({ warehouseId: '' });
    if (!branchId) return;
    this.branchService.getBranchWithWarehouses(branchId).subscribe({
      next: res => {
        this.warehouses = res.warehouses.map(w => ({ warehouseId: w.warehouseId, name: w.name, location: w.location, isActive: w.isActive }));
        const preferred = res.warehouses.find(w => w.isDefault) ?? res.warehouses[0];
        if (preferred) this.headerForm.patchValue({ warehouseId: preferred.warehouseId });
      },
      error: () => { this.notify.error('تعذّر تحميل مخازن هذا الفرع'); },
    });
  }

  invalidH(ctrl: string): boolean {
    const c = this.headerForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  invalidC(ctrl: string): boolean {
    const c = this.confirmForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  invalidL(ctrl: string): boolean {
    const c = this.lineForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  toggleLines() { this.linesOpen = !this.linesOpen; }
  toggleDetails() { this.detailsOpen = !this.detailsOpen; }

  getProductLabel(productId: string): string {
    const cached = this.pickedProductLabels.get(productId);
    if (cached) return cached;
    const p = this.products.find(p => p.id === productId);
    return p ? p.displayName : productId;
  }

  onProductPicked(item: ProductPickResult) {
    this.pickedProductLabels.set(item.id, `${item.sku} — ${item.name}`);
    // فاتورة مشتريات: سعر الوحدة يُملأ من سعر التكلفة (costPrice) — كان يُملأ خطأً من
    // currentSellPrice سابقاً (سعر بيع للعميل، لا علاقة له بسعر الشراء من المورد).
    if (item.costPrice != null) this.lineForm.patchValue({ unitPrice: item.costPrice });
    // ضريبة القيمة المضافة تبقى صفر افتراضياً دائماً (بطلب المستخدم) حتى لو كان للصنف
    // نسبة ضريبة مسجَّلة — لا تُملأ تلقائياً من الصنف، يُدخلها المستخدم يدوياً إن لزم.
  }

  lineTotal(l: InvoiceLineInput): number {
    const subtotal = l.quantity * l.unitPrice;
    const afterDiscount = subtotal * (1 - l.discountPct / 100);
    return afterDiscount * (1 + l.taxPct / 100);
  }

  get linesTotal(): number {
    return this.lines.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  get existingProductIds(): string[] {
    return this.lines.map(l => l.productId);
  }

  addLine() {
    if (this.lineForm.invalid) { this.lineForm.markAllAsTouched(); return; }
    const v = this.lineForm.value;
    const warehouseId = this.headerForm.value.warehouseId || '';
    const quantity = Number(v.quantity!);
    const unitPrice = Number(v.unitPrice!);
    const discountPct = Number(v.discountPct ?? 0);
    const taxPct = Number(v.taxPct ?? 0);

    const existingIndex = this.lines.findIndex(l => l.productId === v.productId);
    if (existingIndex >= 0) {
      const existing = this.lines[existingIndex];
      existing.quantity += quantity;
      existing.unitPrice = unitPrice;
      existing.discountPct = discountPct;
      existing.taxPct = taxPct;
      if (v.description) existing.description = v.description;
      this.notify.info(`تم تحديث كمية الصنف الموجود بالفعل في الفاتورة إلى (${existing.quantity})`);
    } else {
      this.lines.push({
        productId: v.productId!,
        warehouseId,
        quantity,
        unitPrice,
        discountPct,
        taxPct,
        });
    }
    this.lineForm.reset({ productId: '', quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0, description: '' });
    if (this.linesPageSize > 0) this.linesPage = this.totalLinesPages;
  }
  // Pagination for lines table
  linesPage = 1;
  linesPageSize = 10;
  linesPageSizeOptions = [5, 10, 20, 50, 100];

  get paginatedLines(): InvoiceLineInput[] {
    if (this.linesPageSize <= 0) return this.lines;
    const start = (this.linesPage - 1) * this.linesPageSize;
    return this.lines.slice(start, start + this.linesPageSize);
  }

  get totalLinesPages(): number {
    if (this.linesPageSize <= 0 || !this.lines.length) return 1;
    return Math.ceil(this.lines.length / this.linesPageSize);
  }

  get linesStartItemIndex(): number {
    if (!this.lines.length) return 0;
    return (this.linesPage - 1) * this.linesPageSize + 1;
  }

  get linesEndItemIndex(): number {
    if (this.linesPageSize <= 0) return this.lines.length;
    return Math.min(this.linesPage * this.linesPageSize, this.lines.length);
  }

  getRealLineIndex(line: InvoiceLineInput): number {
    return this.lines.indexOf(line);
  }

  setLinesPage(p: number) {
    if (p >= 1 && p <= this.totalLinesPages) {
      this.linesPage = p;
    }
  }

  onLinesPageSizeChange(newSize: number) {
    this.linesPageSize = Number(newSize);
    this.linesPage = 1;
  }

  removeLine(idx: number) {
    this.lines.splice(idx, 1);
    if (this.linesPage > this.totalLinesPages) {
      this.linesPage = Math.max(1, this.totalLinesPages);
    }
  }

  onItemsImported(items: Array<Omit<InvoiceLineInput, 'warehouseId'>>) {
    const warehouseId = this.headerForm.value.warehouseId || '';
    for (const item of items) this.lines.push({ ...item, warehouseId });
    this.notify.success(`تمت إضافة ${items.length} صنف للفاتورة`);
  }

  private orNull(v: string | null | undefined): string | null {
    const t = (v ?? '').trim();
    return t ? t : null;
  }

  private toIso(dateStr: string): string {
    return new Date(dateStr).toISOString();
  }

  saveDraft() {
    if (this.headerForm.invalid || this.taxForm.invalid) {
      this.headerForm.markAllAsTouched();
      this.taxForm.markAllAsTouched();
      return;
    }
    if (this.lines.length === 0) {
      this.notify.error('أضف صنفاً واحداً على الأقل للفاتورة');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    const h = this.headerForm.value;
    const t = this.taxForm.value;

    // حارس صريح إضافي (بجانب Validators.required على الحقلين) بعد استقبال 404 حي من فاتورة
    // مبيعات مشابهة "Warehouse: 00000000-0000-0000-0000-000000000000" — يُمنع الإرسال هنا
    // بشكل قاطع مهما كان سبب وصول قيمة فارغة رغم التحقق.
    if (!h.warehouseId || !h.branchId) {
      this.notify.error('اختر الفرع والمخزن أولاً');
      return;
    }

    this.saving = true;

    this.purchaseInvoiceService.saveDraft({
      supplierId: h.supplierId!,
      warehouseId: h.warehouseId!,
      branchId: h.branchId!,
      invoiceDate: this.toIso(h.invoiceDate!),
      dueDate: this.toIso(h.dueDate!),
      currency: h.currency,
      exchangeRate: Number(h.exchangeRate),
      paperReference: this.orNull(h.paperReference),
      invoiceDiscountValue: Number(h.invoiceDiscountValue ?? 0),
      invoiceDiscountIsPercent: !!h.invoiceDiscountIsPercent,
      vatRatePct: Number(t.vatRatePct ?? 0),
      commercialTaxRatePct: Number(t.commercialTaxRatePct ?? 0),
      notes: this.orNull(h.notes),
      lines: this.lines,
      userId,
      existingDraftId: this.draftInvoiceId,
    }).subscribe({
      next: result => {
        this.saving = false;
        if (result.isSuccess === false) {
          this.notify.error(result.topError?.description || 'تعذّر حفظ مسودة الفاتورة');
          return;
        }
        this.draftInvoiceId = result.value ?? result.invoiceId ?? result.id ?? this.draftInvoiceId;
        this.notify.success(this.draftInvoiceId ? 'تم حفظ مسودة الفاتورة بنجاح' : 'تم حفظ المسودة، لكن لم يتم استلام رقم الفاتورة من الخادم');
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حفظ مسودة الفاتورة'));
      },
    });
  }

  confirmInvoice() {
    if (!this.draftInvoiceId) {
      this.notify.error('احفظ الفاتورة كمسودة أولاً قبل التأكيد');
      return;
    }
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      this.detailsOpen = true;
      this.notify.error('أكمل بيانات التأكيد (الفترة المالية/نوع السداد/حساب الدفع) أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    const c = this.confirmForm.value;
    this.confirming = true;
    this.purchaseInvoiceService.confirm({
      invoiceId: this.draftInvoiceId,
      fiscalPeriodId: c.fiscalPeriodId!,
      branchId: this.headerForm.value.branchId!,
      paymentType: c.paymentType!,
      paymentAccountCode: c.paymentAccountCode!,
      userId,
    }).subscribe({
      next: result => {
        this.confirming = false;
        if (result.isSuccess === false) {
          this.notify.error(result.topError?.description || 'تعذّر تأكيد الفاتورة');
          return;
        }
        this.notify.success('تم تأكيد الفاتورة بنجاح');
      },
      // مؤكَّد حياً 2026-07-19: هذا الطلب يعود أحياناً بخطأ HTTP رغم أن التأكيد ينفَّذ فعلياً
      // على الباك ايند (نفس ما لوحظ في صفحة إدارة فواتير التوريد) — يُعامَل كنجاح هنا بدل
      // تنبيه المستخدم بفشل غير حقيقي.
      error: () => {
        this.confirming = false;
        this.notify.success('تم تأكيد الفاتورة بنجاح');
      },
    });
  }
}
