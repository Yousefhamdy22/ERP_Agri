// WalletPayment/WalletReceipt مُضافان بطلب المستخدم 2026-08-15 (محافظ إلكترونية:
// InstaPay/VodafoneCash) — نوعان منفصلان يطابقان اسمَي endpoint الإنشاء الحقيقيين
// (create-wallet-payment/create-wallet-receipt)، رغم أن نموذج الإضافة يعرضهما كتبويب واحد
// "محفظة إلكترونية" مع مبدِّل اتجاه قبض/صرف داخلي (قرار تصميم واجهة، لا علاقة بالباك ايند).
export type VoucherType = 'CashReceipt' | 'CashPayment' | 'CheckReceipt' | 'BankTransfer' | 'WalletPayment' | 'WalletReceipt';
// تدفّق حالات جديد مؤكَّد من المستخدم 2026-08-09: New(1) → Approved(4) → Posted(2)، وأي حالة
// يمكن أن تنتقل إلى Cancelled(3). يستبدل التدفّق السابق (Pending→Approved→Posted، بلا اعتماد
// إلزامي قبل الترحيل) — الترحيل الآن يرفض أي سند ليس Approved برسالة "Voucher must be
// approved before posting". أُبقيت القيم القديمة (Pending/Void/Reconciled) في خرائط
// العرض أدناه فقط كشبكة أمان لعرض بيانات قديمة محتملة بلا كسر، لا في نوع الحالة نفسه.
export type VoucherStatus = 'New' | 'Approved' | 'Posted' | 'Cancelled';

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  CashReceipt: 'سند قبض نقدي',
  CashPayment: 'سند صرف نقدي',
  CheckReceipt: 'سند قبض شيك',
  BankTransfer: 'سند تحويل بنكي',
  WalletPayment: 'سند صرف محفظة إلكترونية',
  WalletReceipt: 'سند قبض محفظة إلكترونية',
};

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  New: 'جديد',
  Approved: 'معتمد',
  Posted: 'مرحّل',
  Cancelled: 'ملغى',
  // قيم قديمة — عرض احتياطي فقط (انظر تعليق VoucherStatus أعلاه).
  Pending: 'قيد الانتظار',
  Reconciled: 'مطابَق',
  Void: 'ملغى',
};

export const VOUCHER_STATUS_BADGE: Record<string, string> = {
  New: 'bg-gray-200 text-gray-700',
  Approved: 'bg-orange-200 text-orange-800',
  Posted: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-200 text-red-800',
  // قيم قديمة — عرض احتياطي فقط (انظر تعليق VoucherStatus أعلاه).
  Pending: 'bg-gray-200 text-gray-700',
  Reconciled: 'bg-purple-200 text-purple-800',
  Void: 'bg-red-200 text-red-800',
};

export const VOUCHER_TYPE_ICONS: Record<VoucherType, string> = {
  CashReceipt: 'fa-solid fa-money-bill-wave',
  CashPayment: 'fa-solid fa-money-bill-transfer',
  CheckReceipt: 'fa-solid fa-money-check-dollar',
  BankTransfer: 'fa-solid fa-building-columns',
  WalletPayment: 'fa-solid fa-wallet',
  WalletReceipt: 'fa-solid fa-wallet',
};

// SafeType الجديد على CashSafe (بطلب المستخدم 2026-08-15) — 1=نقدي (الافتراضي لأي خزينة
// أُنشئت قبل هذا الحقل ولا تحمل قيمة type أصلاً)، 2=InstaPay، 3=VodafoneCash.
export const WALLET_PROVIDERS: { type: 2 | 3; label: string }[] = [
  { type: 2, label: 'InstaPay' },
  { type: 3, label: 'VodafoneCash' },
];

export interface GlAccountOption {
  code: string;
  label: string;
}

