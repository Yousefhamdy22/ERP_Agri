// نقاط الرصيد الافتتاحي (create-*-opening-balance، list، DELETE {id}) غير مؤكَّدة حياً على
// الباك ايند — أفضل تخمين بناءً على مواصفات مقدَّمة، بانتظار اختبار حقيقي (نفس نمط
// Payments/الاستيراد). القائمة موحَّدة (endpoint واحد بفلتر type) بدل GET منفصل لكل نوع
// كما افترضت المواصفة الأصلية — تبسيط متعمَّد لتفادي 5 نقاط قراءة مخمَّنة إضافية.
//
// تحديث 2026-07-18: يوجد الآن Chart of Accounts حقيقي — GET /api/Accountings/load
// (AccountService في shared/services) يعيد {id, accountCode, name, nameAr} لكل حساب.
// الرصيد اليدوي أصبح يستخدم accountId (Guid) حقيقي من قائمة اختيار بدل accountCode/
// accountName النصي الحر السابق (كان تخميناً قبل تأكيد وجود endpoint فعلي). الأنواع
// الأخرى (بنك/مورد/عميل/مخزون) ما زالت تستخدم بيانات نصية حرة (البنك) أو قوائم حقيقية
// من خدمات مؤكَّدة بالفعل (SupplierService/CustomerService/ProductService/WarehouseService).
// BalanceSide يطابق تماماً enum-ي الباك ايند الحقيقيين NormalBalance/LineSide (Debit=1/Credit=2،
// راجع shared/models/accounting-enums.model.ts) — لكن التخاطب الفعلي مع الـ API يرسل الاسم
// النصي 'Debit'/'Credit' مباشرة (JsonStringEnumConverter)، لا رقماً. كان هناك BALANCE_SIDE_ORDINAL
// هنا يحوِّل لرقم يدوياً بقيم خاطئة (Debit=0/Credit=1 بدل 1/2 الحقيقية) — حُذف 2026-07-18 بعد
// اكتشاف قيم الـ enum الحقيقية؛ opening-balance.service.ts يرسل الآن dto.side كنص مباشرة.
export type BalanceSide = 'Debit' | 'Credit';
// يطابق enum الباك ايند OpeningBalanceStatus الحقيقي (Draft=1/Confirmed=2/Pending=3).
export type OpeningBalanceStatus = 'Draft' | 'Confirmed' | 'Pending';
// تصنيف واجهة مستخدم تقريبي (أي نموذج إنشاء استُخدم) — غير مطابق لأي enum حقيقي واحد في
// الباك ايند. راجع OpeningBalanceCategory/OpeningBalanceSource في accounting-enums.model.ts
// للـ enums الحقيقية (تصنيف حساب من 10 قيم، ومصدر يدوي/مُرحَّل من فترة سابقة) قبل أي محاولة
// لدمج/إعادة هيكلة هذا التصنيف المحلي — لا يوجد تطابق مباشر 1:1 بينهما بعد.
export type OpeningBalanceType = 'Manual' | 'Bank' | 'Supplier' | 'Customer' | 'Inventory';

export const BALANCE_SIDE_LABELS: Record<BalanceSide, string> = {
  Debit: 'مدين',
  Credit: 'دائن',
};

export const OPENING_BALANCE_STATUS_LABELS: Record<OpeningBalanceStatus, string> = {
  Draft: 'مسودة',
  Confirmed: 'مؤكَّد',
  Pending: 'بانتظار الاعتماد',
};

export const OPENING_BALANCE_STATUS_BADGE: Record<OpeningBalanceStatus, string> = {
  Draft: 'bg-orange-200 text-orange-800',
  Confirmed: 'bg-green-200 text-green-800',
  Pending: 'bg-blue-200 text-blue-800',
};

export const OPENING_BALANCE_TYPE_LABELS: Record<OpeningBalanceType, string> = {
  Manual: 'يدوي',
  Bank: 'بنك',
  Supplier: 'مورد',
  Customer: 'عميل',
  Inventory: 'مخزون',
};

export const OPENING_BALANCE_TYPE_ICONS: Record<OpeningBalanceType, string> = {
  Manual: 'fa-solid fa-pen',
  Bank: 'fa-solid fa-building-columns',
  Supplier: 'fa-solid fa-truck-field',
  Customer: 'fa-solid fa-user',
  Inventory: 'fa-solid fa-boxes-stacked',
};

export const OPENING_BALANCE_TYPE_BADGE: Record<OpeningBalanceType, string> = {
  Manual: 'bg-blue-100 text-blue-700',
  Bank: 'bg-teal-100 text-teal-700',
  Supplier: 'bg-orange-100 text-orange-700',
  Customer: 'bg-purple-100 text-purple-700',
  Inventory: 'bg-cyan-100 text-cyan-700',
};

export const OPENING_BALANCE_CURRENCIES = ['EGP', 'USD', 'SAR'];

// POST /api/opening_balances/create-manual-opening-balance — confirmed live via Swagger 2026-07-18
export interface CreateManualOpeningBalanceDto {
  accountId: string;
  balance: number;
  side: BalanceSide;
  balanceDate: string;
  fiscalPeriodId: string;
  branchId: string;
  description?: string | null;
  notes?: string | null;
  userId: string;
}

// POST /api/opening_balances/create-bank-opening-balance
export interface CreateBankOpeningBalanceDto {
  branchId: string;
  fiscalPeriodId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountCode: string;
  balance: number;
  currency: string;
  balanceDate: string;
  notes?: string | null;
  userId: string;
}

