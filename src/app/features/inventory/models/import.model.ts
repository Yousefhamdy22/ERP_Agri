// POST /Products/excel-import — الشكل مؤكَّد حياً من Swagger schema (تحديث 2026-07-14):
// File (binary) + BranchId (uuid) + OverwriteExisting + CreateIfNotExist +
// DefaultMarkupPercentage + CreateSalePriceAutomatically. BranchId إلزامي. CreateIfNotExist
// حقل جديد مضاف حديثاً — يتحكم في إنشاء العناصر المرجعية (المجموعة/الوحدة/المورّد) تلقائياً
// إن لم تكن موجودة بالاسم المطابق في الملف، بدل تجاهل/فشل الصف كاملاً.
export interface ImportProductsRequest {
  file: File;
  branchId: string;
  overwriteExisting: boolean;
  createIfNotExist: boolean;
  defaultMarkupPercentage: number;
  createSalePriceAutomatically: boolean;
}

export interface ImportProductError {
  sku: string;
  name?: string;
  error: string;
}

export interface ImportProductsResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  prices: number;
  errors: ImportProductError[];
}
