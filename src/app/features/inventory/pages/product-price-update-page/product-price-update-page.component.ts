import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  ProductOption, ProductPriceHistoryEntry, PriceType, CurrencyType,
  PRICE_TYPE_LABELS, CURRENCY_LABELS,
} from '../../models/product.model';
import { ITEMS_QUICK_ACTIONS } from '../../../../shared/data/items-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-product-price-update-page',
  templateUrl: './product-price-update-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class ProductPriceUpdatePageComponent implements OnInit {
  private fb = inject(FormBuilder);

  products: ProductOption[] = [];
  suppliers: PartyListItem[] = [];
  search = '';
  selectedProduct: ProductOption | null = null;
  saving = false;
  historyLoading = false;
  priceHistory: ProductPriceHistoryEntry[] = [];

  priceTypes = Object.entries(PRICE_TYPE_LABELS).map(([k, v]) => ({ value: +k as PriceType, label: v }));
  currencies = Object.entries(CURRENCY_LABELS).map(([k, v]) => ({ value: +k as CurrencyType, label: v }));

  // السجل (المفتوح — effectiveTo فارغ) الجاري تحديثه حالياً، إن وُجد
  updatingEntry: ProductPriceHistoryEntry | null = null;
  // true عند فتح نموذج "إضافة سعر جديد" (POST) بدل تحديث سعر قائم (PUT) — الاثنان
  // متمايزان تماماً ولا يُفتحان معاً.
  addingNew = false;

  // نقطة حرجة (بطلب المستخدم): نسبة الهامش كانت تُرسَل كحقل منفصل بجانب السعر يدوياً
  // دون أن تربط الاثنين فعلياً — يختار المستخدم الآن صراحة إدخال السعر يدوياً أو حسابه
  // تلقائياً = التكلفة + نسبة الهامش، فلا تضارب بين القيمتين المُرسَلتين للباك ايند.
  addPriceEntryMode: 'manual' | 'markup' = 'manual';
  updatePriceEntryMode: 'manual' | 'markup' = 'manual';
  // أساس حساب الهامش لنموذج "تحديث سعر قائم" (لا يحتوي حقل تكلفة خاصاً به) — يُقرأ من
  // ProductPriceDetail.currentCostPrice المُحمَّل مع سجل الأسعار لنفس الصنف.
  currentCostPrice: number | null = null;

  quickActions = ITEMS_QUICK_ACTIONS;
  topButton = { label: 'ادارة الأصناف', icon: 'fa-solid fa-table-list', route: '/inventory/products/manage' };

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'تحديث أسعار الأصناف' },
  ];

  updateForm = this.fb.group({
    newPrice: [null as number | null, [Validators.required, Validators.min(0.001)]],
    markupPercentage: [null as number | null, [Validators.min(0)]],
    discountPercentage: [null as number | null, [Validators.min(0), Validators.max(100)]],
    newPriceEffectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required],
    effectiveTo: [''],
    oldPriceEffectiveTo: [new Date().toISOString().slice(0, 10)],
    reason: ['', Validators.required],
  });

  addForm = this.fb.group({
    priceType: [PriceType.SellPrice, Validators.required],
    currency: [CurrencyType.EGP, Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0.001)]],
    costPrice: [null as number | null, [Validators.min(0)]],
    markupPercentage: [null as number | null, [Validators.min(0)]],
    discountPercentage: [null as number | null, [Validators.min(0), Validators.max(100)]],
    supplierId: [''],
    effectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required],
    effectiveTo: [''],
    notes: [''],
  });

  constructor(
    private productService: ProductService,
    private supplierService: SupplierService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.productService.getAllForDropdown().subscribe({ next: p => { this.products = p; }, error: () => {} });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });
  }

  get filteredProducts(): ProductOption[] {
    if (!this.search.trim()) return this.products;
    const q = this.search.trim().toLowerCase();
    return this.products.filter(p => p.sku.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q));
  }

  selectProduct(p: ProductOption) {
    this.selectedProduct = p;
    this.updatingEntry = null;
    this.addingNew = false;
    this.loadHistory(p.id);
  }

  clearSelection() {
    this.selectedProduct = null;
    this.priceHistory = [];
    this.updatingEntry = null;
    this.addingNew = false;
  }

  private loadHistory(productId: string) {
    this.historyLoading = true;
    this.productService.getById(productId).subscribe({
      next: detail => {
        this.priceHistory = detail.priceDetail?.priceHistory ?? [];
        this.currentCostPrice = detail.priceDetail?.currentCostPrice ?? null;
        this.historyLoading = false;
      },
      error: () => { this.priceHistory = []; this.historyLoading = false; },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.updateForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  invalidAdd(ctrl: string): boolean {
    const c = this.addForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // ── تحديث سعر قائم (PUT .../prices/current) ─────────────────────────────────
  openUpdate(entry: ProductPriceHistoryEntry) {
    this.addingNew = false;
    this.updatingEntry = entry;
    this.updatePriceEntryMode = 'manual';
    const today = new Date().toISOString().slice(0, 10);
    this.updateForm.reset({
      newPrice: entry.amount,
      markupPercentage: null,
      discountPercentage: null,
      newPriceEffectiveFrom: today,
      effectiveTo: '',
      oldPriceEffectiveTo: today,
      reason: '',
    });
  }

  cancelUpdate() {
    this.updatingEntry = null;
  }

  onUpdatePriceEntryModeChange() {
    if (this.updatePriceEntryMode === 'markup') this.recomputeMarkupNewPrice();
  }

  recomputeMarkupNewPrice() {
    if (this.updatePriceEntryMode !== 'markup' || this.currentCostPrice == null) return;
    const markup = Number(this.updateForm.value.markupPercentage) || 0;
    const computed = this.currentCostPrice * (1 + markup / 100);
    this.updateForm.patchValue({ newPrice: Math.round(computed * 100) / 100 }, { emitEvent: false });
  }

  submitUpdate() {
    if (!this.selectedProduct || !this.updatingEntry || this.updateForm.invalid) { this.updateForm.markAllAsTouched(); return; }
    const v = this.updateForm.value;
    const productId = this.selectedProduct.id;

    this.saving = true;
    this.productService.updateCurrentPrice(productId, {
      priceId: this.updatingEntry.id,
      newPrice: Number(v.newPrice),
      markupPercentage: v.markupPercentage ?? undefined,
      discountPercentage: v.discountPercentage ?? undefined,
      newPriceEffectiveFrom: v.newPriceEffectiveFrom!,
      effectiveTo: v.effectiveTo || null,
      oldPriceEffectiveTo: v.oldPriceEffectiveTo || null,
      reason: v.reason || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.notify.success('تم تحديث السعر بنجاح');
        this.updatingEntry = null;
        this.loadHistory(productId);
      },
      error: () => {
        this.saving = false;
        this.notify.error('تعذّر تحديث السعر');
      },
    });
  }

  // ── إضافة سعر جديد (POST .../prices) — لصنف ليس له سعر من هذا النوع بعد ─────
  openAddNew() {
    this.updatingEntry = null;
    this.addingNew = true;
    this.addPriceEntryMode = 'manual';
    this.addForm.reset({
      priceType: PriceType.SellPrice,
      currency: CurrencyType.EGP,
      price: null,
      costPrice: null,
      markupPercentage: null,
      discountPercentage: null,
      supplierId: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
      notes: '',
    });
  }

  cancelAddNew() {
    this.addingNew = false;
  }

  onAddPriceEntryModeChange() {
    if (this.addPriceEntryMode === 'markup') this.recomputeMarkupAddPrice();
  }

  recomputeMarkupAddPrice() {
    if (this.addPriceEntryMode !== 'markup') return;
    const cost = Number(this.addForm.value.costPrice) || 0;
    const markup = Number(this.addForm.value.markupPercentage) || 0;
    const computed = cost > 0 ? cost * (1 + markup / 100) : 0;
    this.addForm.patchValue({ price: Math.round(computed * 100) / 100 }, { emitEvent: false });
  }

  submitAddNew() {
    if (!this.selectedProduct || this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    const v = this.addForm.value;
    const productId = this.selectedProduct.id;

    this.saving = true;
    this.productService.addPrice(productId, {
      productId,
      priceType: v.priceType!,
      currency: v.currency!,
      price: Number(v.price),
      costPrice: v.costPrice ?? undefined,
      markupPercentage: v.markupPercentage ?? undefined,
      discountPercentage: v.discountPercentage ?? undefined,
      supplierId: v.supplierId || null,
      effectiveFrom: v.effectiveFrom!,
      effectiveTo: v.effectiveTo || null,
      notes: v.notes || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.notify.success('تم إضافة السعر بنجاح');
        this.addingNew = false;
        this.loadHistory(productId);
      },
      error: () => {
        this.saving = false;
        this.notify.error('تعذّر إضافة السعر');
      },
    });
  }
}
