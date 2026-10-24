export type PaymentType = 'Receipt' | 'Payment' | 'AdvancePayment' | 'CheckIssued' | 'CheckReceived';
export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Check' | 'Card' | 'Bank' | 'Other';
export type PaymentStatus = 'Pending' | 'Approved' | 'Posted' | 'Reconciled' | 'Cancelled' | 'Reversed';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  Receipt: 'تحصيل من عميل',
  Payment: 'دفع لمورد',
  AdvancePayment: 'دفعة مقدمة',
  CheckIssued: 'شيك صادر (يزيد الدين)',
  CheckReceived: 'شيك وارد (يزيد الدين)',
};

export const PAYMENT_TYPE_BADGE: Record<PaymentType, string> = {
  Receipt: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Payment: 'bg-sky-100 text-sky-800 border border-sky-200',
  AdvancePayment: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  CheckIssued: 'bg-amber-100 text-amber-800 border border-amber-300',
  CheckReceived: 'bg-purple-100 text-purple-800 border border-purple-300',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: 'نقدي',
  BankTransfer: 'تحويل بنكي',
  Check: 'شيك',
  Card: 'بطاقة',
  Bank: 'إيداع بنكي',
  Other: 'أخرى',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  Cash: 'fa-solid fa-money-bill-wave',
  BankTransfer: 'fa-solid fa-building-columns',
  Check: 'fa-solid fa-money-check-dollar',
  Card: 'fa-solid fa-credit-card',
  Bank: 'fa-solid fa-vault',
  Other: 'fa-solid fa-ellipsis',
};

// الباك ايند يرفض قيم enum كنص (400: "$.method ... could not be converted") ويطلب
// الترتيب الرقمي (ordinal) بدلاً منها. الترتيب هنا مطابق لترتيب القيم كما ورد في توثيق
// الـ API الأصلي (Cash|BankTransfer|Check|Card|Bank|Other و Receipt|Payment|AdvancePayment) —
// افتراض غير مؤكد حياً بعد؛ يحتاج تأكيد إن رجع الحفظ بقيمة method/type خاطئة.
export const PAYMENT_METHOD_ORDINAL: Record<PaymentMethod, number> = {
  Cash: 0,
  BankTransfer: 1,
  Check: 2,
  Card: 3,
  Bank: 4,
  Other: 5,
};

export const PAYMENT_TYPE_ORDINAL: Record<PaymentType, number> = {
  Receipt: 0,
  Payment: 1,
  AdvancePayment: 2,
  CheckIssued: 3,
  CheckReceived: 4,
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Pending: 'قيد الانتظار',
  Approved: 'معتمد',
  Posted: 'مرحّل',
  Reconciled: 'مطابَق',
  Cancelled: 'ملغى',
  Reversed: 'معكوس',
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  Pending: 'bg-orange-200 text-orange-800',
  Approved: 'bg-blue-200 text-blue-800',
  Posted: 'bg-green-200 text-green-800',
  Reconciled: 'bg-purple-200 text-purple-800',
  Cancelled: 'bg-red-200 text-red-800',
  Reversed: 'bg-gray-200 text-gray-800',
};

export interface PaymentAllocationInput {
  invoiceId: string;
  allocatedAmount: number;
  discountTaken: number;
}

// POST /api/payments/create — userId يُملأ من المستخدم المسجّل دخوله (AuthService)، ليس من نموذج الإدخال.
export interface CreatePaymentDto {
  branchId: string;
  partyId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  paymentDate: string;
  reference?: string | null;
  allocations: PaymentAllocationInput[];
  checkNumber?: string | null;
  checkDate?: string | null;
  checkBank?: string | null;
}

export interface CreatePaymentResult {
  id: string;
  paymentNumber: string;
  status: PaymentStatus;
  createdAt: string;
}

// POST /api/payments/{paymentId}/allocate — مؤكَّد حياً 2026-08-02: paymentId وuserId يُرسَلان
// أيضاً داخل الـ body (بالإضافة لـ paymentId في مسار الـ URL نفسه — تكرار مؤكَّد وليس خطأ).
export interface AllocatePaymentDto {
  paymentId: string;
  allocations: PaymentAllocationInput[];
  userId: string;
}

// POST /api/payments/{paymentId}/cancel body shape.
export interface CancelPaymentRequest {
  reason: string;
}

export interface AllocatePaymentResult {
  paymentId: string;
  totalAllocated: number;
  totalDiscount: number;
}

// POST /api/payments/{paymentId}/approve — مؤكَّد حياً 2026-08-08: الاستجابة الفعلية هي
// كائن الدفعة الكامل (نفس شكل PaymentDetailDto تقريباً)، بحقل "id" وليس "paymentId" كما
// كان مفترَضاً سابقاً — الافتراض الخاطئ كان يجعل patchLocalStatus (تحديث حالة الصف محلياً
// فوراً بعد الاعتماد دون إعادة تحميل القائمة كاملة) لا يجد أي صف مطابق أبداً (id === undefined)،
// فتبقى الحالة القديمة معروضة في القائمة حتى يُعاد تحميلها يدوياً (F5/تصفية).
// post/cancel لم يُؤكَّدا حياً بنفس الطريقة بعد لكن يُفترَض نفس الشكل لنفس السبب.
export interface ApproveOrPostResult {
  id: string;
  paymentId?: string;
  status: PaymentStatus;
  approvedAt?: string;
  approvedBy?: string;
  postedAt?: string;
  journalEntryId?: string;
}

export interface CancelPaymentResult {
  id: string;
  paymentId?: string;
  status: PaymentStatus;
  cancelledAt: string;
  reason: string;
}

export interface PaymentAllocationDetail {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
  discountTaken: number;
  remainingBalance: number;
}

// GET /api/payments/{paymentId}
export interface PaymentDetailDto {
  id: string;
  paymentNumber: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  partyName: string;
  partyId: string;
  paymentDate: string;
  reference?: string | null;
  allocations: PaymentAllocationDetail[];
  createdAt: string;
  createdBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  postedAt?: string | null;
  postedBy?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelledReason?: string | null;
  checkNumber?: string | null;
  checkDate?: string | null;
  checkBank?: string | null;
}

// Row shape from GET /api/payments/party/{partyId} و /api/payments/branch/{branchId} و /api/payments/unallocated/{partyId}
export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  partyName: string;
  paymentDate: string;
  checkNumber?: string | null;
  checkDate?: string | null;
  checkBank?: string | null;
}

export interface PaymentListResponse {
  items: PaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// GET /api/payments/list — مؤكَّد حياً من GetPaymentsList controller action (2026-07-08).
// status/method/type تُرسَل كنص (اسم enum) في الـ query string، بخلاف جسم POST الذي يتطلب
// ordinal رقمي — الـ binder هنا [FromQuery] string?، لا [FromQuery] PaymentStatus.
export interface PaymentListQuery {
  page?: number;
  pageSize?: number;
  branchId?: string;
  partyId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  type?: PaymentType;
  fromDate?: string;
  toDate?: string;
  searchText?: string;
  sortBy?: string;
  sortDescending?: boolean;
}
