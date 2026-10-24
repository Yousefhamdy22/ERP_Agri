// نسخة طبق الأصل عن Enums الباك ايند المحاسبية الحقيقية (نص C# لصقه المستخدم حرفياً 2026-07-18).
// القيم الرقمية هنا للتوثيق فقط — التخاطب الفعلي مع الـ API يستخدم اسم القيمة كنص، ليس الرقم
// (JsonStringEnumConverter مُفعَّل على الباك ايند، مؤكَّد حياً من استجابات GET حقيقية: status/
// source/balanceType كلها تصل كنصوص مثل "Draft"/"Manual"/"Credit"، لا كأرقام). لذا أي DTO
// يرسل قيمة enum للباك ايند يجب أن يرسل الاسم النصي (مثل 'Debit') وليس رقماً مُخمَّناً — خطأ
// كهذا بالضبط (BALANCE_SIDE_ORDINAL في opening-balance.model.ts كان يرسل Debit=0/Credit=1
// بدل القيم الحقيقية Debit=1/Credit=2) كان يُسجِّل كل رصيد "دائن" كـ"مدين" بصمت. أُصلح 2026-07-18
// بإرسال الاسم النصي مباشرة بدل رقم مُصنَّع.

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'CostOfGoodsSold' | 'Contra';
export const ACCOUNT_TYPE_VALUES: Record<AccountType, number> = {
  Asset: 1, Liability: 2, Equity: 3, Revenue: 4, Expense: 5, CostOfGoodsSold: 6, Contra: 7,
};
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  Asset: 'أصل', Liability: 'التزام', Equity: 'حقوق ملكية', Revenue: 'إيراد', Expense: 'مصروف',
  CostOfGoodsSold: 'تكلفة البضاعة المباعة', Contra: 'حساب مقابل',
};

// NormalBalance و LineSide في الباك ايند enum-ان منفصلان لكن بنفس القيم/المعنى تماماً
// (Debit=1/Credit=2) — ونفس القيم أيضاً BalanceSide المعرَّف محلياً في
// opening-balance.model.ts (تعريف مستقل مطابق حرفياً، ليس استيراداً، لتفادي اعتماد هذا
// الملف المشترك (shared) على ملف تابع لميزة (feature) محدَّدة).
export type NormalBalance = 'Debit' | 'Credit';
export const NORMAL_BALANCE_VALUES: Record<NormalBalance, number> = { Debit: 1, Credit: 2 };
export const NORMAL_BALANCE_LABELS: Record<NormalBalance, string> = { Debit: 'مدين', Credit: 'دائن' };
export const LINE_SIDE_VALUES = { Debit: 1, Credit: 2 } as const;

export type EntryType =
  | 'Invoice' | 'Payment' | 'Return' | 'Adjustment' | 'LandedCost' | 'Manual' | 'OpeningBalance'
  | 'ClosingEntry' | 'Depreciation' | 'Accrual' | 'Prepayment' | 'BankReconciliation' | 'GeneralJournal'
  | 'Transfer' | 'Discount' | 'AdvancePayment' | 'Receipt' | 'AdvanceReceipt' | 'PurchaseReturn'
  | 'Purchase' | 'SalesReturn' | 'SalesInvoice' | 'PurchaseInvoice';
export const ENTRY_TYPE_VALUES: Record<EntryType, number> = {
  Invoice: 1, Payment: 2, Return: 3, Adjustment: 4, LandedCost: 5, Manual: 6, OpeningBalance: 7,
  ClosingEntry: 8, Depreciation: 9, Accrual: 10, Prepayment: 11, BankReconciliation: 12,
  GeneralJournal: 13, Transfer: 14, Discount: 15, AdvancePayment: 16, Receipt: 17, AdvanceReceipt: 18,
  PurchaseReturn: 19, Purchase: 20, SalesReturn: 21, SalesInvoice: 22, PurchaseInvoice: 23,
};
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  Invoice: 'فاتورة', Payment: 'دفعة', Return: 'مرتجع', Adjustment: 'تعديل', LandedCost: 'تكلفة إضافية',
  Manual: 'قيد يدوي', OpeningBalance: 'رصيد افتتاحي', ClosingEntry: 'قيد إقفال', Depreciation: 'إهلاك',
  Accrual: 'استحقاق', Prepayment: 'دفعة مقدمة', BankReconciliation: 'تسوية بنكية',
  GeneralJournal: 'قيد يومية عامة', Transfer: 'تحويل بين الحسابات', Discount: 'خصم',
  AdvancePayment: 'دفعة مقدمة', Receipt: 'سند قبض', AdvanceReceipt: 'سند دفع مقدمة',
  PurchaseReturn: 'مرتجع مشتريات', Purchase: 'مشتريات', SalesReturn: 'مرتجع مبيعات',
  SalesInvoice: 'فاتورة مبيعات', PurchaseInvoice: 'فاتورة مشتريات',
};

export type EntryStatus = 'Draft' | 'Posted' | 'Reversed' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export const ENTRY_STATUS_VALUES: Record<EntryStatus, number> = {
  Draft: 1, Posted: 2, Reversed: 3, Pending: 4, Approved: 5, Rejected: 6, Cancelled: 7,
};
export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  Draft: 'مسودة', Posted: 'مرحلة', Reversed: 'ملغاة', Pending: 'معلق', Approved: 'معتمد',
  Rejected: 'مرفوض', Cancelled: 'ملغاة',
};

