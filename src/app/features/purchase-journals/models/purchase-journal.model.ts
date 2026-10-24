export type PurchaseJournalType = 'Cash' | 'Credit' | 'Check' | 'Return' | 'Advance';
export type PurchaseJournalStatus = 'Draft' | 'Posted' | 'Voided';

export const PURCHASE_JOURNAL_TYPE_LABELS: Record<PurchaseJournalType, string> = {
  Cash: 'نقدي',
  Credit: 'آجل',
  Check: 'شيك',
  Return: 'مردودات',
  Advance: 'سلفة',
};

export const PURCHASE_JOURNAL_TYPE_BADGE: Record<PurchaseJournalType, string> = {
  Cash: 'bg-green-200 text-green-800',
  Credit: 'bg-blue-200 text-blue-800',
  Check: 'bg-orange-200 text-orange-800',
  Return: 'bg-red-200 text-red-800',
  Advance: 'bg-purple-200 text-purple-800',
};

export const PURCHASE_JOURNAL_STATUS_LABELS: Record<PurchaseJournalStatus, string> = {
  Draft: 'مسودة',
  Posted: 'مرحّل',
  Voided: 'ملغى',
};

export const PURCHASE_JOURNAL_STATUS_BADGE: Record<PurchaseJournalStatus, string> = {
  Draft: 'bg-orange-200 text-orange-800',
  Posted: 'bg-green-200 text-green-800',
  Voided: 'bg-red-200 text-red-800',
};

// شكل عام يغطّي أنواع الدفاتر الخمسة — الحقول الخاصة بنوع بعينه (رقم الشيك، السلفة
// المتبقية...) غير متوفرة هنا؛ نقاط GET المخصّصة لكل نوع (cash/returns/advances/payments)
// ترجع DTOs أدق لكل نوع، لكنها خارج نطاق هذه الجولة (لا يوجد مستهلك واجهة لها بعد).
export interface PurchaseJournalDto {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  amount: number;
  status: PurchaseJournalStatus;
  fiscalPeriodId: string;
  journalEntryId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  type: PurchaseJournalType;
  createdAt: string;
  createdBy?: string | null;
  postedAt?: string | null;
  postedBy?: string | null;
}

// POST /api/PurchaseJournals/confirm-cash-purchase
export interface ConfirmCashPurchaseDto {
  invoiceId: string;
  cashAccountCode: string;
  userId: string;
}

// POST /api/PurchaseJournals/confirm-credit-purchase
export interface ConfirmCreditPurchaseDto {
  invoiceId: string;
  userId: string;
}

// POST /api/PurchaseJournals/confirm-check-purchase
export interface ConfirmCheckPurchaseDto {
  invoiceId: string;
  cashAccountCode: string;
  userId: string;
}
