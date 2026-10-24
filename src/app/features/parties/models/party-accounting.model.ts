// GET /api/Parties/{partyId}/accounting — مؤكَّد حياً 2026-08-01. يعمل لكل من العميل والمورد
// بنفس المسار (partyType يُحدَّد داخل الاستجابة نفسها، لا في الرابط أو معامل منفصل).

export interface PartyAccountingAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

// مطابق حرفياً لِـ:
// public sealed record TransactionDto(Guid JournalLineId, DateTimeOffset? TransactionDate,
//   string TransactionType, string Description, decimal Debit, decimal Credit, decimal Balance);
export interface PartyTransaction {
  journalLineId: string;
  transactionDate: string | null;
  transactionType: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyAccountingSummary {
  partyId: string;
  partyName: string;
  partyType: string;
  currentBalance: number;
  account: PartyAccountingAccount | null;
  recentTransactions: PartyTransaction[];
}

// GET /api/Parties/{partyId}/statement?fromDate=&toDate= — مؤكَّد حياً 2026-08-02. مستقل تماماً
// عن /accounting أعلاه (شكل مختلف، ومصدر بيانات مختلف — لاحظ أن currentBalance في /accounting
// قد لا يطابق closingBalance هنا لنفس الطرف؛ لا يُحاوَل التوفيق بينهما، تُعرضان كقسمين منفصلين
// بوضوح في الواجهة). يدعم fromDate/toDate اختياريَّين لتضييق الفترة الزمنية.
export interface PartyStatementLine {
  date: string;
  documentNumber: string;
  documentType: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface PartyStatementSummary {
  partyId: string;
  partyName: string;
  partyNameAr: string;
  partyType: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: PartyStatementLine[];
}
