import { ApiResult } from '../../../shared/models/api-result.model';

// حسابات الدفع الشائعة المستخدمة عند تأكيد فاتورة مبيعات (PaymentAccountCode) —
// الباك ايند يرفض القيمة الفارغة (400: "The PaymentAccountCode field is required"),
// فتُعرض كقائمة اختيار بدل حقل نصي حر لمنع إدخال كود غير معروف.
export interface PaymentAccountOption {
  code: string;
  label: string;
}

// أكواد فعلية من جدول Accounts في قاعدة البيانات (تأكيد حي عبر لقطة شاشة فعلية 2026-07-18) —
// القيم السابقة (1010/1020) كانت خاطئة تماماً ولا وجود لها في الجدول الحقيقي. القيم
// الصحيحة: النقدي = 110002 (Main Branch Safe)، البنك = 111001 (البنك الأهلي).
export const PAYMENT_ACCOUNTS: PaymentAccountOption[] = [
  { code: '110002', label: 'نقدي - الخزينة الرئيسية (110002)' },
  { code: '111001', label: 'بنك - البنك الأهلي (111001)' },
  { code: '1200', label: 'آجل - عملاء مدينون (1200)' },
];

export interface InvoiceLineInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  description?: string | null;
}

// POST /api/Invoices/purchase/draft — matches SavePurchaseInvoiceDraftCommand.
// dueDate فعلياً مطلوب رغم أنه بدا اختيارياً — تركه فارغاً يُسقط الباك ايند بـ 500 غير
// معالَج بدل رسالة تحقق واضحة (مؤكَّد حياً 2026-07-19).
// branchId إلزامي الآن عند حفظ المسودة نفسها (بطلب المستخدم)، وليس فقط عند التأكيد.
export interface SavePurchaseInvoiceDraftDto {
  supplierId: string;
  warehouseId: string;
  branchId: string;
  invoiceDate: string;
  dueDate: string;
  currency?: string | null;
  exchangeRate: number;
  paperReference?: string | null;
  invoiceDiscountValue: number;
  invoiceDiscountIsPercent: boolean;
  vatRatePct: number;
  commercialTaxRatePct: number;
  notes?: string | null;
  lines?: InvoiceLineInput[] | null;
  userId: string;
  existingDraftId?: string | null;
}

// نوع سداد فاتورة التوريد عند التأكيد — القيمة الوحيدة المؤكَّدة حياً حتى الآن "Credit"
// (تأكيد Swagger 2026-07-19)؛ "Cash" تخمين منطقي غير مؤكَّد بعد.
export type PurchasePaymentType = 'Cash' | 'Credit';
export const PURCHASE_PAYMENT_TYPE_LABELS: Record<PurchasePaymentType, string> = {
  Cash: 'نقدي',
  Credit: 'آجل',
};

// POST /api/Invoices/purchase/confirm — مطابق حرفياً لِـ Swagger مؤكَّد حياً 2026-07-19 —
// توسَّع كثيراً عن الشكل السابق (invoiceId/userId فقط): أضيف fiscalPeriodId/branchId/
// paymentType/paymentAccountCode.
export interface ConfirmPurchaseInvoiceDto {
  invoiceId: string;
  fiscalPeriodId: string;
  branchId: string;
  paymentType: PurchasePaymentType;
  paymentAccountCode: string;
  userId: string;
}

// POST /api/Invoices/sales/draft — matches SaveSalesInvoiceDraftCommand. branchId مؤكَّد حياً
// 2026-07-31 (اختبار مباشر بجسم غير مُغلَّف نجح 200 مع هذا الحقل) — التنبيه السابق هنا (كان
// السجل المُشارَك سابقاً لا يملك BranchId) لم يعد صحيحاً؛ الباك ايند يقبله فعلياً الآن.
export interface SaveSalesInvoiceDraftDto {
  customerId: string;
  warehouseId: string;
  branchId: string;
  invoiceDate: string;
  dueDate: string;
  currency?: string | null;
  paymentAccountCode?: string | null;
  invoiceDiscountValue: number;
  invoiceDiscountIsPercent: boolean;
  vatRatePct: number;
  commercialTaxRatePct: number;
  paperReference?: string | null;
  notes?: string | null;
  lines?: InvoiceLineInput[] | null;
  userId: string;
  existingDraftId?: string | null;
}

// POST /api/Invoices/sales/confirm — matches ConfirmSalesInvoiceCommand
// branchId أُضيف لاحقاً (نفس نمط ConfirmPurchaseInvoiceDto) — الباك ايند يحتاج معرفة الفرع
// وقت التأكيد لتسجيل الحركة عليه.
export interface ConfirmSalesInvoiceDto {
  invoiceId: string;
  branchId: string;
  paymentAccountCode?: string | null;
  userId: string;
}

// Response shape for draft/confirm inferred from this backend's other Result-wrapped
// endpoints (see supplier create). The key holding the created invoice's id isn't
// documented in swagger — accept the common possibilities until confirmed live.
export interface InvoiceDraftResult extends ApiResult {
  value?: string;
  invoiceId?: string;
  id?: string;
}

