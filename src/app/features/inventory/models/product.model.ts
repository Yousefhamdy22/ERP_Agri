// كل الأشكال هنا مؤكَّدة حياً من استجابات فعلية (2026-07-12) — لا يوجد nameAr منفصل بعد
// اليوم في أي من هذه الأشكال (كان افتراضاً سابقاً غير صحيح)؛ "name" هو الحقل الوحيد للاسم.

// Row shape from GET /api/Products?page=&pageSize=... (paginated manage-page listing).
// availableQuantity مؤكَّد حياً (2026-07-29) — الكمية الفعلية القابلة للبيع (بعد خصم
// المحجوز)، وتُعرض بدل totalStock (الذي قد يشمل كميات محجوزة غير قابلة للبيع فعلياً) —
// totalStock يبقى في الشكل من الباك ايند لكنه لم يعد يُعرض في الواجهة.
export interface ProductListItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryName: string;
  taxRatePct: number;
  totalStock: number;
  availableQuantity: number;
  isActive: boolean;
  currentCostPrice?: number | null;
  currentSellPrice?: number | null;
  currencyCode?: string | null;
}

// Row shape from GET /api/Products/by-warehouse/{warehouseId}?page=&pageSize=... — مؤكَّد حياً
// 2026-07-29: شكل مختلف تماماً عن ProductListItem (لا isActive/totalStock/currentCostPrice/
// currentSellPrice/currencyCode هنا؛ costPrice/sellPrice بلا بادئة "current"، ويضيف
// warehouseId/warehouseName/unit). لا تُخلَط الاثنتان معاً.
export interface ProductByWarehouseItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryName: string;
  warehouseId: string;
  warehouseName: string;
  availableQuantity: number;
  costPrice: number | null;
  sellPrice: number | null;
  taxRatePct: number;
  unit: string;
}

export interface ProductPriceHistoryEntry {
  id: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  // نص هنا ("CostPrice"/"SellPrice"/...) وليس رقم ordinal — بخلاف priceType في جسم
  // إنشاء السعر (POST .../prices) الذي يُرسَل كرقم.
  priceType: string;
  notes?: string | null;
}

export interface ProductPriceDetail {
  currentCostPrice?: number | null;
  currentSellPrice?: number | null;
  markupPercentage?: number | null;
  currencyCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  preferredSupplierId?: string | null;
  supplierName?: string | null;
  priceHistory: ProductPriceHistoryEntry[];
}

// مؤكَّد حياً من GET /api/Products/{id} (2026-07-29): لا يوجد warehouseName إطلاقاً في هذا
// الشكل (كان افتراضاً سابقاً خاطئاً)، والكمية مقسومة فعلياً لمتاحة/محجوزة بدل حقل quantity
// واحد. اسم المخزن يُحل من warehouseId عبر WarehouseService في صفحة العرض.
export interface ProductStockByWarehouse {
  warehouseId: string;
  availableQty: number;
  reservedQty: number;
}

// GET /api/Products/{id}
export interface ProductDetail {
  productId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  unitOfMeasure?: string | null; // GUID لوحدة القياس (مرجع Units)، ليس نصاً حراً
  categoryId: string;
  categoryName: string;
  taxRatePct: number;
  reorderLevel: number;
  weightKg: number;
  batchTrackingEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockByWarehouse: ProductStockByWarehouse[];
  priceDetail: ProductPriceDetail;
}

// POST /api/Products — مؤكَّد حياً 2026-08-01: يقبل الآن initialQuantity/costPrice/sellPrice
// مباشرة عند الإنشاء (كانت تتطلب سابقاً POST منفصلة لـ /Products/{id}/prices بعد الإنشاء،
// عبر البحث عن معرّف المنتج بالـ SKU لأن الإنشاء كان يُرجع جسماً فارغاً — انظر
// product-add-page.component.ts. لا يزال قسم "سياسة الأسعار" مفيداً لإضافة أنواع/عملات
// أسعار إضافية لاحقاً، لكن السعر الأساسي والكمية الافتتاحية يُرسَلان هنا مباشرة الآن).
export interface CreateProductDto {
  name: string;
  sku: string;
  categoryId: string;
  branchId: string;
  colorId?: string | null;
  unitId?: string | null;
  preferredSupplierId?: string | null;
  minimumStock?: number;
  barcode?: string;
  taxRatePct?: number;
  reorderLevel?: number;
  weightKg?: number;
  initialQuantity?: number;
  costPrice?: number;
  sellPrice?: number;
}