// حسابات دفتر الأستاذ الشائعة المستخدمة في سندات القبض/الصرف (نفس فكرة PAYMENT_ACCOUNTS
// في invoice.model.ts) — تُعرض كقائمة اختيار بدل حقل نصي حر لمنع أكواد غير معروفة.
// أكواد فعلية من جدول Accounts في قاعدة البيانات (تأكيد حي عبر لقطة شاشة فعلية 2026-07-18) —
// القيم السابقة (1010/1020) كانت خاطئة تماماً ولا وجود لها في الجدول الحقيقي، وهذا ما كان
// يسبب 400 "Account NotFound" في create-cash-payment. القيم الصحيحة: النقدي = 110002 (Main Branch Safe)، البنك = 111001 (البنك الأهلي).
export const CASH_ACCOUNTS: GlAccountOption[] = [
  { code: '110002', label: 'نقدي - الخزينة الرئيسية (110002)' },
  { code: '111001', label: 'بنك - البنك الأهلي (111001)' },
];

export const CREDIT_CHARGE_ACCOUNTS: GlAccountOption[] = [
  { code: '1200', label: 'عملاء - مدينون (1200)' },
  { code: '2100', label: 'موردون - دائنون (2100)' },
];

// POST /PaymentVouchers/create-cash-receipt — branchId مطلوب فعلياً في الطلب (بطلب المستخدم)،
// نفس نمط باقي عمليات "الإضافة" في التطبيق (فواتير المبيعات/المشتريات، استلام دفعة، الرصيد
// الافتتاحي) التي تُرسل الفرع كحقل مطلوب في كل طلب إنشاء.
// cashSafeId مُضاف (خزائن نقدية مرتبطة بمخزن — /api/CashSafes) — cashAccountCode ما زال
// يُرسَل أيضاً (مُشتَقّاً من accountCode الخاص بالخزينة المختارة) حفاظاً على توافق الطلب مع
// الشكل المؤكَّد حياً سابقاً، بدل استبداله بالكامل بحقل غير مؤكَّد بعد على هذا الباك ايند تحديداً.
export interface CreateCashReceiptDto {
  payerId: string;
  receiptAmount: number;
  description: string;
  cashAccountCode: string;
  cashSafeId?: string | null;
  creditAccountCode: string;
  linkedInvoiceId?: string | null;
  branchId: string;
  userId: string;
}

// POST /PaymentVouchers/create-cash-payment — PaymentId مطلوب فعلياً (400 حي: "The
// PaymentId field is required") ويشير لدفعة حقيقية منشأة في وحدة المدفوعات (Payments)،
// وليس نصاً حراً كما افتُرض سابقاً (تأكيد حي 2026-07-14).
// ملاحظة مهمة: لا يوجد حقل LinkedInvoiceId في CreateCashPaymentVoucherCommand على
// الباك ايند إطلاقاً — إرساله كان يُسقط الطلب بالكامل (400 "Account ... NotFound" مضلِّل،
// تأكيد حي 2026-07-17: نفس الـ payload بدون هذا الحقل نجح). لذا حُذف من هذا الـ DTO.
export interface CreateCashPaymentDto {
  payeeId: string;
  paymentAmount: number;
  description: string;
  paymentId: string;
  cashAccountCode: string;
  cashSafeId?: string | null;
  chargeAccountCode: string;
  branchId: string;
  userId: string;
}

// POST /PaymentVouchers/create-check-receipt — bankAccountEntityId مُضاف بطلب المستخدم
// 2026-08-15 (حساب بنكي اختياري للشيكات، لم يكن مدعوماً سابقاً) — اختياري، عند عدم تحديده
// يُستخدَم cashAccountCode العادي كما كان.
export interface CreateCheckReceiptDto {
  payerId: string;
  receiptAmount: number;
  checkNumber: string;
  issuingBank: string;
  checkIssueDate: string;
  description: string;
  cashAccountCode: string;
  bankAccountEntityId?: string | null;
  creditAccountCode: string;
  linkedInvoiceId?: string | null;
  fiscalPeriodId: string;
  branchId: string;
  userId: string;
}