export type AccountCategory =
  | 'CurrentAsset' | 'FixedAsset' | 'IntangibleAsset'
  | 'CurrentLiability' | 'LongTermLiability'
  | 'Capital' | 'RetainedEarnings'
  | 'OperatingRevenue' | 'NonOperatingRevenue'
  | 'OperatingExpense' | 'NonOperatingExpense' | 'COGS';
export const ACCOUNT_CATEGORY_VALUES: Record<AccountCategory, number> = {
  CurrentAsset: 100, FixedAsset: 200, IntangibleAsset: 300,
  CurrentLiability: 400, LongTermLiability: 500,
  Capital: 600, RetainedEarnings: 700,
  OperatingRevenue: 800, NonOperatingRevenue: 900,
  OperatingExpense: 1000, NonOperatingExpense: 1100, COGS: 1200,
};
export const ACCOUNT_CATEGORY_LABELS: Record<AccountCategory, string> = {
  CurrentAsset: 'أصل متداول', FixedAsset: 'أصل ثابت', IntangibleAsset: 'أصل غير ملموس',
  CurrentLiability: 'التزام متداول', LongTermLiability: 'التزام طويل الأجل',
  Capital: 'رأس المال', RetainedEarnings: 'أرباح محتجزة',
  OperatingRevenue: 'إيراد تشغيلي', NonOperatingRevenue: 'إيراد غير تشغيلي',
  OperatingExpense: 'مصروف تشغيلي', NonOperatingExpense: 'مصروف غير تشغيلي', COGS: 'تكلفة البضاعة المباعة',
};

export type FiscalPeriodStatus = 'Open' | 'Closed' | 'Locked';
export const FISCAL_PERIOD_STATUS_VALUES: Record<FiscalPeriodStatus, number> = { Open: 1, Closed: 2, Locked: 3 };
export const FISCAL_PERIOD_STATUS_LABELS: Record<FiscalPeriodStatus, string> = {
  Open: 'مفتوحة', Closed: 'مغلقة', Locked: 'مقفلة (بعد تدقيق)',
};

// تحذير: هذا هو enum "OpeningBalanceSource" الحقيقي من الباك ايند (Manual/Transferred فقط —
// كيف نشأ الرصيد، وليس تصنيفه). لا تخلط بينه وبين OpeningBalanceType المحلي في
// opening-balance.model.ts (يدوي/بنك/مورد/عميل/مخزون) — ذاك تصنيف واجهة مستخدم تقريبي غير
// مطابق لأي enum حقيقي واحد، راجع OpeningBalanceCategory أدناه للتفاصيل.
export type OpeningBalanceSource = 'Manual' | 'Transferred';
export const OPENING_BALANCE_SOURCE_VALUES: Record<OpeningBalanceSource, number> = { Manual: 1, Transferred: 2 };
export const OPENING_BALANCE_SOURCE_LABELS: Record<OpeningBalanceSource, string> = {
  Manual: 'يدوي', Transferred: 'مُرحَّل من الفترة السابقة',
};
export const OPENING_BALANCE_SOURCE_ICONS: Record<OpeningBalanceSource, string> = {
  Manual: 'fa-solid fa-pen', Transferred: 'fa-solid fa-rotate',
};
export const OPENING_BALANCE_SOURCE_BADGE: Record<OpeningBalanceSource, string> = {
  Manual: 'bg-blue-100 text-blue-700', Transferred: 'bg-teal-100 text-teal-700',
};

// هذا هو enum "OpeningBalanceType" الحقيقي من الباك ايند — سُمِّي هنا OpeningBalanceCategory
// (وليس OpeningBalanceType) لتفادي تعارض الاسم مع OpeningBalanceType المحلي القديم في
// opening-balance.model.ts، وهما مفهومان مختلفان فعلياً: هذا تصنيف حساب حقيقي من الباك ايند
// (10 قيم)، بينما القديم مجرد تجميع واجهة مستخدم لأي من 5 نماذج إنشاء موجودة في هذا التطبيق
// (Manual/Bank/Supplier/Customer/Inventory) — لا يوجد تطابق مباشر بين الاثنين (مثال: "Manual"
// محلياً ليس له مقابل واضح هنا؛ "Bank" محلياً يقابل غالباً BankAccount هنا). لم يُدمَجا بعد —
// يحتاج قراراً بخصوص الميزة قبل إعادة هيكلة فلتر/نموذج الرصيد الافتتاحي على هذا الأساس.
export type OpeningBalanceCategory =
  | 'Supplier' | 'Customer' | 'Inventory' | 'FixedAsset' | 'BankAccount' | 'CashAccount'
  | 'Item' | 'General' | 'Normal' | 'Other';
export const OPENING_BALANCE_CATEGORY_VALUES: Record<OpeningBalanceCategory, number> = {
  Supplier: 1, Customer: 2, Inventory: 3, FixedAsset: 4, BankAccount: 5, CashAccount: 6,
  Item: 7, General: 8, Normal: 9, Other: 10,
};
export const OPENING_BALANCE_CATEGORY_LABELS: Record<OpeningBalanceCategory, string> = {
  Supplier: 'مورد', Customer: 'عميل', Inventory: 'مخزون', FixedAsset: 'أصل ثابت',
  BankAccount: 'حساب بنكي', CashAccount: 'حساب نقدي', Item: 'صنف', General: 'عام',
  Normal: 'عادي', Other: 'أخرى',
};
