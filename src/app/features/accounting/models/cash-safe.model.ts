// POST /api/CashSafes — إعادة هيكلة بطلب المستخدم 2026-08-15: الخزائن النقدية أصبحت
// مرتبطة بالفرع (Branch) لا المخزن (Warehouse). linkedWarehouseIds اختياري — فاضي/غير
// محدَّد يعني خزينة عامة لكل مخازن الفرع، وإلا فهي مخصَّصة فقط لمخازن بعينها من نفس الفرع.
// type (محافظ إلكترونية) أُزيل من هنا — أصبح على BankAccount فقط (انظر bank-account.model.ts)،
// CashSafe أصبحت نقدي فقط دائماً. الباك ايند يُنشئ تلقائياً حساباً فرعياً في دليل الحسابات
// تحت الأب 1100 (الصندوق) عند إنشاء خزينة جديدة (مثال: 110001)، ويُرجعه في accountCode.
export interface CreateCashSafeDto {
  name: string;
  nameAr: string;
  code: string;
  branchId: string;
  linkedWarehouseIds?: string[];
}

// GET /api/CashSafes/branch/{branchId} — كان .../warehouse/{warehouseId} (تغيير 2026-08-15،
// غير مؤكَّد حياً بعد). linkedWarehouseIds غير مضمَّن هنا حتماً (شكل الاستجابة الفعلي عند
// القراءة غير مؤكَّد) — إن غاب، يُعامَل كخزينة عامة لكل مخازن الفرع افتراضياً عند العرض.
export interface CashSafe {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  branchId: string;
  linkedWarehouseIds?: string[];
  isActive: boolean;
}

// شكل محلي فقط للجدول الموحَّد في صفحة الإدارة — يضيف اسم الفرع (غير موجود في CashSafe
// نفسها) بعد دمج نتائج كل فرع على حدة.
export interface CashSafeWithBranch extends CashSafe {
  branchName: string;
}

// GET /api/CashSafes/{id} — نفس حقول CashSafe على الأرجح مع حقول تدقيق إضافية محتملة
// (تاريخ الإنشاء/المنشئ) لم تُؤكَّد أسماؤها بعد من الباك ايند — تُقرأ دفاعياً بعدة أسماء
// محتملة عند العرض بدل افتراض اسم واحد.
export interface UpdateCashSafeDto {
  id: string;
  name: string;
  isActive: boolean;
}

export type CashSafeDetail = CashSafe & Record<string, unknown>;
