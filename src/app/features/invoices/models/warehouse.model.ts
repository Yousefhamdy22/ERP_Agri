// Matches the raw shape returned by GET /api/Warehouses — the id field is
// "warehouseId", not "id" (confirmed live 2026-07-03).
export interface Warehouse {
  warehouseId: string;
  name?: string | null;
  nameAr?: string | null;
  location?: string | null;
  allowNegativeStock?: boolean;
  isActive?: boolean;
}

// GET /api/Warehouses/{id} — يضيف حقول لا تظهر في القائمة (تأكيد حي 2026-07-11).
export interface WarehouseDetail extends Warehouse {
  totalProducts?: number;
  totalStockValue?: number;
}

// POST /api/Warehouses — branchId إلزامي (تأكيد حي 2026-07-12)، لم يكن موجوداً في
// المواصفة الأصلية. inventoryAccountId مُضاف بطلب المستخدم 2026-08-15 (حساب المخزون في
// دليل الحسابات لهذا المخزن، اختياري — عند عدم تحديده يُستخدَم الحساب الافتراضي 1600).
export interface CreateWarehouseDto {
  name?: string | null;
  nameAr?: string | null;
  location?: string | null;
  managerUserId?: string | null;
  branchId: string;
  allowNegativeStock?: boolean;
  inventoryAccountId?: string | null;
}
