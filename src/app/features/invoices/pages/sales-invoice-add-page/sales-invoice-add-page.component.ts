import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { CustomerService } from '../../../parties/services/customer.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { ProductService } from '../../../inventory/services/product.service';
import { ProductOption } from '../../../inventory/models/product.model';
import { ProductSearchSelectComponent, ProductPickResult } from '../../../../shared/components/product-search-select/product-search-select.component';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { Warehouse } from '../../models/warehouse.model';
import { WarehouseService } from '../../services/warehouse.service';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { InvoiceLineInput, PAYMENT_ACCOUNTS } from '../../models/invoice.model';
import { ImportInvoiceItemsModalComponent } from '../../components/import-invoice-items-modal/import-invoice-items-modal.component';
import { friendlyErrorMessage, isInsufficientStockError, extractInsufficientStockProductId } from '../../../../shared/utils/http-error.util';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface SalesInvoiceLineRow extends InvoiceLineInput {
  availableStock: number | null;
}

const CURRENCIES = ['EGP', 'USD', 'SAR'];

function notBeforeToday(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(control.value) < today ? { pastDate: true } : null;
}

function dueAfterInvoice(group: AbstractControl): ValidationErrors | null {
  const invoiceDate = group.get('invoiceDate')?.value;
  const dueDate = group.get('dueDate')?.value;
  if (!invoiceDate || !dueDate) return null;
  return new Date(dueDate) < new Date(invoiceDate) ? { dueBeforeInvoice: true } : null;
}

