import { AccountType, NormalBalance } from './accounting-enums.model';

// GET /api/Accountings/load — قائمة مسطَّحة خفيفة (id/accountCode/name/nameAr فقط) تستخدمها
// قوائم اختيار الحساب العامة (رصيد افتتاحي، سندات) — أسرع من الشجرة الكاملة.
export interface Account {
  id: string;
  accountCode: string;
  name: string;
  nameAr: string;
}

// GET /api/Accountings/chart-of-accounts — الشجرة الكاملة لدليل الحسابات، مؤكَّدة حياً
// 2026-07-19. children قد تكون مصفوفة فارغة لا null (حتى للحسابات الفرعية/الأوراق).
export interface AccountNode {
  id: string;
  accountCode: string;
  name: string;
  nameAr: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isLeaf: boolean;
  isActive: boolean;
  isSystem: boolean;
  allowPosting: boolean;
  debitBalance?: number;
  creditBalance?: number;
  netBalance?: number;
  children: AccountNode[];
}

// POST /api/Accountings — مؤكَّد حياً عبر Swagger 2026-07-19. type/normalBalance تُرسَل
// كنص (اسم القيمة) وليس رقماً — نفس درس CreateManualOpeningBalanceDto (JsonStringEnumConverter).
export interface CreateAccountDto {
  accountCode: string;
  name: string;
  nameAr: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentAccountId?: string | null;
  isSystem: boolean;
}

// نسخة مسطَّحة (بمستوى العمق) من الشجرة — لقوائم الاختيار الهرمية (app-tree-select).
export interface FlatAccountNode {
  id: string;
  accountCode: string;
  name: string;
  nameAr: string;
  level: number;
}

// شكل موحَّد لنقاط GetById/code/{code}/type/{type}/{id}/children/leaf — غير مؤكَّد حياً بعد
// (خلافاً لـ Account/AccountNode أعلاه المؤكَّدين فعلياً عبر Swagger/استجابات حقيقية) — يحتاج
// تحقق أول استخدام فعلي. يفترض نفس حقول AccountNode بدون children، مع parentAccountId/level
// إضافيين (موجودان في الكيان لكن لا يظهران في استجابة الشجرة نفسها).
export interface AccountDetail {
  id: string;
  accountCode: string;
  name: string;
  nameAr: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isLeaf: boolean;
  isActive: boolean;
  isSystem: boolean;
  parentAccountId?: string | null;
  level: number;
}

// POST /api/Accountings/{id}/move body — غير مؤكَّد حياً بعد.
export interface MoveAccountRequest {
  newParentId: string;
}

// POST /api/Accountings/seed response — غير مؤكَّد حياً بعد.
export interface SeedAccountsResult {
  count: number;
  message: string;
}