// مشترك بين فواتير التوريد والمبيعات — نفس القيم في كلا الطرفين.
export type InvoiceStatus = 'Draft' | 'Confirmed' | 'PartiallyPaid' | 'Paid' | 'Cancelled';
export type InvoicePaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

// Row shape from GET /api/Invoices/purchase (paginated+filtered manage-page list).
export interface PurchaseInvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  amountOutstanding: number;
}

// Envelope for GET /api/Invoices/purchase — note: no hasNextPage/hasPreviousPage like
// the shared PagedResult<T>, so those are derived client-side from page/totalPages.
export interface PurchaseInvoiceListResponse {
  items: PurchaseInvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PurchaseInvoiceLineItem {
  lineId: string;
  productId?: string;
  warehouseId?: string;
  lineNumber: number;
  productName: string;
  productSku: string;
  warehouseName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  lineTotal: number;
  unitLandedCost: number;
  description?: string | null;
}

// GET /api/Invoices/purchase/{invoiceId}
export interface PurchaseInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  partyName: string;
  warehouseName: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  totalLineDiscounts: number;
  invoiceDiscountAmount: number;
  vatRatePct: number;
  vatAmount: number;
  commercialTaxRatePct: number;
  commercialTaxAmount: number;
  totalLandedCost: number;
  grandTotal: number;
  amountPaid: number;
  amountOutstanding: number;
  lines: PurchaseInvoiceLineItem[];
  notes?: string | null;
  createdAt: string;
}

// Response shape for the purchase confirm/cancel/delete action endpoints.
export interface InvoiceActionResult {
  message: string;
  data: { invoiceNumber: string };
}

// مشترك بين فواتير التوريد والمبيعات (نفس القيم والألوان في الطرفين).
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Confirmed: 'مؤكدة',
  PartiallyPaid: 'مدفوعة جزئياً',
  Paid: 'مدفوعة بالكامل',
  Cancelled: 'ملغاة',
};

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-gray-200 text-gray-800',
  Confirmed: 'bg-blue-200 text-blue-800',
  PartiallyPaid: 'bg-yellow-200 text-yellow-800',
  Paid: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-200 text-red-800',
};

export const INVOICE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  Unpaid: 'غير مدفوعة',
  Partial: 'مدفوعة جزئياً',
  Paid: 'مدفوعة بالكامل',
};

export const INVOICE_PAYMENT_STATUS_BADGE: Record<string, string> = {
  Unpaid: 'bg-red-200 text-red-800',
  Partial: 'bg-yellow-200 text-yellow-800',
  Paid: 'bg-green-200 text-green-800',
};

// Row shape from GET /api/Invoices/sales (paginated+filtered manage-page list).
export interface SalesInvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  amountPaid: number;
  amountOutstanding: number;
}

// Envelope for GET /api/Invoices/sales — same shape as the purchase list envelope
// (no hasNextPage/hasPreviousPage; derived client-side from page/totalPages).
export interface SalesInvoiceListResponse {
  items: SalesInvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SalesInvoiceLineItem {
  lineId: string;
  productId?: string;
  warehouseId?: string;
  lineNumber: number;
  productName: string;
  productSku: string;
  warehouseName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  lineTotal: number;
  unitLandedCost: number;
  description?: string | null;
}

// GET /api/Invoices/sales/{invoiceId} — read-only display shape. Note: unlike the
// create DTO, this does NOT expose customerId/warehouseId/productId — only display
// names — so it cannot be used to fully rehydrate an editable draft form.
export interface SalesInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  customerName: string;
  warehouseName: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  totalLineDiscounts: number;
  invoiceDiscountAmount: number;
  vatRatePct: number;
  vatAmount: number;
  commercialTaxRatePct: number;
  commercialTaxAmount: number;
  totalLandedCost: number;
  grandTotal: number;
  amountPaid: number;
  amountOutstanding: number;
  lines: SalesInvoiceLineItem[];
  notes?: string | null;
  createdAt: string;
}

// POST /api/Invoices/sales/draft response — مؤكَّد حياً 2026-07-31: الجسم نص GUID خام مباشرة
// (مثال: "4d8a68ab-5906-43b6-8bf6-1ad83e21405d")، وليس كائناً يحوي الحقل. الأشكال الأخرى هنا
// أُبقيت كاحتياط دفاعي فقط تحسّباً لاختلاف الاستجابة بين نُسخ/بيئات الباك ايند — انظر معالجة
// النتيجة في sales-invoice-add-page.component.ts (typeof result === 'string' أولاً).
export type SalesInvoiceDraftResult = string | {
  invoiceId?: string;
  id?: string;
  data?: { invoiceId?: string; id?: string };
  value?: string;
};

// POST /api/Invoices/sales/confirm response — مؤكَّد حياً 2026-08-01: نص خام (رقم الفاتورة،
// مثال "SAL-2026-06609")، وليس كائناً — انظر SalesInvoiceService.confirm() الذي يقرأه
// كـ responseType:'text' مباشرة بدل هذا الشكل (أُبقي التعليق هنا فقط لتوثيق التاريخ).
