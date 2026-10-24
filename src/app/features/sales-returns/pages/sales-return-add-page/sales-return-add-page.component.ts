import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { SalesInvoiceService } from '../../../invoices/services/sales-invoice.service';
import { SalesInvoiceListItem } from '../../../invoices/models/invoice.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { SalesReturnService } from '../../services/sales-return.service';
import { SALES_RETURN_REASONS } from '../../models/sales-return.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomerService } from '../../../parties/services/customer.service';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { ProductService } from '../../../inventory/services/product.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { ProductListItem } from '../../../inventory/models/product.model';
import { PagedResult } from '../../../../shared/models/paged-result.model';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';

export interface ReturnLineItem {
  productId: string;
  warehouseId: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  originalQty: number;
  remainingQty: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  returnQty: number;
  isDirect?: boolean;
}

@Component({
  selector: 'app-sales-return-add-page',
  templateUrl: './sales-return-add-page.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    PageHeaderComponent,
    QuickActionsPanelComponent,
    SearchableComboBoxComponent, CustomSelectComponent,],
})
export class SalesReturnAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  returnMode: 'invoice' | 'direct' = 'invoice';
  saving = false;

  invoices: SalesInvoiceListItem[] = [];
  customers: PartyListItem[] = [];
  customerComboItems: ComboBoxItem[] = [];
  warehouses: Warehouse[] = [];
  catalogProducts: ProductListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  branches: BranchListItem[] = [];
  returnReasons = SALES_RETURN_REASONS;

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'ادارة فواتير المبيعات', icon: 'fa-solid fa-file-invoice', route: '/invoices/sales/manage' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'فواتير مرتجع مبيعات', route: '/sales?module=sales&tab=main' },
    { label: 'اضافة فاتورة مرتجع مبيعات' },
  ];

  form = this.fb.group({
    originalInvoiceId: [''],
    customerId: [''],
    warehouseId: [''],
    fiscalPeriodId: ['', Validators.required],
    returnDate: [new Date().toISOString().slice(0, 10), Validators.required],
    returnReason: [SALES_RETURN_REASONS[0], Validators.required],
    branchId: [''],
  });

  invoiceDetail?: any;
  returnLines: ReturnLineItem[] = [];

  get invoiceSelectOptions(): { value: string; label: string }[] {
    return [
      { value: '', label: '— اختر الفاتورة —' },
      ...this.invoices.map((inv) => ({
        value: inv.id,
        label: `${inv.invoiceNumber} - ${inv.customerName || ''} - ${inv.amountOutstanding ?? 0} متبقي`,
      })),
    ];
  }

  get warehouseSelectOptions(): { value: string; label: string }[] {
    return [
      { value: '', label: '— اختر المستودع —' },
      ...this.warehouses.map((wh) => ({
        value: wh.warehouseId,
        label: wh.name || wh.nameAr || '',
      })),
    ];
  }

  // Search & Batch Selection State
  productSearchQuery = '';
  showSearchResults = false;
  showBatchPicker = false;
  batchSearchQuery = '';
  batchSelectedMap: Record<string, { product: ProductListItem; qty: number }> = {};
  showOnlySelectedLines = false;

  constructor(
    private salesReturnService: SalesReturnService,
    private salesInvoiceService: SalesInvoiceService,
    private customerService: CustomerService,
    private warehouseService: WarehouseService,
    private productService: ProductService,
    private fiscalPeriodService: FiscalPeriodService,
    private branchService: BranchService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.updateFormValidators();

    // Fetch confirmed/posted invoices
    this.salesInvoiceService.getList({ pageSize: 200 }).subscribe({
      next: r => {
        this.invoices = (r.items || []).filter(i => i.status !== 'Draft' && i.status !== 'Cancelled');
        const invoiceId = this.route.snapshot.queryParamMap.get('invoiceId');
        if (invoiceId && this.invoices.some(i => i.id === invoiceId)) {
          this.returnMode = 'invoice';
          this.updateFormValidators();
          this.form.patchValue({ originalInvoiceId: invoiceId });
          this.onInvoiceSelected(invoiceId);
        }
      },
      error: () => {},
    });

    // Listen to invoice selection
    this.form.get('originalInvoiceId')?.valueChanges.subscribe(val => {
      if (this.returnMode === 'invoice') {
        if (val) {
          this.onInvoiceSelected(val);
        } else {
          this.invoiceDetail = undefined;
          this.returnLines = [];
        }
      }
    });

    // Fetch Customers for Direct Return Mode
    this.customerService.getAll('', 1, 200).subscribe({
      next: (res: PagedResult<PartyListItem>) => { this.customers = res.items || []; this.customerComboItems = this.customers.map((c): ComboBoxItem => ({ id: c.id, label: c.name, extra: c.phone || undefined, numericValue: c.currentBalance, numericLabel: 'رصيد' })); },
      error: () => {},
    });

    // Fetch Warehouses
    this.warehouseService.getAll().subscribe({
      next: (whs: Warehouse[]) => {
        this.warehouses = whs || [];
        if (this.warehouses.length && !this.form.value.warehouseId) {
          this.form.patchValue({ warehouseId: this.warehouses[0].warehouseId });
        }
      },
      error: () => {},
    });

    // Fetch Catalog Products
    this.productService.getList({ pageSize: 300, isActive: true }).subscribe({
      next: (res: PagedResult<ProductListItem>) => { this.catalogProducts = res.items || []; },
      error: () => {},
    });

    // Fetch Fiscal Periods & Branches
    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        this.fiscalPeriods = periods.filter(p => p.status === 'Open');
        if (this.fiscalPeriods.length) this.form.patchValue({ fiscalPeriodId: this.fiscalPeriods[0].id });
      },
      error: () => {},
    });

    this.branchService.getAll().subscribe({ next: b => { this.branches = b; }, error: () => {} });
  }

  setReturnMode(mode: 'invoice' | 'direct') {
    this.returnMode = mode;
    this.updateFormValidators();
    this.returnLines = [];
    this.invoiceDetail = undefined;
    this.productSearchQuery = '';
    this.showSearchResults = false;
  }

  private updateFormValidators() {
    if (this.returnMode === 'invoice') {
      this.form.get('originalInvoiceId')?.setValidators([Validators.required]);
      this.form.get('customerId')?.clearValidators();
      this.form.get('warehouseId')?.clearValidators();
    } else {
      this.form.get('originalInvoiceId')?.clearValidators();
      this.form.get('customerId')?.setValidators([Validators.required]);
      this.form.get('warehouseId')?.setValidators([Validators.required]);
    }
    this.form.get('originalInvoiceId')?.updateValueAndValidity();
    this.form.get('customerId')?.updateValueAndValidity();
    this.form.get('warehouseId')?.updateValueAndValidity();
  }

  get selectedInvoice(): SalesInvoiceListItem | undefined {
    return this.invoices.find(i => i.id === this.form.value.originalInvoiceId);
  }

  onInvoiceSelected(invoiceId: string) {
    this.salesInvoiceService.getDetail(invoiceId).subscribe({
      next: detail => {
        this.invoiceDetail = detail;
        this.returnLines = (detail.lines || []).map((l: any) => ({
          productId: l.productId,
          warehouseId: l.warehouseId,
          productName: l.productName,
          productSku: l.productSku,
          warehouseName: l.warehouseName || 'المخزن',
          originalQty: l.quantity,
          remainingQty: l.remainingReturnQty !== undefined ? l.remainingReturnQty : l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          taxPct: l.taxPct,
          returnQty: 0,
          isDirect: false,
        }));
      },
      error: () => {
        this.notify.error('فشل تحميل تفاصيل الفاتورة المحددة');
      },
    });
  }

  // --- Live Product Search & Quick Add ---
  get filteredCatalogSearchResults(): any[] {
    const q = this.productSearchQuery.trim().toLowerCase();
    if (!q) return [];
    if (this.returnMode === 'invoice') {
      return this.returnLines.filter(
        l => l.productName.toLowerCase().includes(q) || l.productSku.toLowerCase().includes(q)
      );
    } else {
      return this.catalogProducts.filter(
        p => (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
  }

  selectSearchResult(item: any) {
    if (this.returnMode === 'invoice') {
      const line = this.returnLines.find(l => l.productId === (item.productId || item.id));
      if (line) {
        if (line.returnQty === 0) line.returnQty = 1;
        this.notify.success(`تم اختيار الصنف: ${line.productName}`);
      }
    } else {
      this.addProductToDirectLines(item);
    }
    this.productSearchQuery = '';
    this.showSearchResults = false;
  }

  addProductToDirectLines(product: ProductListItem, initialQty = 1) {
    const whId = this.form.value.warehouseId || (this.warehouses.length ? this.warehouses[0].warehouseId : '');
    const wh = this.warehouses.find(w => w.warehouseId === whId);
    const prodId = product.productId || (product as any).id;
    const existing = this.returnLines.find(l => l.productId === prodId);
    if (existing) {
      existing.returnQty += initialQty;
      this.notify.success(`تم زيادة كمية الصنف ${product.name} إلى ${existing.returnQty}`);
    } else {
      this.returnLines.push({
        productId: prodId,
        warehouseId: whId,
        productName: product.name,
        productSku: product.sku || '',
        warehouseName: wh?.name || 'المخزن',
        originalQty: 9999,
        remainingQty: 9999,
        unitPrice: (product as any).currentSellPrice || (product as any).sellPrice || (product as any).currentCostPrice || 0,
        discountPct: 0,
        taxPct: product.taxRatePct || 14,
        returnQty: initialQty,
        isDirect: true,
      });
      this.notify.success(`تم إضافة الصنف: ${product.name}`);
    }
  }

  // --- Batch Selector Modal ---
  openBatchPicker() {
    this.batchSearchQuery = '';
    this.batchSelectedMap = {};
    this.showBatchPicker = true;
  }

  closeBatchPicker() {
    this.showBatchPicker = false;
  }

  get filteredBatchProducts(): any[] {
    const q = this.batchSearchQuery.trim().toLowerCase();
    if (this.returnMode === 'invoice') {
      return this.returnLines.filter(
        l => !q || l.productName.toLowerCase().includes(q) || l.productSku.toLowerCase().includes(q)
      );
    } else {
      return this.catalogProducts.filter(
        p => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
  }

  toggleBatchSelection(item: any) {
    const id = item.productId || item.id;
    if (this.batchSelectedMap[id]) {
      delete this.batchSelectedMap[id];
    } else {
      this.batchSelectedMap[id] = { product: item, qty: 1 };
    }
  }

  isBatchSelected(item: any): boolean {
    const id = item.productId || item.id;
    return !!this.batchSelectedMap[id];
  }

  updateBatchQty(item: any, delta: number) {
    const id = item.productId || item.id;
    if (!this.batchSelectedMap[id]) {
      this.batchSelectedMap[id] = { product: item, qty: 1 };
    } else {
      const newQty = this.batchSelectedMap[id].qty + delta;
      if (newQty <= 0) {
        delete this.batchSelectedMap[id];
      } else {
        this.batchSelectedMap[id].qty = newQty;
      }
    }
  }

  get selectedBatchCount(): number {
    return Object.keys(this.batchSelectedMap).length;
  }

  confirmBatchSelection() {
    const selectedList = Object.values(this.batchSelectedMap);
    if (!selectedList.length) {
      this.notify.error('لم يتم تحديد أي أصناف بعد');
      return;
    }

    if (this.returnMode === 'invoice') {
      for (const entry of selectedList) {
        const line = this.returnLines.find(l => l.productId === (entry.product.productId || (entry.product as any).id));
        if (line) {
          line.returnQty = Math.min(line.remainingQty, entry.qty);
        }
      }
    } else {
      for (const entry of selectedList) {
        this.addProductToDirectLines(entry.product, entry.qty);
      }
    }

    this.notify.success(`تم إضافة/تحديث ${selectedList.length} صنفاً في المرتجع`);
    this.closeBatchPicker();
  }

  // --- Quick Action Handlers ---
  selectAllLines() {
    this.returnLines.forEach(l => {
      l.returnQty = l.remainingQty > 0 ? l.remainingQty : 1;
    });
    this.notify.success('تم تحديد جميع الأصناف بالكمية المتبقية');
  }

  clearAllLines() {
    this.returnLines.forEach(l => { l.returnQty = 0; });
    this.notify.info('تم تفريغ كميات المرتجع');
  }

  removeLine(line: ReturnLineItem) {
    this.returnLines = this.returnLines.filter(l => l !== line);
  }

  onQtyChanged(line: ReturnLineItem, event: any) {
    const val = Number(event.target.value) || 0;
    if (val < 0) {
      line.returnQty = 0;
    } else if (val > line.remainingQty) {
      this.notify.error(`الكمية المرتجعة لا يمكن أن تتجاوز الكمية المتبقية (${line.remainingQty})`);
      line.returnQty = line.remainingQty;
      event.target.value = line.remainingQty;
    } else {
      line.returnQty = val;
    }
  }

  get displayedReturnLines(): ReturnLineItem[] {
    if (this.showOnlySelectedLines) {
      return this.returnLines.filter(l => l.returnQty > 0);
    }
    return this.returnLines;
  }

  get returnSubtotal(): number {
    return this.returnLines.reduce((sum, l) => sum + (l.returnQty * l.unitPrice), 0);
  }

  get returnDiscountAmount(): number {
    return this.returnLines.reduce((sum, l) => {
      const lineSubtotal = l.returnQty * l.unitPrice;
      return sum + (lineSubtotal * (l.discountPct / 100));
    }, 0);
  }

  get returnTaxAmount(): number {
    return this.returnLines.reduce((sum, l) => {
      const lineSubtotal = l.returnQty * l.unitPrice;
      const discount = lineSubtotal * (l.discountPct / 100);
      return sum + ((lineSubtotal - discount) * (l.taxPct / 100));
    }, 0);
  }

  get returnGrandTotal(): number {
    return this.returnLines.reduce((sum, l) => {
      const lineSubtotal = l.returnQty * l.unitPrice;
      const discount = lineSubtotal * (l.discountPct / 100);
      const tax = (lineSubtotal - discount) * (l.taxPct / 100);
      return sum + (lineSubtotal - discount + tax);
    }, 0);
  }

  get remainingAmount(): number {
    if (!this.invoiceDetail) return 0;
    return this.invoiceDetail.grandTotal - this.returnGrandTotal;
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
      return;
    }

    const linesToReturn = this.returnLines.filter(l => l.returnQty > 0);
    if (linesToReturn.length === 0) {
      this.notify.error('يجب إدخال كمية مرتجع أكبر من الصفر لصنف واحد على الأقل.');
      return;
    }

    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ المرتجع: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.saving = true;
    const v = this.form.value;

    const payload: any = {
      originalInvoiceId: this.returnMode === 'invoice' ? v.originalInvoiceId || null : null,
      partyId: this.returnMode === 'direct' ? v.customerId || null : null,
      warehouseId: this.returnMode === 'direct' ? v.warehouseId || null : null,
      fiscalPeriodId: v.fiscalPeriodId!,
      returnDate: new Date(v.returnDate!).toISOString(),
      returnReason: v.returnReason!,
      createdByUserId: userId,
      branchId: v.branchId || null,
      lines: linesToReturn.map(l => ({
        productId: l.productId,
        warehouseId: l.warehouseId,
        quantity: l.returnQty,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        taxPct: l.taxPct,
        description: 'مرتجع',
      })),
    };

    this.salesReturnService.create(payload).subscribe({
      next: result => {
        this.saving = false;
        this.notify.success(`تم إضافة المرتجع بنجاح كمسودة (${result.returnEntryNumber || 'مسودة'})`);
        this.router.navigate(['/sales-returns/manage']);
      },
      error: err => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إضافة المرتجع'));
      },
    });
  }
}
