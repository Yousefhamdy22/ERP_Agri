// كل نقاط /api/ManualJournal مؤكَّدة حياً عبر Swagger 2026-07-23 (الطلبات فقط — الاستجابات
// تعود بـ "200 OK" بدون schema موصَّف، فشكل الرد أدناه افتراضي حتى أول استدعاء فعلي).
export type ManualJournalStatus = 'Draft' | 'Posted' | 'Reversed';
export type ManualJournalLineSide = 'Debit' | 'Credit';

export const MANUAL_JOURNAL_STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  Posted: 'مرحّل',
  Reversed: 'معكوس',
};

export const MANUAL_JOURNAL_STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-gray-200 text-gray-800',
  Posted: 'bg-green-200 text-green-800',
  Reversed: 'bg-red-200 text-red-800',
};

export interface ManualJournalLineInputDto {
  accountId: string;
  side: ManualJournalLineSide;
  amount: number;
  description: string;
  partyId?: string | null;
}

// POST /api/ManualJournal/create
export interface CreateManualJournalCommand {
  entryDate: string;
  description: string;
  userId: string;
  fiscalPeriodId: string;
  branchId: string;
  currency: string;
  exchangeRate: number;
  lines: ManualJournalLineInputDto[];
}

// PUT /api/ManualJournal/update
export interface UpdateManualJournalCommand {
  journalEntryId: string;
  entryDate: string;
  description: string;
  currency: string;
  exchangeRate: number;
  lines: ManualJournalLineInputDto[];
}

// POST /api/ManualJournal/post
export interface PostManualJournalCommand {
  journalEntryId: string;
  userId: string;
}

export interface ManualJournalLineDto {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  side: ManualJournalLineSide;
  amount: number;
  description: string;
  partyId?: string | null;
  partyName?: string | null;
}

// GET /api/ManualJournal/{id} — شكل غير مؤكَّد حياً بعد (خلافاً لجداول الطلبات أعلاه).
export interface ManualJournalDetail {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  currency: string;
  exchangeRate: number;
  status: ManualJournalStatus;
  fiscalPeriodId: string;
  branchId: string;
  lines: ManualJournalLineDto[];
  createdBy?: string | null;
  createdAt?: string;
  postedBy?: string | null;
  postedAt?: string | null;
}

// Row shape from GET /api/ManualJournal (page/pageSize/search) — غير مؤكَّد حياً بعد.
export interface ManualJournalListItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: ManualJournalStatus;
  totalDebit: number;
  totalCredit: number;
}

export interface ManualJournalListResponse {
  items: ManualJournalListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