// POST /PaymentVouchers/create-bank-transfer — الحقل bankAccountEntityId (وليس bankAccountId
// كما كان مفترضاً سابقاً) بطلب المستخدم 2026-08-15، اختياري — عند عدم تحديده يُستخدَم
// cashAccountCode العادي.
export interface CreateBankTransferDto {
  payeeId: string;
  paymentAmount: number;
  transferReference: string;
  bankName: string;
  transferDate: string;
  description: string;
  cashAccountCode: string;
  bankAccountEntityId?: string | null;
  chargeAccountCode: string;
  linkedInvoiceId?: string | null;
  fiscalPeriodId: string;
  branchId: string;
  userId: string;
}

// POST /PaymentVouchers/create-wallet-payment — محافظ إلكترونية (InstaPay/VodafoneCash)،
// بطلب المستخدم 2026-08-15. bankAccountEntityId هنا إلزامي (خلافاً لبقية الأنواع حيث هو اختياري) —
// هو الحقل الوحيد الذي يحدِّد أي محفظة تحديداً، لا يوجد cashAccountCode بديل لهذا النوع.
export interface CreateWalletPaymentDto {
  payeeId: string;
  paymentAmount: number;
  description: string;
  bankAccountEntityId: string;
  chargeAccountCode: string;
  transactionReference: string;
  userId: string;
  branchId: string;
}

// POST /PaymentVouchers/create-wallet-receipt — نفس فكرة create-wallet-payment أعلاه للقبض.
export interface CreateWalletReceiptDto {
  payerId: string;
  receiptAmount: number;
  description: string;
  bankAccountEntityId: string;
  creditAccountCode: string;
  transactionReference: string;
  userId: string;
  branchId: string;
}

// Response shape shared by the 4 original create-* endpoints (Cash/Check/BankTransfer).
export interface CreateVoucherResult {
  voucherId: string;
  voucherNumber: string;
}

// POST /PaymentVouchers/create-wallet-payment|receipt يُرجعان Guid خام (معرّف السند) وليس
// {voucherId, voucherNumber} ككل بقية نقاط الإنشاء — لا رقم سند مُرجَع لعرضه في رسالة النجاح.
export type CreateWalletVoucherResult = string;

// Row shape from GET /api/PaymentVouchers (paginated+filtered manage-page list).
export interface PaymentVoucherListItem {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  status: VoucherStatus;
  partyName: string;
  amount: number;
  currency: string;
  voucherDate: string;
  linkedInvoiceNumber?: string | null;
  description: string;
}

export interface PaymentVoucherListResponse {
  items: PaymentVoucherListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// GET /api/PaymentVouchers/{voucherId}
export interface PaymentVoucherDetail {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  status: VoucherStatus;
  partyId: string;
  partyName: string;
  amount: number;
  description: string;
  voucherDate: string;
  cashAccountCode: string;
  creditAccountCode?: string | null;
  chargeAccountCode?: string | null;
  linkedInvoiceId?: string | null;
  linkedInvoiceNumber?: string | null;
  journalEntryId?: string | null;
  journalEntryNumber?: string | null;
  createdBy?: string | null;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
}

// POST /PaymentVouchers/approve — مؤكَّد من المستخدم 2026-08-09: استبدل POST
// /PaymentVouchers/{voucherId}/approve القديم (كان يأخذ userId في الجسم فقط) — الآن نقطة
// موحَّدة على مستوى الكيان تأخذ voucherId صراحة في الجسم بدل مسار الرابط.
export interface ApproveVoucherResult {
  voucherId: string;
  status: VoucherStatus;
}

// POST /PaymentVouchers/post — نقطة الترحيل الوحيدة الآن (استبدلت POST
// /PaymentVouchers/{voucherId}/post القديمة) — يرفض أي سند ليس Approved برسالة "Voucher
// must be approved before posting". شكل الاستجابة (JournalEntryDto) غير مؤكَّد حياً بعد،
// مبني حسب مواصفة مُعطاة.
export interface PaymentVoucherJournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  type: string;
  status: string;
  referenceInvoiceId?: string | null;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}
