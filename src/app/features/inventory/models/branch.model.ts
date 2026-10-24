export enum BranchType {
  Headquarters = 1,
  Retail = 2,
  Wholesale = 3,
  Warehouse = 4,
  ServiceCenter = 5,
}

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  [BranchType.Headquarters]: 'المركز الرئيسي',
  [BranchType.Retail]: 'فرع تجزئة',
  [BranchType.Wholesale]: 'فرع جملة',
  [BranchType.Warehouse]: 'مخزن',
  [BranchType.ServiceCenter]: 'مركز خدمة',
};

// مصدر CreateBranchCommand الفعلي (لصقه المستخدم حياً 2026-07-16):
// public record CreateBranchCommand(string Name, string Code, string City, string Address,
//   string Phone, string Email, string ManagerName, bool IsHeadquarters = false,
//   BranchType BranchType = BranchType.Retail, CurrencyType Currency = CurrencyType.EGP)
// —ترتيب CurrencyType هنا مختلف عن الترتيب الذي كان مفترَضاً سابقاً: EGP=1, USD=2, SAR=3
// (وليس EGP=1, SAR=2, USD=3 كما كان في هذا الملف قبل 2026-07-16).
export enum CurrencyType {
  EGP = 1,
  USD = 2,
  SAR = 3,
}

export const CURRENCY_LABELS: Record<CurrencyType, string> = {
  [CurrencyType.EGP]: 'جنيه مصري (EGP)',
  [CurrencyType.USD]: 'دولار أمريكي (USD)',
  [CurrencyType.SAR]: 'ريال سعودي (SAR)',
};

// POST /api/Branches — كل الحقول nullable ما عدا name (مؤكد حياً 2026-07-16 عبر اختبار فعلي: رغم
// أن CreateBranchCommand.cs يعرّف code/city/address/phone/email/managerName كـ string بدون قيمة
// افتراضية، الباك ايند لا يفرض عليها [Required] وقت التشغيل — الإلزام الفعلي على name فقط).
// لا يوجد nameAr في الـ command أصلاً.
// حُلَّت مشكلة branchType/currency 2026-07-19: السبب الحقيقي لم يكن قيمة الرقم أو اسم الـ enum
// نصاً — الـ <select> في القالب كان يستخدم [value] (يُحوِّل أي شيء لنص DOM دائماً) بدل
// [ngValue]، فكانت كل "محاولة رقمية" سابقة ترسل فعلياً نصاً مثل "2" بين علامتي اقتباس، وهو ما
// يرفضه محوِّل enum الافتراضي في .NET (يقبل رقماً خاماً غير مقتبَس فقط، بلا JsonStringEnumConverter
// على هذا الحقل). أُصلح القالب لاستخدام [ngValue]، وهنا النوع رقم (BranchType) وليس نصاً.
export interface CreateBranchDto {
  name: string;
  code?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isHeadquarters?: boolean;
  branchType?: BranchType;
  currency?: CurrencyType;
}

// PUT /api/Branches/{branchId} — نفس ملاحظة branchType/currency أعلاه (رقم لا نص)، ولا يوجد isHeadquarters هنا.
export interface UpdateBranchDto {
  branchId: string;
  name: string;
  nameAr?: string;
  city?: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  branchType: BranchType;
  currency?: CurrencyType;
}

// Row shape من GET /api/Branches/all (Dropdown) و GET /api/Branches/list (جدول الإدارة) — نفس الـ DTO للاثنين.
export interface BranchListItem {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  city: string;
  branchType: BranchType;
  managerName: string;
  isHeadquarters: boolean;
  isActive: boolean;
  currency: CurrencyType;
  totalProducts: number;
  createdAt?: string | null;
}

// GET /api/Branches/BranchWithWarehouses?BranchId={id} — مؤكَّد حياً 2026-07-29: يُستخدم بدل
// تحميل كل المخازن (WarehouseService.getAll) عند اختيار فرع في فواتير المبيعات/المشتريات —
// يعرض فقط مخازن هذا الفرع تحديداً بدل كل مخازن النظام.
export interface BranchWarehouseOption {
  warehouseId: string;
  name: string;
  location: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export interface BranchWithWarehouses {
  branchId: string;
  name: string;
  isActive: boolean;
  warehouses: BranchWarehouseOption[];
}

// GET /api/Branches/{id} — تفاصيل كاملة (تُستخدم لتعبئة نموذج التعديل).
// ملاحظة: branchType هنا يرجع كنص جاهز من الباك ايند (BranchDetailDto.BranchType هو string)،
// خلافاً لـ BranchListItemDto الذي يرجعه كرقم الـ enum.
export interface BranchDetail {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  managerName: string;
  isHeadquarters: boolean;
  branchType: string;
  currency: CurrencyType;
  isActive: boolean;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  totalProducts: number;
  totalSalesQuantities: number;
  pendingStockTransfers: number;
}
