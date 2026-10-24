import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent, QuickAction } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { ImportProductsModalComponent } from '../../components/import-products-modal/import-products-modal.component';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { BranchService } from '../../services/branch.service';
import { BranchListItem } from '../../models/branch.model';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FlatCategory } from '../../models/category.model';
import {
  PriceType, CurrencyType, MeasureUnit, ProductColor, ProductOption,
  PRICE_TYPE_LABELS, CURRENCY_LABELS,
} from '../../models/product.model';
import { ITEMS_QUICK_ACTIONS } from '../../../../shared/data/items-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface AddedPrice {
  priceType: PriceType;
  currency: CurrencyType;
  price: number;
  effectiveFrom: string;
}

@Component({
  selector: 'app-product-add-page',
  templateUrl: './product-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, TreeSelectComponent, ImportProductsModalComponent, CustomSelectComponent,],
})
export class ProductAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving        = false;
  pricesOpen    = false;
  showImportModal = false;
  flatCategories: FlatCategory[] = [];
  measureUnits: MeasureUnit[] = [];
  colors: ProductColor[] = [];
  branches: BranchListItem[] = [];
  suppliers: PartyListItem[] = [];
  products: ProductOption[] = [];

  // سياسة الأسعار تحتاج دائماً productId حقيقياً موجوداً فعلاً في قاعدة البيانات —
  // POST /Products/{id}/prices يرفض أي id غير موجود. لذا لا يمكن "تجميع" أسعار محلياً
  // لمنتج لم يُحفَظ بعد كما كان سابقاً: يجب حفظ المنتج الجديد أولاً (saveProduct)
  // والحصول على معرّفه الحقيقي، ثم تُضاف الأسعار بعده مباشرة بنفس الطريقة المستخدمة
  // لمنتج موجود بالفعل (وضع "existing") — كلا الوضعين يستخدمان createPriceFor() نفسها.
  priceTargetMode: 'new' | 'existing' = 'new';
  existingProductId = '';
  addingPrice = false;

  savedProductId: string | null = null;
  savedProductName = '';
  addedPrices: AddedPrice[] = [];

  // نقطة حرجة (بطلب المستخدم): كان حقل "السعر" يُملأ يدوياً بينما "نسبة الهامش" تُرسَل
  // بجانبه كحقل منفصل قد لا يطابقه فعلياً — لا شيء يربطهما. الآن يختار المستخدم صراحة:
  // إدخال السعر يدوياً، أو حسابه تلقائياً = التكلفة + نسبة الهامش (فيُقفَل حقل السعر
  // ويُحسَب حياً)، فلا يوجد احتمال تضارب بين القيمتين المُرسَلتين للباك ايند.
  priceEntryMode: 'manual' | 'markup' = 'manual';

  quickActions = ITEMS_QUICK_ACTIONS;
  topButton = { label: 'ادارة الأصناف', icon: 'fa-solid fa-table-list', route: '/inventory/products/manage' };

  get categoryOptions(): TreeSelectOption[] {
    return this.flatCategories.map(c => ({ value: c.categoryId, label: c.nameAr, level: c.level }));
  }

  get selectedColorHex(): string | null {
    const id = this.productForm.value.colorId;
    if (!id) return null;
    const c = this.colors.find(x => x.id === id);
    return c ? `#${c.hexCode.replace(/^#/, '')}` : null;
  }
  priceTypes = Object.entries(PRICE_TYPE_LABELS).map(([k, v]) => ({ value: +k as PriceType, label: v }));
  currencies  = Object.entries(CURRENCY_LABELS).map(([k, v])  => ({ value: +k as CurrencyType, label: v }));

  productForm = this.fb.group({
    name:                ['', [Validators.required, Validators.minLength(2)]],
    sku:                 ['', [Validators.required]],
    categoryId:          ['', [Validators.required]],
    branchId:            ['', [Validators.required]],
    unitId:              [''],
    preferredSupplierId: [''],
    minimumStock:        [null as number | null, [Validators.min(0)]],
    colorId:             [''],
    barcode:             [''],
    taxRatePct:          [null as number | null, [Validators.min(0), Validators.max(100)]],
    reorderLevel:        [null as number | null, [Validators.min(0)]],
    weightKg:            [null as number | null, [Validators.min(0)]],
    // مؤكَّد حياً 2026-08-01: الكمية الافتتاحية وسعرَي التكلفة/البيع الأساسيَّين يُرسَلان الآن
    // مع الإنشاء مباشرة بدل POST منفصلة لاحقة لـ /Products/{id}/prices.
    initialQuantity:     [null as number | null, [Validators.min(0)]],
    costPrice:           [null as number | null, [Validators.min(0)]],
    sellPrice:           [null as number | null, [Validators.min(0)]],
  });

  priceForm = this.fb.group({
    priceType:          [PriceType.SellPrice, Validators.required],
    currency:           [CurrencyType.EGP,    Validators.required],
    price:               [null as number | null, [Validators.required, Validators.min(0.001)]],
    costPrice:           [null as number | null, [Validators.min(0)]],
    markupPercentage:    [null as number | null, [Validators.min(0)]],
    discountPercentage:  [null as number | null, [Validators.min(0), Validators.max(100)]],
    supplierId:          [''],
    effectiveFrom:       [new Date().toISOString().slice(0, 10), Validators.required],
    effectiveTo:         [''],
    notes:               [''],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'اضافة صنف' },
  ];

  constructor(
    private categoryService: CategoryService,
    private productService:  ProductService,
    private branchService:   BranchService,
    private supplierService: SupplierService,
    private notify:          NotificationService,
    private router:          Router,
  ) {}

  ngOnInit() {
    this.categoryService.getTree().subscribe({
      next: tree => { this.flatCategories = CategoryService.flattenTree(tree); },
    });
    this.productService.getMeasureUnits().subscribe({
      next: u => { this.measureUnits = u; },
      error: () => {},
    });
    this.productService.getColors().subscribe({
      next: c => { this.colors = c; },
      error: () => {},
    });
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.productForm.value.branchId) this.productForm.patchValue({ branchId: b[0].id }); },
      error: () => { this.notify.error('تعذّر تحميل قائمة الفروع'); },
    });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });
    this.productService.getAllForDropdown().subscribe({
      next: p => { this.products = p; },
      error: () => {},
    });
  }

  invalidP(ctrl: string): boolean {
    const c = this.productForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  invalidPr(ctrl: string): boolean {
    const c = this.priceForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  indent(level: number): string {
    return '—'.repeat(level) + (level ? ' ' : '');
  }

  togglePrices() { this.pricesOpen = !this.pricesOpen; }

  importSucceeded = false;

  onQuickAction(action: QuickAction) {
    if (action.label === 'استيراد من اكسيل الاصناف') { this.importSucceeded = false; this.showImportModal = true; }
  }

  // لا يوجد هنا قائمة أصناف لتحديثها (هذه صفحة إضافة) — عند إغلاق المستخدم للـ modal
  // بعد استيراد ناجح فعلاً (وليس مجرد إغلاق مبكر قبل رفع أي ملف) يُنقَل لصفحة الإدارة
  // ليرى الأصناف المستوردة في القائمة.
  onImportClosed() {
    this.showImportModal = false;
    if (this.importSucceeded) this.router.navigate(['/inventory/products/manage']);
  }

  // يحفظ بيانات المنتج فقط (بدون أسعار) — لا يمكن إنشاء سعر لمنتج لم يُحفَظ بعد لأن
  // POST /Products/{id}/prices يتطلب id حقيقياً موجوداً في القاعدة. بعد الحفظ يُقفَل
  // النموذج ويتفعّل قسم الأسعار لهذا المنتج بالتحديد.
  saveProduct() {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.productForm.value;

    this.productService.create({
      name:                v.name!,
      sku:                 v.sku!,
      categoryId:          v.categoryId!,
      branchId:            v.branchId!,
      colorId:             v.colorId              || undefined,
      unitId:              v.unitId              || undefined,
      preferredSupplierId: v.preferredSupplierId  || undefined,
      minimumStock:        v.minimumStock         ?? undefined,
      barcode:             v.barcode              || undefined,
      taxRatePct:          v.taxRatePct           ?? undefined,
      reorderLevel:        v.reorderLevel         ?? undefined,
      weightKg:            v.weightKg             ?? undefined,
      initialQuantity:     v.initialQuantity      ?? undefined,
      costPrice:           v.costPrice            ?? undefined,
      sellPrice:           v.sellPrice            ?? undefined,
    }).subscribe({
      next: product => {
        this.saving = false;
        // تأكيد حي 2026-07-14: POST /Products يرجع جسماً فارغاً (null) — لا "productId"
        // ولا "id". لا يوجد أي مصدر مباشر لمعرّف المنتج الجديد من استجابة الإنشاء نفسها.
        // الحل: البحث عنه فوراً بواسطة SKU (فريد) عبر GET /Products?search=... بدل ترك
        // زر إضافة السعر مقفلاً بصمت أو رمي استثناء عند قراءة خاصية من null.
        const created = product as unknown as { productId?: string; id?: string } | null;
        const directId = created?.productId || created?.id || null;
        if (directId) {
          this.applySavedProduct(directId, v.name!);
          return;
        }
        this.productService.getList({ search: v.sku!, pageSize: 5 }).subscribe({
          next: r => {
            const match = r.items.find(i => i.sku.toLowerCase() === v.sku!.toLowerCase());
            if (match) this.applySavedProduct(match.productId, v.name!);
            else this.notify.error('تم حفظ المنتج لكن تعذّر العثور على معرّفه تلقائياً — استخدم صفحة "تحديث أسعار الأصناف" لإضافة سعر له');
          },
          error: () => {
            this.notify.error('تم حفظ المنتج لكن تعذّر العثور على معرّفه تلقائياً — استخدم صفحة "تحديث أسعار الأصناف" لإضافة سعر له');
          },
        });
      },
      error: () => {
        this.notify.error('تعذّر حفظ المنتج');
        this.saving = false;
      },
    });
  }

  private applySavedProduct(productId: string, name: string) {
    this.savedProductId = productId;
    this.savedProductName = name;
    this.addedPrices = [];
    this.priceTargetMode = 'new';
    this.pricesOpen = true;
    this.productForm.disable();
    this.notify.success('تم حفظ الصنف بنجاح — يمكنك الآن إضافة سعر له بالأسفل');
  }

  finish() { this.router.navigate(['/inventory/products/manage']); }

  addAnother() {
    this.productForm.reset();
    this.productForm.enable();
    this.savedProductId = null;
    this.savedProductName = '';
    this.addedPrices = [];
    this.priceTargetMode = 'new';
    this.existingProductId = '';
    this.pricesOpen = false;
    if (this.branches.length) this.productForm.patchValue({ branchId: this.branches[0].id });
  }

  onPriceTargetModeChange() {
    this.existingProductId = '';
    this.addedPrices = this.priceTargetMode === 'existing' ? [] : this.addedPrices;
  }

  onExistingProductChange() {
    this.addedPrices = [];
  }

  submitPrice() {
    const productId = this.priceTargetMode === 'existing' ? this.existingProductId : this.savedProductId;
    if (!productId) {
      this.notify.error(this.priceTargetMode === 'existing' ? 'اختر المنتج أولاً لإضافة سعر له' : 'احفظ بيانات المنتج أولاً لإضافة سعر له');
      return;
    }
    if (this.priceForm.invalid) { this.priceForm.markAllAsTouched(); return; }
    const v = this.priceForm.value;
    const priceType = +v.priceType! as PriceType;
    const currency  = +v.currency!  as CurrencyType;

    // نفس نوع السعر/العملة أُضيف بالفعل لهذا المنتج في هذه الجلسة — إعادة إرسال POST
    // تُنشئ سجلاً مكرراً جديداً بدل تعديل الموجود. التعديل يتم من صفحة "تحديث السعر"
    // (PUT .../prices/current)، وليس بإعادة استدعاء إنشاء السعر هنا.
    const duplicate = this.addedPrices.some(p => p.priceType === priceType && p.currency === currency);
    if (duplicate) {
      this.notify.info('تمت إضافة هذا النوع من السعر بالفعل لهذا المنتج — لتعديله استخدم صفحة "تحديث السعر"');
      return;
    }

    this.addingPrice = true;
    this.productService.addPrice(productId, {
      productId,
      priceType, currency,
      price:                 Number(v.price!),
      costPrice:             v.costPrice ?? undefined,
      markupPercentage:      v.markupPercentage ?? undefined,
      discountPercentage:    v.discountPercentage ?? undefined,
      supplierId:            v.supplierId || null,
      effectiveFrom:         v.effectiveFrom!,
      effectiveTo:           v.effectiveTo || null,
      notes:                 v.notes || null,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة السعر للمنتج بنجاح');
        this.addingPrice = false;
        this.addedPrices.push({ priceType, currency, price: Number(v.price!), effectiveFrom: v.effectiveFrom! });
        this.resetPriceFormFields();
      },
      error: () => {
        this.notify.error('تعذّر إضافة السعر');
        this.addingPrice = false;
      },
    });
  }

  onPriceEntryModeChange() {
    if (this.priceEntryMode === 'markup') this.recomputeMarkupPrice();
  }

  recomputeMarkupPrice() {
    if (this.priceEntryMode !== 'markup') return;
    const cost = Number(this.priceForm.value.costPrice) || 0;
    const markup = Number(this.priceForm.value.markupPercentage) || 0;
    const computed = cost > 0 ? cost * (1 + markup / 100) : 0;
    this.priceForm.patchValue({ price: Math.round(computed * 100) / 100 }, { emitEvent: false });
  }

  private resetPriceFormFields() {
    this.priceForm.patchValue({ price: null, costPrice: null, markupPercentage: null, discountPercentage: null, notes: '' });
    this.priceForm.get('price')?.markAsUntouched();
  }

  getPriceTypeLabel(t: PriceType): string { return PRICE_TYPE_LABELS[t] ?? ''; }
  getCurrencyLabel(c: CurrencyType):  string { return CURRENCY_LABELS[c]  ?? ''; }
}
