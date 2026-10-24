// كل نقاط /api/ReceivePayment مؤكَّدة حياً عبر Swagger 2026-07-23 (الطلبات فقط — الاستجابات
// تعود بـ "200 OK" بدون schema موصَّف، فشكل الرد أدناه افتراضي حتى أول استدعاء فعلي).
export const RECEIPT_PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'Cash', label: 'نقدي' },
  { value: 'Bank', label: 'تحويل بنكي' },
  { value: 'Check', label: 'شيك' },
];

// POST /api/ReceivePayment/receive — invoiceId اختياري (nullable في الـ Swagger schema):
// استلام واحد يُسدِّد فاتورة واحدة كحد أقصى أو يُسجَّل على الحساب بدون ربط (invoiceId: null).
// لا يوجد حقل allocations[] هنا خلافاً لـ CreatePaymentCommand — توزيع مبلغ واحد على عدة
// فواتير غير مدعوم بنداء واحد، فيُنفَّذ في الواجهة بعدة نداءات متتالية (واحد لكل فاتورة).
export interface ReceivePaymentCommand {
  branchId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  paymentAccountCode: string;
  paymentDate: string;
  referenceNo?: string | null;
  invoiceId?: string | null;
  notes?: string | null;
  fiscalPeriodId: string;
  userId: string;
}

// GET /api/ReceivePayment/unpaid/{customerId} — شكل غير مؤكَّد حياً بعد.
export interface UnpaidInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountOutstanding: number;
}

// Row shape from GET /api/ReceivePayment/receipts (page/pageSize/search) — غير مؤكَّد حياً بعد.
export interface ReceiptListItem {
  id: string;
  receiptNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  invoiceNumber?: string | null;
  referenceNo?: string | null;
}

export interface ReceiptListResponse {
  items: ReceiptListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// GET /api/ReceivePayment/receipts/{id} — شكل غير مؤكَّد حياً بعد.
export interface ReceiptDetail extends ReceiptListItem {
  branchId: string;
  customerId: string;
  paymentAccountCode: string;
  invoiceId?: string | null;
  fiscalPeriodId: string;
  notes?: string | null;
  journalEntryId?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}
