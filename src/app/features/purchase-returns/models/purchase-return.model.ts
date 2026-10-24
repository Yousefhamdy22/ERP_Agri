import { InvoiceLineInput, PurchaseInvoiceLineItem } from '../../invoices/models/invoice.model';

export type PurchaseReturnStatus = 'Draft' | 'Pending' | 'Confirmed' | 'Approved' | string;

export const PURCHASE_RETURN_STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Pending: 'قيد الانتظار',
  Confirmed: 'مؤكد',
  Approved: 'معتمد',
};

export const PURCHASE_RETURN_STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-gray-200 text-gray-800',
  Pending: 'bg-orange-200 text-orange-800',
  Confirmed: 'bg-green-200 text-green-800',
  Approved: 'bg-blue-200 text-blue-800',
};

// أسباب المرتجع نص حر على الـ API (returnReason: string في CreatePurchaseReturnDto)
// وليست enum حقيقي — هذه القائمة تُعرض كاقتراحات في القائمة المنسدلة فقط.
export const RETURN_REASONS: string[] = [
  'معيب/تالف',
  'غير مطابق للعينة',
  'كميات زائدة',
  'أسعار خاطئة',
  'تلف أثناء النقل',
];

// POST /api/PurchaseReturns/create
export interface CreatePurchaseReturnDto {
  originalInvoiceId?: string | null;
  partyId?: string | null;
  warehouseId?: string | null;
  fiscalPeriodId: string;
  returnDate: string;
  returnReason: string;
  createdByUserId: string;
  branchId?: string | null;
  lines: InvoiceLineInput[];
}

// Response from POST /api/PurchaseReturns/create و GET /api/PurchaseReturns/{returnId}
export interface PurchaseReturnDetailsDto {
  returnId: string;
  returnEntryNumber: string;
  returnDate: string;
  returnAmount: number;
  returnStatus: PurchaseReturnStatus;
  returnReason: string;
  originalId: string;
  originalEntryNumber: string;
  originalDate: string;
  originalAmount: number;
  originalStatus: string;
  returnPercentage: number;
  remainingAmount: number;
  lines: PurchaseInvoiceLineItem[];
}

// Row shape from GET /api/PurchaseReturns/all. ملاحظة: الحقول تطابق شكل قائمة فواتير
// التوريد (invoiceNumber/grandTotal/amountOutstanding بعد خصم هذا المرتجع...) وليس
// حقول المرتجع نفسه (لا returnAmount/returnReason هنا) — "id" هنا يُفترض أنه معرّف
// المرتجع (بما أن المسار /PurchaseReturns/{id} يطابقه في getDetail)، لكن هذا غير مؤكد
// حياً بعد؛ يحتاج تحقق إن رجع خطأ 404 عند فتح التفاصيل من هذه القائمة.
export interface PurchaseReturnListItem {
  id: string;
  returnId?: string;
  invoiceNumber: string;
  returnEntryNumber?: string;
  status: string;
  returnStatus?: string;
  paymentStatus?: string;
  supplierName: string;
  partyName?: string;
  invoiceDate: string;
  returnDate?: string;
  dueDate?: string;
  grandTotal: number;
  returnAmount?: number;
  amountOutstanding: number;
  remainingAmount?: number;
  amountPaid: number;
  originalEntryNumber?: string;
}

export interface PurchaseReturnListResponse {
  count: number;
  data: PurchaseReturnListItem[];
}
