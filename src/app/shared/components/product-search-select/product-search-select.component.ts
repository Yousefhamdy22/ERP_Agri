import { ApplicationRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { ProductService } from '../../../features/inventory/services/product.service';

// costPrice/sellPrice منفصلان عمداً (بدل currentSellPrice وحده سابقاً) — getByWarehouse
// (ProductByWarehouseItem) يُرجع الاثنين معاً بلا currencyCode، وgetList (ProductListItem)
// يُرجع currentCostPrice/currentSellPrice/currencyCode. فاتورة المبيعات تملأ سعر الوحدة من
// sellPrice، وفاتورة المشتريات من costPrice — كل مستهلك يختار الحقل المناسب له.
export interface ProductPickResult {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  availableQuantity: number;
  costPrice: number | null;
  sellPrice: number | null;
  currencyCode: string | null;
  taxRatePct: number;
}

// بحث حي عن صنف (اسم/كود) بدل قائمة اختيار ثابتة تحمِّل كل الأصناف دفعة واحدة —
// يستخدم ProductService.getList({search}) (endpoint بحث حقيقي مؤكَّد، بخلاف
// getAllForDropdown() الذي لا يقبل search إطلاقاً)، أو getByWarehouse عند تمرير [warehouseId]
// (يعرض فقط أصناف المخزن المحدَّد). switchMap يُلغي أي بحث سابق لم يكتمل بعد عند كتابة
// حرف جديد، فلا تصل نتيجة بحث قديمة متأخرة فوق نتيجة أحدث.
@Component({
  selector: 'app-product-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-search-select.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ProductSearchSelectComponent),
    multi: true,
  }],
})
export class ProductSearchSelectComponent implements ControlValueAccessor, OnDestroy, OnChanges {
  @Input() placeholder = '— ابحث عن صنف بالاسم أو الكود —';
  @Input() invalid = false;
  // عند تمرير مخزن محدَّد (فواتير المبيعات/المشتريات بعد اختيار المخزن)، يُستخدم
  // getByWarehouse بدل getList العام — يعرض فقط أصناف هذا المخزن تحديداً بدل كل الأصناف.
  @Input() warehouseId: string | null = null;
  // أي سعر يُعرض في قائمة النتائج بجانب كل صنف — 'sell' لفواتير المبيعات (افتراضي)،
  // 'cost' لفواتير المشتريات (السعر ذو الصلة عند الشراء هو التكلفة لا سعر البيع).
  @Input() priceField: 'cost' | 'sell' = 'sell';
  @Output() productPicked = new EventEmitter<ProductPickResult>();

  open = false;
  query = '';
  results: ProductPickResult[] = [];
  loading = false;
  selectedLabel = '';
  value: string | null = null;
  disabled = false;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private _onChange: (v: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor(private productService: ProductService, private appRef: ApplicationRef) {
    // هذا التطبيق zoneless — debounceTime يعتمد على setTimeout خام غير مرتبط بأي حدث DOM
    // تتبعه Angular (خلافاً لـ (input)/(click))، فتغيير loading هنا لن يُعاد رسمه تلقائياً
    // إلا لاحقاً عند وصول استجابة HTTP (نفس درس http-error.interceptor.ts). tick() يدوي هنا
    // يضمن ظهور مؤشر "جارٍ البحث" فوراً بدل شاشة تبدو متجمدة أثناء انتظار الشبكة.
    // ملاحظة: بلا distinctUntilChanged عمداً — عند إعادة فتح القائمة بدون كتابة شيء
    // (query يبقى '' كل مرة) نحتاج طلب "" أن يتكرر في كل toggle() ليُحمَّل نفس المعروض
    // من جديد، لا أن يُبتلَع باعتباره تكراراً للقيمة السابقة.
    this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        const term = q.trim();
        this.loading = true;
        try { this.appRef.tick(); } catch { /* تجاهل: tick قيد التنفيذ بالفعل */ }
        // لا تشترط كتابة شيء أولاً: فتح القائمة فارغة (term = '') يُرسِل بحثاً بلا
        // فلتر search فيعرض أول صفحة من كل الأصناف مباشرة (نفس سلوك getList عند
        // استخدامها في صفحة إدارة الأصناف) — أسهل للمستخدم من شاشة فارغة تطالبه بالكتابة.
        const filter = { search: term || undefined, page: 1, pageSize: 20 };
        // الشكلان مختلفان تماماً (انظر تعليق ProductPickResult)، فيُطابَق كل مصدر لنفس
        // ProductPickResult داخل فرعه الخاص بدل تعميم بعد الـ pipe.
        const results$ = this.warehouseId
          ? this.productService.getByWarehouse(this.warehouseId, filter).pipe(
              map(r => r.items.map((i): ProductPickResult => ({
                id: i.productId,
                name: i.name,
                sku: i.sku,
                categoryName: i.categoryName,
                availableQuantity: i.availableQuantity,
                costPrice: i.costPrice ?? null,
                sellPrice: i.sellPrice ?? null,
                currencyCode: null,
                taxRatePct: i.taxRatePct,
              }))),
            )
          : this.productService.getList(filter).pipe(
              map(r => r.items.map((i): ProductPickResult => ({
                id: i.productId,
                name: i.name,
                sku: i.sku,
                categoryName: i.categoryName,
                availableQuantity: i.availableQuantity,
                costPrice: i.currentCostPrice ?? null,
                sellPrice: i.currentSellPrice ?? null,
                currencyCode: i.currencyCode ?? null,
                taxRatePct: i.taxRatePct,
              }))),
            );
        return results$.pipe(catchError(() => of<ProductPickResult[]>([])));
      }),
      takeUntil(this.destroy$),
    ).subscribe(results => {
      this.loading = false;
      this.results = results;
    });
  }

  displayPrice(item: ProductPickResult): number | null {
    return this.priceField === 'cost' ? item.costPrice : item.sellPrice;
  }

  // بلا هذا: لو تغيّر المخزن (اختيار فرع/مخزن مختلف) بينما القائمة كانت مفتوحة بالفعل، تبقى
  // النتائج المعروضة تابعة للمخزن القديم حتى يُغلق المستخدم القائمة ويعيد فتحها يدوياً —
  // إعادة البحث فوراً هنا (فقط إن كانت مفتوحة) تضمن تطابق النتائج مع المخزن المحدَّد حالياً
  // دائماً. لا يُفرَّغ الصنف المُختار مسبقاً (value/selectedLabel) — تغيّر المخزن لا يُلغي
  // اختياراً تم فعلاً، فقط يُحدِّث نتائج بحث جديد لم يُختَر منه شيء بعد.
  ngOnChanges(changes: SimpleChanges) {
    if (changes['warehouseId'] && !changes['warehouseId'].firstChange && this.open) {
      this.search$.next(this.query);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this._onTouched();
      this.query = '';
      this.results = [];
      this.search$.next('');
    }
  }

  close() { this.open = false; }

  onQueryChange(q: string) {
    this.query = q;
    this.search$.next(q);
  }

  select(item: ProductPickResult) {
    this.value = item.id;
    this.selectedLabel = `${item.sku} — ${item.name}`;
    this._onChange(this.value);
    this._onTouched();
    this.productPicked.emit(item);
    this.open = false;
  }

  clear(ev: Event) {
    ev.stopPropagation();
    this.value = null;
    this.selectedLabel = '';
    this._onChange(null);
  }

  writeValue(v: string | null) {
    this.value = v ?? null;
    if (!v) this.selectedLabel = '';
  }
  registerOnChange(fn: (v: string | null) => void) { this._onChange = fn; }
  registerOnTouched(fn: () => void) { this._onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