// POST /api/opening_balances/create-supplier-opening-balance
export interface CreateSupplierOpeningBalanceDto {
  branchId: string;
  fiscalPeriodId: string;
  supplierId: string;
  balance: number;
  side: BalanceSide;
  balanceDate: string;
  notes?: string | null;
  userId: string;
}

// POST /api/opening_balances/create-customer-opening-balance
export interface CreateCustomerOpeningBalanceDto {
  branchId: string;
  fiscalPeriodId: string;
  customerId: string;
  balance: number;
  side: BalanceSide;
  balanceDate: string;
  notes?: string | null;
  userId: string;
}

// POST /api/opening_balances/create-inventory-opening-balance — الحقل اسمه itemId فعلياً
// وليس productId (مؤكَّد حياً 2026-07-19: إرسال productId يُتجاهَل بصمت، فيصل ItemId فارغاً
// {00000000-...} على الباك ايند، فيفشل البحث عنه بخطأ NotFound مضلِّل لا يذكر اسم الحقل).
// القيمة المُرسَلة لا تزال معرِّف المنتج (Product) نفسه، فقط اسم مفتاح الـ JSON اختلف.
export interface CreateInventoryOpeningBalanceDto {
  branchId: string;
  fiscalPeriodId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  balanceDate: string;
  notes?: string | null;
  userId: string;
}

// PUT /api/opening_balances/{id}
export interface UpdateOpeningBalanceDto {
  id: string;
  amount: number;
  side: BalanceSide;
  notes?: string | null;
  balanceDate?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  partyId?: string | null;
}

// POST /api/opening_balances/import-supplier-opening-balance و import-customer-opening-balance
// — نتيجة استيراد جماعي بالجملة عبر Excel (بخلاف {id} المرجَعة من create-supplier/
// create-customer-opening-balance للإدخال الفردي). شكل غير مؤكَّد حياً بعد، مبني حسب مواصفة
// مُعطاة (نفس نمط import-inventory-opening-balance من ناحية الفكرة، شكل استجابة مختلف).
export interface OpeningBalanceImportLineResult {
  rowNumber: number;
  partyName: string;
  amount: number;
  side: BalanceSide;
  isSuccess: boolean;
  errorMessage: string | null;
}

export interface OpeningBalanceImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  totalDebitValue: number;
  totalCreditValue: number;
  journalEntryId: string | null;
  journalNumber: string | null;
  lineResults: OpeningBalanceImportLineResult[];
}

// POST /api/opening_balances/confirm-single — تأكيد رصيد افتتاحي واحد فردياً (بديل عن
// confirm الجماعي الذي يؤكِّد كل مسودات فترة مالية دفعة واحدة). شكل غير مؤكَّد حياً بعد،
// مبني حسب مواصفة مُعطاة.
export interface ConfirmSingleOpeningBalanceResult {
  openingBalanceId: string;
  status: OpeningBalanceStatus;
  journalEntryId: string | null;
  journalNumber: string | null;
  description: string;
}

export interface RevertSingleOpeningBalanceResult {
  openingBalanceId: string;
  status: OpeningBalanceStatus;
  description: string;
}

// GET /api/opening_balances/list — شكل حقيقي مؤكَّد حياً 2026-07-18 (يختلف جذرياً عن التخمين
// السابق). ملاحظات مهمة:
// - الحقل الذي كنا نسميه محلياً "type" (يدوي/بنك/مورد/عميل/مخزون) اسمه الحقيقي في الاستجابة
//   وفي فلتر الاستعلام هو "source" — أبقينا اسم النوع المحلي OpeningBalanceType كما هو
//   (تسمية داخلية فقط)، لكن التخاطب مع الباك ايند يستخدم "source".
// - الحقل الذي كنا نسميه "side" (مدين/دائن) اسمه الحقيقي "balanceType" في الاستجابة.
// - كل صف (بغض النظر عن النوع) يحمل accountId/accountCode/accountName لأن كل رصيد افتتاحي
//   مرتبط فعلياً بحساب من دليل الحسابات — لا يوجد warehouseId/productId/customerId مباشرة في
//   هذه القائمة الموحَّدة (قد لا يمكن تمييز رصيد مخزون عن رصيد آخر بنفس الحساب من هذه القائمة وحدها).
// - لا يوجد حقل balanceDate في الاستجابة إطلاقاً (رغم أنه يُرسَل عند الإنشاء) — createdAt هو
//   التاريخ الوحيد المتاح للعرض.
// - debitAmount/creditAmount/netAmount ظهرت كلها 0 في كل الأمثلة الحية رغم amount غير الصفري
//   — على الأرجح لا تُحسَب إلا بعد ترحيل/تأكيد الرصيد؛ لا تُعتمَد للعرض، استخدم amount فقط.
export interface OpeningBalanceListItem {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  debitAmount: number;
  creditAmount: number;
  netAmount: number;
  balanceType: BalanceSide;
  status: OpeningBalanceStatus;
  source: OpeningBalanceType;
  branchName: string;
  isActive: boolean;
  fiscalPeriodId: string;
  branchId: string;
  createdAt: string;
  createdByName?: string | null;
  productSku?: string | null;
  productName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  warehouseName?: string | null;
  partyId?: string | null;
  partyName?: string | null;
  partyType?: string | null;
}

// ملاحظة: الباك ايند يُغلِّف items فعلياً كـ {$id, $values:[...]} بسبب
// ReferenceHandler.Preserve في .NET — يُفكَّك هذا في opening-balance.service.ts قبل وصول
// البيانات هنا، فهذا الشكل هو الشكل النظيف بعد المعالجة فقط.
export interface OpeningBalanceListResponse {
  items: OpeningBalanceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
