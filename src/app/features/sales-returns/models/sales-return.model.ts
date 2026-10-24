import { InvoiceLineInput, SalesInvoiceLineItem } from '../../invoices/models/invoice.model';

export type SalesReturnStatus = 'Draft' | 'Confirmed' | 'Approved' | 'Pending';

export const SALES_RETURN_STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Pending: 'قيد الانتظار',
  Confirmed: 'مؤكد',
  Approved: 'معتمد',
};

export const SALES_RETURN_STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-gray-200 text-gray-800',
  Pending: 'bg-orange-200 text-orange-800',
  Confirmed: 'bg-green-200 text-green-800',
  Approved: 'bg-blue-200 text-blue-800',
};

export const SALES_RETURN_REASONS: string[] = [
  'بضاعة تالفة',
  'بضاعة خاطئة',
  'زيادة في الكمية',
  'عيب مصنعي',
  'أسعار خاطئة',
  'أخرى',
];

export interface CreateSalesReturnDto {
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

export interface SalesReturnDetailsDto {
  returnId: string;
  returnEntryNumber: string;
  returnDate: string;
  returnAmount: number;
  returnStatus: string;
  returnReason: string;
  originalId: string;
  originalEntryNumber: string;
  originalDate: string;
  originalAmount: number;
  originalStatus: string;
  returnPercentage: number;
  remainingAmount: number;
  lines: SalesInvoiceLineItem[];
}

export interface SalesReturnListItem {
  returnId?: string;
  returnEntryNumber?: string;
  returnDate?: string;
  returnAmount?: number;
  returnStatus?: string;
  originalId?: string;
  originalEntryNumber?: string;
  originalDate?: string;
  originalAmount?: number;
  originalStatus?: string;
  returnPercentage?: number;
  remainingAmount?: number;
  id?: string;
  invoiceNumber?: string;
  customerName?: string;
  status?: string;
  paymentStatus?: string;
  invoiceDate?: string;
  dueDate?: string;
  grandTotal?: number;
  amountOutstanding?: number;
  amountPaid?: number;
}

export interface SalesReturnListResponse {
  count: number;
  data: SalesReturnListItem[];
}
