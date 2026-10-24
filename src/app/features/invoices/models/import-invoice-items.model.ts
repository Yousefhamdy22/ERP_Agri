// لا يوجد endpoint خلفي لاستيراد أصناف الفاتورة (POST /invoices/import-items في المواصفة
// الأصلية غير مؤكَّد ومن المرجّح أنه غير موجود، بنفس نمط باقي نقاط الاستيراد). بما أن هذه
// الميزة لا تُنشئ شيئاً في قاعدة البيانات مباشرة — فقط تملأ سطور الفاتورة الحالية قبل
// حفظها عبر الـ endpoints المؤكَّدة أصلاً — يتم تحليل الملف بالكامل في المتصفح، بمطابقة
// SKU مقابل قائمة الأصناف المُحمَّلة أصلاً (GET /Products/all، endpoint مؤكَّد). القالب
// والملف المرفوع كلاهما CSV فقط (لا توجد مكتبة تحليل xlsx في المشروع).
export interface ImportedInvoiceItemRow {
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  productId: string | null;
  productLabel: string;
  duplicate: boolean;
  error: string | null;
}