@Component({
  selector: 'app-sales-invoice-add-page',
  templateUrl: './sales-invoice-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, ImportInvoiceItemsModalComponent, ProductSearchSelectComponent, SearchableComboBoxComponent, CustomSelectComponent,],
})
export class SalesInvoiceAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;
  confirming = false;
  // true فقط بعد نجاح استدعاء endpoint التأكيد فعلياً — يتحكم بتفعيل زر "طباعة" (لا يُفعَّل
  // لمجرد وجود draftInvoiceId/حفظ كمسودة، فالطباعة يجب أن تخص فاتورة مؤكَّدة فعلياً).
  confirmed = false;
  draftInvoiceId: string | null = null;
  linesOpen = true;
  detailsOpen = false;
  showImportItemsModal = false;

  // true عند فتح الصفحة لتعديل مسودة موجودة (?draftId=...) — نقطة GET التفاصيل لا
  // ترجع customerId/warehouseId/productId (أسماء عرض فقط)، لذا لا يمكن تعبئة العميل/المخزن/الأصناف
  // تلقائياً؛ يعاد إدخالها من جديد وتُستبدل المسودة القديمة بالكامل عند الحفظ.
  editingExistingDraft = false;
  editingInvoiceNumber = '';
  // true بعد أول تعديل يدوي مباشر لتاريخ الاستحقاق — يوقف مزامنته التلقائية مع تاريخ الفاتورة
  // (onInvoiceDateChange) حتى لا يُستبدَل اختيار المستخدم الصريح كلما غيّر تاريخ الفاتورة.
  private dueDateManuallyEdited = false;

  customers: PartyListItem[] = [];
  customerComboItems: ComboBoxItem[] = [];
  warehouses: Warehouse[] = [];
  products: ProductOption[] = [];
  branches: BranchListItem[] = [];
  lines: SalesInvoiceLineRow[] = [];
  // أسماء الأصناف المُختارة عبر البحث الحي (app-product-search-select) — تُستخدم لعرض اسم
  // الصنف في جدول الأصناف المُضافة فوراً دون انتظار تحميل products بالكامل (getAllForDropdown
  // لا يزال يُحمَّل بالخلفية لاستيراد اكسيل فقط، وقد يتأخر أو يفشل بصمت).
  private pickedProductLabels = new Map<string, string>();
  // الكمية المتاحة للصنف المختار حالياً في نموذج إضافة السطر (قبل إضافته للجدول) — من
  // ProductPickResult.availableQuantity مباشرة (مُخصَّص بالفعل حسب المخزن المُمرَّر لِـ
  // app-product-search-select)، بلا نداء API إضافي.
  pickedAvailableStock: number | null = null;

  // هل يسمح المخزن المختار حالياً بالبيع بالسالب؟ (Warehouses/{id}.allowNegativeStock) —
  // يُحمَّل عند اختيار/تغيير المخزن. البيع بالسالب الفعلي يتطلب أيضاً صلاحية أدمن (canSellNegative).
  warehouseAllowsNegativeStock = false;

  currencies = CURRENCIES;
  paymentAccounts = PAYMENT_ACCOUNTS;
  discountTypes = [
    { value: true, label: 'نسبة %' },
    { value: false, label: 'قيمة ثابتة' },
  ];

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'ادارة فواتير مبيعات', icon: 'fa-solid fa-table-list', route: '/invoices/sales/manage' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير المبيعات', route: '/sales?module=sales&tab=main' },
    { label: 'اضافة فاتورة مبيعات' },
  ];

  headerForm = this.fb.group({
    customerId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    invoiceDate: [new Date().toISOString().slice(0, 10), [Validators.required, notBeforeToday]],
    // تُساوي تاريخ الفاتورة افتراضياً (بطلب المستخدم) — تبقى متزامنة معه تلقائياً عبر
    // onInvoiceDateChange() طالما المستخدم لم يُعدِّلها يدوياً بنفسه (dueDateManuallyEdited).
    dueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    currency: ['EGP', Validators.required],
    // مطلوب الآن عند حفظ المسودة نفسها أيضاً (بطلب المستخدم) وليس فقط عند التأكيد.
    branchId: ['', Validators.required],
    paymentAccountCode: [PAYMENT_ACCOUNTS[0].code],
    invoiceDiscountValue: [0, [Validators.min(0)]],
    invoiceDiscountIsPercent: [true],
    paperReference: [''],
    notes: [''],
  }, { validators: dueAfterInvoice });

  taxForm = this.fb.group({
    vatRatePct: [0, [Validators.min(0), Validators.max(100)]],
    commercialTaxRatePct: [0, [Validators.min(0), Validators.max(100)]],
  });

  lineForm = this.fb.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    unitPrice: [0, [Validators.required, Validators.min(0.0001)]],
    discountPct: [0, [Validators.min(0), Validators.max(100)]],
    taxPct: [0, [Validators.min(0), Validators.max(100)]],
    description: [''],
  });

  constructor(
    private customerService: CustomerService,
    private productService: ProductService,
    private branchService: BranchService,
    private warehouseService: WarehouseService,
    private salesInvoiceService: SalesInvoiceService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.customerService.getAll().subscribe({
      next: r => { this.customers = r.items; this.customerComboItems = r.items.map((c): ComboBoxItem => ({ id: c.id, label: c.name, extra: c.phone || undefined, numericValue: c.currentBalance, numericLabel: 'رصيد' })); },
    });
    this.productService.getAllForDropdown().subscribe({
      next: p => { this.products = p; },
    });
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length) {
          this.headerForm.patchValue({ branchId: b[0].id });
          this.onBranchChange();
        }
      },
      error: () => {},
    });

    const draftId = this.route.snapshot.queryParamMap.get('draftId');
    if (draftId) this.loadExistingDraft(draftId);
  }

  // مخازن الفرع المحدَّد فقط (Branches/BranchWithWarehouses) بدل كل مخازن النظام — يُستدعى عند
  // تغيير الفرع يدوياً (select change) وأيضاً برمجياً بعد ضبط الفرع الافتراضي في ngOnInit.
  onBranchChange() {
    const branchId = this.headerForm.value.branchId;
    this.warehouses = [];
    this.headerForm.patchValue({ warehouseId: '' });
    this.warehouseAllowsNegativeStock = false;
    if (!branchId) return;
    this.branchService.getBranchWithWarehouses(branchId).subscribe({
      next: res => {
        this.warehouses = res.warehouses.map(w => ({ warehouseId: w.warehouseId, name: w.name, location: w.location, isActive: w.isActive }));
        const preferred = res.warehouses.find(w => w.isDefault) ?? res.warehouses[0];
        if (preferred) {
          this.headerForm.patchValue({ warehouseId: preferred.warehouseId });
          this.loadWarehouseNegativeStockFlag(preferred.warehouseId);
        }
      },
      error: () => { this.notify.error('تعذّر تحميل مخازن هذا الفرع'); },
    });
  }

  onWarehouseChange() {
    this.loadWarehouseNegativeStockFlag(this.headerForm.value.warehouseId || '');
  }

  private loadWarehouseNegativeStockFlag(warehouseId: string) {
    if (!warehouseId) { this.warehouseAllowsNegativeStock = false; return; }
    this.warehouseService.getById(warehouseId).subscribe({
      next: w => { this.warehouseAllowsNegativeStock = !!w.allowNegativeStock; },
      error: () => { this.warehouseAllowsNegativeStock = false; },
    });
  }

  // أدمن + مخزن يسمح بالبيع بالسالب = مسموح بتجاوز المخزون المتاح (تحذير فقط لا حظر).
  // أي حالة أخرى (موظف، أو مخزن لا يسمح) تبقى محظورة تماماً — الباك ايند هو الفيصل النهائي
  // دائماً، هذا فقط لتجربة استخدام أوضح قبل الإرسال.
  get canSellNegative(): boolean {
    return this.auth.isAdmin && this.warehouseAllowsNegativeStock;
  }

  lineStockStatus(l: SalesInvoiceLineRow): 'ok' | 'warning' | 'blocked' {
    if (l.availableStock == null || l.quantity <= l.availableStock) return 'ok';
    return this.canSellNegative ? 'warning' : 'blocked';
  }

  get hasBlockedStockLines(): boolean {
    return this.lines.some(l => this.lineStockStatus(l) === 'blocked');
  }

  get negativeStockLines(): SalesInvoiceLineRow[] {
    return this.lines.filter(l => this.lineStockStatus(l) === 'warning');
  }

  private loadExistingDraft(draftId: string) {
    this.salesInvoiceService.getDetail(draftId).subscribe({
      next: detail => {
        this.draftInvoiceId = draftId;
        this.editingExistingDraft = true;
        this.editingInvoiceNumber = detail.invoiceNumber;
        this.dueDateManuallyEdited = true;
        this.breadcrumbs = [
          { label: 'التوريدات والمبيعات' },
          { label: 'فواتير المبيعات', route: '/sales?module=sales&tab=main' },
          { label: `تعديل فاتورة مبيعات ${detail.invoiceNumber ? ('(' + detail.invoiceNumber + ')') : ''}` },
        ];

        const branchId = (detail as any).branchId || '';
        const warehouseId = (detail as any).warehouseId || '';

        this.headerForm.patchValue({
          customerId: (detail as any).customerId || '',
          branchId,
          invoiceDate: detail.invoiceDate.slice(0, 10),
          dueDate: detail.dueDate.slice(0, 10),
          currency: detail.currency,
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
              if (warehouseId) {
                this.headerForm.patchValue({ warehouseId });
                this.loadWarehouseNegativeStockFlag(warehouseId);
              }
            }
          });
        } else if (warehouseId) {
          this.headerForm.patchValue({ warehouseId });
          this.loadWarehouseNegativeStockFlag(warehouseId);
        }

        this.taxForm.patchValue({
          vatRatePct: detail.vatRatePct,
          commercialTaxRatePct: detail.commercialTaxRatePct,
        });

        // Pre-populate existing invoice lines into the table so the user sees all products to update
        if (detail.lines && detail.lines.length) {
          this.lines = detail.lines.map(l => {
            const prodId = (l as any).productId || l.lineId;
            const wId = (l as any).warehouseId || warehouseId || '';
            this.pickedProductLabels.set(prodId, `${l.productSku} — ${l.productName}`);
            return {
              productId: prodId,
              warehouseId: wId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct,
              taxPct: l.taxPct,
              description: l.description || null,
              availableStock: null,
            };
          });
        }
      },
      error: () => this.notify.error('تعذّر تحميل بيانات الفاتورة'),
    });
  }

  // يُستدعى عند تغيير تاريخ الفاتورة: يُبقي تاريخ الاستحقاق مساوياً له طالما المستخدم لم
  // يُعدِّل تاريخ الاستحقاق بنفسه بعد.
  onInvoiceDateChange() {
    if (this.dueDateManuallyEdited) return;
    const invoiceDate = this.headerForm.get('invoiceDate')?.value;
    if (invoiceDate) this.headerForm.patchValue({ dueDate: invoiceDate });
  }

  onDueDateManualEdit() {
    this.dueDateManuallyEdited = true;
  }

  invalidH(ctrl: string): boolean {
    const c = this.headerForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  invalidL(ctrl: string): boolean {
    const c = this.lineForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get dueBeforeInvoice(): boolean {
    const dueTouched = this.headerForm.get('dueDate')?.touched || this.headerForm.get('invoiceDate')?.touched;
    return !!this.headerForm.errors?.['dueBeforeInvoice'] && !!dueTouched;
  }

  toggleLines() { this.linesOpen = !this.linesOpen; }
  toggleDetails() { this.detailsOpen = !this.detailsOpen; }

  getProductLabel(productId: string): string {
    const cached = this.pickedProductLabels.get(productId);
    if (cached) return cached;
    const p = this.products.find(p => p.id === productId);
    return p ? p.displayName : productId;
  }

  // يفضّل هذا SKU + الاسم من قائمة الأصناف المحلية (this.products) دائماً حين تتوفر — أوثق
  // من الكاش (pickedProductLabels) الذي قد لا يحوي الصنف لو أُضيف سطره بطريقة غير الاختيار
  // اليدوي من الـ picker (استيراد Excel مثلاً).
  private formatProductForStockError(productId: string): string {
    const p = this.products.find(p => p.id === productId);
    if (p) return `الصنف "${p.sku} — ${p.name}"`;
    const cached = this.pickedProductLabels.get(productId);
    if (cached) return `الصنف "${cached}"`;
    return 'أحد الأصناف في هذه الفاتورة';
  }

  onProductPicked(item: ProductPickResult) {
    this.pickedProductLabels.set(item.id, `${item.sku} — ${item.name}`);
    // فاتورة مبيعات: سعر الوحدة يُملأ من سعر البيع (sellPrice) — بخلاف فاتورة المشتريات
    // التي تستخدم سعر التكلفة (انظر purchase-invoice-add-page).
    if (item.sellPrice != null) this.lineForm.patchValue({ unitPrice: item.sellPrice });
    // ضريبة القيمة المضافة تبقى صفر افتراضياً دائماً (بطلب المستخدم) حتى لو كان للصنف
    // نسبة ضريبة مسجَّلة — لا تُملأ تلقائياً من الصنف، يُدخلها المستخدم يدوياً إن لزم.
    this.pickedAvailableStock = item.availableQuantity;
  }

  lineTotal(l: InvoiceLineInput): number {
    const subtotal = l.quantity * l.unitPrice;
    const afterDiscount = subtotal * (1 - l.discountPct / 100);
    return afterDiscount * (1 + l.taxPct / 100);
  }

  get subtotal(): number {
    return this.lines.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  get invoiceDiscountAmount(): number {
    const v = this.headerForm.value;
    const discountValue = Number(v.invoiceDiscountValue ?? 0);
    return v.invoiceDiscountIsPercent ? this.subtotal * discountValue / 100 : discountValue;
  }

  get totalAfterInvoiceDiscount(): number {
    return this.subtotal - this.invoiceDiscountAmount;
  }

  get vatAmount(): number {
    const vatRatePct = Number(this.taxForm.value.vatRatePct ?? 0);
    return this.totalAfterInvoiceDiscount * vatRatePct / 100;
  }

  get grandTotal(): number {
    return this.totalAfterInvoiceDiscount + this.vatAmount;
  }

  addLine() {
    if (this.lineForm.invalid) { this.lineForm.markAllAsTouched(); return; }
    const v = this.lineForm.value;
    const warehouseId = this.headerForm.value.warehouseId || '';
    const quantity = Number(v.quantity!);
    const unitPrice = Number(v.unitPrice!);
    const discountPct = Number(v.discountPct ?? 0);
    const taxPct = Number(v.taxPct ?? 0);
    const availableStock = this.pickedAvailableStock;

    if (availableStock != null && quantity > availableStock && !this.canSellNegative) {
      this.notify.error(`الكمية المطلوبة (${quantity}) أكبر من المخزون المتاح لهذا الصنف (${availableStock})`);
      return;
    }

    const existingIndex = this.lines.findIndex(l => l.productId === v.productId);
    if (existingIndex >= 0) {
      const existing = this.lines[existingIndex];
      const newQty = existing.quantity + quantity;
      if (availableStock != null && newQty > availableStock && !this.canSellNegative) {
        this.notify.error(`الكمية الإجمالية الجديدة (${newQty}) أكبر من المخزون المتاح لهذا الصنف (${availableStock})`);
        return;
      }
      existing.quantity = newQty;
      existing.unitPrice = unitPrice;
      existing.discountPct = discountPct;
      existing.taxPct = taxPct;
      if (v.description) existing.description = v.description;
      this.notify.info(`تم تحديث كمية الصنف الموجود بالفعل في الفاتورة إلى (${newQty})`);
    } else {
      this.lines.push({
        productId: v.productId!,
        warehouseId,
        quantity,
        unitPrice,
        discountPct,
        taxPct,
        description: v.description || null,
        availableStock,
      });
    }
    this.lineForm.reset({ productId: '', quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0, description: '' });
    this.pickedAvailableStock = null;
    if (this.linesPageSize > 0) this.linesPage = this.totalLinesPages;
  }
  // Pagination for lines table
  linesPage = 1;
  linesPageSize = 10;
  linesPageSizeOptions = [5, 10, 20, 50, 100];

  get paginatedLines(): SalesInvoiceLineRow[] {
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

  getRealLineIndex(line: SalesInvoiceLineRow): number {
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

  get existingProductIds(): string[] {
    return this.lines.map(l => l.productId);
  }

  onItemsImported(items: Array<Omit<InvoiceLineInput, 'warehouseId'>>) {
    const warehouseId = this.headerForm.value.warehouseId || '';
    // لا توجد بيانات مخزون متاحة من مودال الاستيراد (لا يمرّ عبر app-product-search-select) —
    // availableStock تبقى null، فتُعامَل هذه الأسطر كحالة "ok" دائماً (بلا شارة تحذير/حظر
    // زائفة) حتى يتأكد الباك ايند نفسه عند التأكيد.
    for (const item of items) this.lines.push({ ...item, warehouseId, availableStock: null });
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

    // حارس صريح إضافي (بجانب Validators.required على الحقلين) بعد استقبال 404 حي
    // "Warehouse: 00000000-0000-0000-0000-000000000000" — لم يتّضح سبب وصول قيمة فارغة
    // للباك ايند رغم التحقق، فيُمنع الإرسال هنا بشكل قاطع مهما كان سبب ذلك.
    if (!h.warehouseId || !h.branchId) {
      this.notify.error('اختر الفرع والمخزن أولاً');
      return;
    }

    this.saving = true;

    this.salesInvoiceService.saveDraft({
      customerId: h.customerId!,
      warehouseId: h.warehouseId!,
      branchId: h.branchId!,
      invoiceDate: this.toIso(h.invoiceDate!),
      dueDate: this.toIso(h.dueDate!),
      currency: h.currency,
      paymentAccountCode: this.orNull(h.paymentAccountCode),
      invoiceDiscountValue: Number(h.invoiceDiscountValue ?? 0),
      invoiceDiscountIsPercent: !!h.invoiceDiscountIsPercent,
      vatRatePct: Number(t.vatRatePct ?? 0),
      commercialTaxRatePct: Number(t.commercialTaxRatePct ?? 0),
      paperReference: this.orNull(h.paperReference),
      notes: this.orNull(h.notes),
      // availableStock حقل واجهة محلي فقط (انظر SalesInvoiceLineRow) — يُنزَع هنا قبل
      // الإرسال حتى لا يصل حقل غير متوقَّع في جسم الطلب للباك ايند.
      lines: this.lines.map(({ availableStock, ...line }) => line),
      userId,
      existingDraftId: this.draftInvoiceId,
    }).subscribe({
      next: result => {
        this.saving = false;
        this.draftInvoiceId = typeof result === 'string'
          ? result
          : (result.invoiceId ?? result.id ?? result.data?.invoiceId ?? result.data?.id ?? result.value ?? this.draftInvoiceId);
        if (this.draftInvoiceId) {
          this.notify.success('تم حفظ مسودة الفاتورة بنجاح');
        } else {
          this.notify.info('تم حفظ المسودة، لكن لم يتم استلام رقم الفاتورة من الخادم — لن يمكن تأكيدها من هذه الصفحة');
        }
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
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تأكيد الفاتورة: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    const paymentAccountCode = this.orNull(this.headerForm.value.paymentAccountCode);
    if (!paymentAccountCode) {
      this.notify.error('أدخل كود حساب الدفع قبل تأكيد الفاتورة');
      return;
    }
    const branchId = this.headerForm.value.branchId;
    if (!branchId) {
      this.notify.error('اختر الفرع قبل تأكيد الفاتورة');
      return;
    }

    // حظر نهائي هنا أيضاً (بجانب تعطيل زر التأكيد في القالب) — دفاع مضاعف لو وصل الضغط
    // بطريقة أخرى (كيبورد/برمجياً)، مع أن الباك ايند هو الفيصل النهائي في كل الأحوال.
    if (this.hasBlockedStockLines) {
      this.notify.error('توجد أصناف تتجاوز المخزون المتاح ولا تملك صلاحية البيع بالسالب لها — عدّل الكميات أو تواصل مع الأدمن');
      return;
    }

    // أدمن + مخزن يسمح بالبيع بالسالب: تأكيد صريح يُظهر بالضبط أي الأصناف ستُباع بالسالب
    // وبكم قبل المتابعة — لا يُطلَب هذا التأكيد إلا لو وُجد سطر واحد فعلاً متجاوز.
    if (this.negativeStockLines.length > 0) {
      const details = this.negativeStockLines
        .map(l => `• ${this.getProductLabel(l.productId)}: الكمية ${l.quantity} — المتاح ${l.availableStock} (بالسالب ${l.quantity - (l.availableStock ?? 0)})`)
        .join('\n');
      const proceed = confirm(`أنت على وشك البيع بالسالب للأصناف التالية:\n\n${details}\n\nهل تريد المتابعة؟`);
      if (!proceed) return;
    }

    this.confirming = true;
    this.salesInvoiceService.confirm({ invoiceId: this.draftInvoiceId, branchId, paymentAccountCode, userId }).subscribe({
      next: invoiceNumber => {
        this.confirming = false;
        this.confirmed = true;
        this.notify.success(`تم تأكيد الفاتورة ${invoiceNumber} بنجاح`);
        // البقاء في الصفحة بدل الانتقال الفوري لقائمة الفواتير — يفتح هذا زر "طباعة" (مُفعَّل
        // فقط بعد التأكيد الفعلي وليس فقط بعد الحفظ كمسودة) ليطبع المستخدم الفاتورة المؤكَّدة
        // فور تأكيدها مباشرة دون الحاجة للبحث عنها مجدداً في صفحة الإدارة.
      },
      error: (err) => {
        this.confirming = false;
        if (isInsufficientStockError(err)) {
          const fallbackMsg = this.auth.isAdmin
            ? `تعذّر تأكيد الفاتورة: رصيد المخزون الحالي في المخزن المحدَّد لا يكفي الكمية المطلوبة. لإتمام العملية بالسالب فعِّل خاصية "السماح بالبيع بالسالب" لهذا المخزن، أو خفّض الكمية المطلوبة.`
            : `تعذّر تأكيد الفاتورة: رصيد المخزون الحالي في المخزن المحدَّد لا يكفي الكمية المطلوبة، ولا تملك صلاحية البيع بالسالب. يرجى التواصل مع مدير النظام.`;
          this.notify.error(friendlyErrorMessage(err, fallbackMsg));
          return;
        }
        this.salesInvoiceService.getDetail(this.draftInvoiceId!).subscribe({
          next: (detail) => {
            if (detail.status === 'Confirmed') {
              this.confirmed = true;
              this.notify.success(`الفاتورة مؤكدة بالفعل — ${detail.invoiceNumber}`);
            } else {
              this.notify.error(friendlyErrorMessage(err, 'تعذّر تأكيد الفاتورة'));
            }
          },
          error: () => {
            this.notify.error(friendlyErrorMessage(err, 'تعذّر تأكيد الفاتورة'));
          },
        });
      },
    });
  }

  // لا يوجد قالب طباعة هنا في صفحة الإضافة — بيانات هذه الصفحة محلية (أسماء عملاء/مخازن/أصناف
  // غير مُطابَقة بالكامل مع شكل SalesInvoiceDetail المُرجَع من الباك ايند). بدل تكرار قالب
  // الطباعة الكامل (الرأس + جدول الأصناف + الإجماليات)، تُفتح صفحة إدارة فواتير المبيعات
  // بمعامل printId فتُحمِّل هي تفاصيل الفاتورة المحفوظة فعلياً وتطبعها تلقائياً (انظر ngOnInit
  // في sales-invoice-manage-page.component.ts).
  printInvoice() {
    if (!this.draftInvoiceId) return;
    this.router.navigate(['/invoices/sales/manage'], { queryParams: { printId: this.draftInvoiceId } });
  }
}