// PUT /api/Products/{id}
export interface UpdateProductDto {
  productId: string;
  name: string;
  categoryId: string;
  colorId?: string | null;
  unitId: string;
  preferredSupplierId?: string | null;
  minimumStock: number;
  barcode?: string | null;
  taxRatePct?: number;
  reorderLevel?: number;
  weightKg?: number;
  batchTrackingEnabled?: boolean;
  costPrice?: number;
  sellPrice?: number;
  branchId: string;
  newQuantity?: number;
}

// GET /api/Products/measeure-unit — كذا وردت في المواصفة (يُحتمل أنها typo لـ measure-unit
// من الباك ايند نفسه). شكل الاستجابة نفسه (id/name/nameAr) غير مؤكَّد بعد.
export interface MeasureUnit {
  id: string;
  name: string;
  nameAr?: string | null;
}

// GET /api/Products/colors — تأكيد حي 2026-07-13. لا يوجد POST /Colors (لا يمكن إنشاء لون
// جديد من الواجهة) — الألوان قائمة ثابتة تُدار من الباك ايند فقط، تُختار هنا من قائمة.
export interface ProductColor {
  id: string;
  name: string;
  hexCode: string;
  isActive: boolean;
}

// Row shape from GET /api/Products/all (lightweight, for dropdowns/pickers)
export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  isActive: boolean;
  displayName: string;
}

export enum PriceType {
  CostPrice = 1,
  SellPrice = 2,
  DiscountPrice = 3,
  PromotionalPrice = 4,
}

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  [PriceType.CostPrice]: 'سعر التكلفة',
  [PriceType.SellPrice]: 'سعر البيع',
  [PriceType.DiscountPrice]: 'سعر الخصم',
  [PriceType.PromotionalPrice]: 'السعر الترويجي',
};

// يطابق CurrencyType الحقيقي في الباك ايند (enum من 3 قيم فقط) — القيم السابقة
// (USD..SEK بعشر عملات) لم تكن مطابقة لأي enum فعلي في الـ API.
export enum CurrencyType {
  EGP = 1,
  SAR = 2,
  USD = 3,
}

export const CURRENCY_LABELS: Record<CurrencyType, string> = {
  [CurrencyType.EGP]: 'جنيه مصري (EGP)',
  [CurrencyType.SAR]: 'ريال سعودي (SAR)',
  [CurrencyType.USD]: 'دولار أمريكي (USD)',
};

// POST /api/Products/{id}/prices — شكل أغنى بكثير من المفترض سابقاً (تأكيد حي 2026-07-12).
export interface CreateProductPriceDto {
  productId: string;
  currency: CurrencyType;
  priceType: PriceType;
  price: number;
  supplierId?: string | null;
  costPrice?: number;
  markupPercentage?: number;
  discountPercentage?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
}

// PUT /api/Products/{id}/prices/current — يُحدِّث سعراً حالياً (مفتوحاً، effectiveTo=null)
// قائماً فعلاً، بخلاف POST .../prices الذي يُنشئ سجل سعر جديداً. priceId هو id السجل من
// priceHistory. تأكيد حي 2026-07-12.
export interface UpdateCurrentPriceDto {
  priceId: string;
  newPrice: number;
  markupPercentage?: number;
  discountPercentage?: number;
  newPriceEffectiveFrom: string;
  effectiveTo?: string | null;
  oldPriceEffectiveTo?: string | null;
  reason?: string | null;
}

export interface SavedPrice {
  priceType: PriceType;
  currency: CurrencyType;
  price: number;
  supplierId?: string | null;
  costPrice?: number;
  markupPercentage?: number;
  discountPercentage?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
}
