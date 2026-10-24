import { HttpErrorResponse } from '@angular/common/http';

// خرائط رسائل ProblemDetails/الأخطاء الخام القادمة من الباك ايند (عادة إنجليزية) إلى نص عربي
// مفهوم للمستخدم النهائي. المطابقة جزئية (includes) وغير حساسة لحالة الأحرف حتى تصمد أمام
// اختلافات طفيفة في صياغة نفس الرسالة بين نقاط نهاية مختلفة.
const KNOWN_ERROR_MESSAGES: { match: string; friendly: string }[] = [
  {
    match: 'insufficient stock',
    friendly: 'الكمية المطلوبة غير متوفرة في المخزون بالمستودع المحدَّد — راجع الكميات المتاحة ثم أعد المحاولة',
  },
  {
    match: 'already confirmed',
    friendly: 'هذه الفاتورة مؤكَّدة بالفعل',
  },
  {
    match: 'insufficient balance to decrease',
    friendly: 'رصيد الحساب الحالي للعميل/المورد لا يكفي لإتمام هذه العملية. يرجى التحقق من كشف الحساب.',
  },
];

// رسائل تحمل أرقاماً متغيّرة (مبلغ الطلب/الرصيد المتاح...) فلا يصلح لها تطابق نصي ثابت —
// يُستخرَج الرقمان من نص الباك ايند الخام ويُعاد تركيبهما داخل جملة عربية مفهومة بنفس القيم.
const DYNAMIC_ERROR_PATTERNS: { pattern: RegExp; friendly: (m: RegExpMatchArray) => string }[] = [
  {
    // "Payment amount $4,443.99 exceeds available cash ($7,625.01)"
    // "Payment amount $443.99 exceeds available bank balance $0.00" (create-bank-transfer)
    pattern: /payment amount \$?([\d,]+(?:\.\d+)?)\s*exceeds available (?:cash|bank balance)\s*\(?\$?([\d,]+(?:\.\d+)?)\)?/i,
    friendly: m => `المبلغ المطلوب صرفه (${m[1]}) أكبر من الرصيد النقدي المتاح في حساب النقدية/البنك المختار (${m[2]}) — قلّل المبلغ أو اختر حساب آخر لديه رصيد كافٍ`,
  },
  {
    // مؤكَّد حياً (create-cash-receipt): "Receipt amount $999.87 exceeds outstanding AR balance $0.00"
    // ومؤكَّد حياً أيضاً (create-bank-transfer): "...exceeds outstanding payable balance $14,250.00"
    // — تنبيه من نوع مختلف عن النمط أعلاه (رصيد الصندوق/البنك): هنا المقارنة برصيد الطرف
    // المستحق (AR/receivable للعميل عند سند قبض، AP/payable للمورد عند سند صرف) لا برصيد
    // حساب الصندوق نفسه. اسم الرصيد (AR/AP/receivable/payable) نفسه غير مستخدَم في الرسالة
    // العربية أدناه — فقط نوع السند (receipt/payment) هو ما يحدِّد الصياغة.
    pattern: /(receipt|payment) amount \$?([\d,]+(?:\.\d+)?)\s*exceeds outstanding (?:AR|AP|receivable|payable) balance\s*\(?\$?([\d,]+(?:\.\d+)?)\)?/i,
    friendly: m => {
      const isReceipt = m[1].toLowerCase() === 'receipt';
      const amount = m[2];
      const outstanding = m[3];
      return isReceipt
        ? `مبلغ التحصيل (${amount}) أكبر من رصيد العميل المستحق (${outstanding}) — تحقّق من فواتير العميل غير المسددة أو قلّل المبلغ`
        : `مبلغ السداد (${amount}) أكبر من رصيد المورد المستحق (${outstanding}) — تحقّق من فواتير المورد غير المسددة أو قلّل المبلغ`;
    },
  },
  {
    // مؤكَّد حياً لـ "for this account" و"for this customer" (create-manual-opening-balance/
    // create-customer-opening-balance) — نفس الرسالة متوقّعة أيضاً لـ "for this supplier"
    // (create-supplier-opening-balance)، فالمطابقة عامة على الكيان بدل نص ثابت واحد.
    pattern: /opening balance already exists for this (account|customer|supplier)/i,
    friendly: m => {
      const label = ({ account: 'الحساب', customer: 'العميل', supplier: 'المورد' } as Record<string, string>)[m[1].toLowerCase()] || m[1];
      return `يوجد رصيد افتتاحي مسجَّل بالفعل لهذا ${label} — لا يمكن إضافة أكثر من رصيد افتتاحي واحد لنفس ${label}`;
    },
  },
  {
    // "Insufficient stock for product 'Product Name' in warehouse 'Warehouse Name'. Available: 5.00, Requested: 10.00"
    // "Insufficient stock for 'Product Name' in warehouse 'Warehouse Name'. Available: 77.000, Requested: 90"
    pattern: /insufficient stock for (?:product )?'([^']+)' in warehouse '([^']+)'.\s*Available:\s*([\d.]+),\s*Requested:\s*([\d.]+)/i,
    friendly: m => `عذراً، الكمية المطلوبة من الصنف "${m[1]}" في مخزن "${m[2]}" غير كافية. الكمية المتاحة حالياً: ${m[3]}، بينما الكمية المطلوبة: ${m[4]}.`
  },
  {
    // "Cannot deduct stock for product 'Product Name': Message"
    pattern: /cannot deduct stock for (?:product )?'([^']+)':\s*(.+)/i,
    friendly: m => `فشل خصم المخزون للصنف "${m[1]}": ${m[2]}`
  },
  {
    // "FIFO allocation failed for product 'Product Name': Message"
    pattern: /fifo allocation failed for (?:product )?'([^']+)':\s*(.+)/i,
    friendly: m => `فشل تقييم تكلفة FIFO للصنف "${m[1]}": ${m[2]}`
  },
];

// شكل خاص لأخطاء الفاليديشن (مثل create-*-opening-balance): مصفوفة {code, description, type}
// بدل ProblemDetails العادي — وتُغلَّف كمصفوفة أحياناً كـ {$id,$values:[...]} (نمط
// ReferenceHandler.Preserve، انظر dotnet-json-normalize.interceptor.ts) لأن ذلك الفك التلقائي
// يعمل فقط على استجابات النجاح (map على HttpResponse) ولا يمسّ err.error في مسار الخطأ. اللافت
// هنا: "code" يحمل النص الفعلي المفيد ("Opening balance already exists...") بينما "description"
// عام دائماً ("Validation error") — عكس التسمية المعتادة، فتُقرأ code أولاً.
// شكل آخر مؤكَّد حياً (POST .../draft، 404 "Invoice Draft Validation Failed"): المصفوفة هنا
// متداخلة تحت err.error.errors (وليس err.error مباشرة)، وعناصرها {code, message, field} بدل
// {code, description} — "code" غالباً عام جداً ("NotFound") و"field" يحدِّد الحقل الفعلي.
interface ValidationErrorItem { code?: string; description?: string; message?: string; field?: string }

// يبحث عن مصفوفة عناصر الفاليديشن في أكثر من موضع محتمل بدل افتراض مكان واحد ثابت —
// هذا الباك ايند غير متّسق بين نقاط النهاية المختلفة (أحياناً err.error.$values مباشرة،
// وأحياناً err.error.errors.$values، وأحياناً err.error.errors كمصفوفة عادية بلا تغليف).
function extractValidationItems(err: HttpErrorResponse): ValidationErrorItem[] | null {
  const body = err.error;
  if (!body || typeof body !== 'object') return null;
  const candidates: unknown[] = [body.$values, body.errors?.$values, body.errors];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0 && typeof c[0] === 'object') return c as ValidationErrorItem[];
  }
  return null;
}

// أسماء حقول إنجليزية معروفة تُترجَم عند ظهورها في خطأ "NotFound" حتى تُقرأ رسالة عربية
// مفهومة ("المخزن المحدَّد غير موجود") بدل عرض اسم الحقل الخام أو الـ GUID الفارغ نفسه.
const NOT_FOUND_FIELD_LABELS: Record<string, string> = {
  Warehouse: 'المخزن',
  Branch: 'الفرع',
  Customer: 'العميل',
  Supplier: 'المورد',
  Product: 'الصنف',
  Account: 'الحساب',
};

// حالة خاصة: 409 "already Confirmed" ليست فشلاً حقيقياً من منظور المستخدم — الفاتورة
// وصلت لحالتها المطلوبة فعلاً (مؤكَّدة)، فقط طلب التأكيد وصل متأخراً (نقرة مزدوجة، تبويب آخر
// أكَّدها أولاً، إلخ). تُستخدم للتمييز بين هذه الحالة وأي فشل تأكيد آخر حتى لا تُعرض كخطأ.
export function isAlreadyConfirmedError(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) return false;
  return rawBackendMessage(err).toLowerCase().includes('already confirmed');
}

// 409 "Insufficient stock for product {id}" عند التأكيد — يُميَّز عن أي فشل تأكيد آخر لأن
// رسالة المستخدم المناسبة تختلف حسب صلاحيته (أدمن يمكنه البيع بالسالب لو المخزن يسمح
// بذلك، الموظف لا يملك هذه الصلاحية إطلاقاً) — الباك ايند هو الحكم النهائي دائماً، هذا
// فقط لعرض رسالة أوضح من النص الإنجليزي الخام.
export function isInsufficientStockError(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  if (err.status !== 409 && err.status !== 400) return false;
  return rawBackendMessage(err).toLowerCase().includes('insufficient stock');
}

// يستخرج معرّف الصنف (GUID) من نص الباك ايند الخام "Insufficient stock for product {id}" —
// null لو لم تُطابق الرسالة الشكل المتوقَّع، حتى تعرض الواجهة اسم الصنف الفعلي بدل رسالة عامة.
export function extractInsufficientStockProductId(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const match = rawBackendMessage(err).match(/insufficient stock for product\s+([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

function rawBackendMessage(err: HttpErrorResponse): string {
  if (typeof err.error === 'string') return err.error;
  const items = extractValidationItems(err);
  if (items && items.length > 0) {
    const messages = items
      .map(item => {
        if (item.message && item.message !== 'Validation error') return item.message;
        if (item.description && item.description !== 'Validation error') return item.description;
        if (item.field && item.field !== 'Validation') return item.field;
        return item.code || '';
      })
      .filter(m => !!m.trim());

    if (messages.length === 1) return messages[0];
    if (messages.length > 1) return messages.join('\n• ');
  }
  return err.error?.detail || err.error?.message || err.error?.title || '';
}

// يستخرج من استجابة خطأ HTTP (سواء JSON عادي أو RFC7807 ProblemDetails بحقل detail) رسالة
// عربية مفهومة: يبحث أولاً عن ترجمة معروفة لنص الباك ايند الخام، وإلا يعيد fallback المُمرَّر
// (بدل عرض النص الإنجليزي الخام كما هو للمستخدم).
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;

  // خطأ "NotFound" بحقل محدَّد (مثال حي: WarehouseId فارغ/Guid.Empty وصل للباك ايند فوصل
  // بحث المخزن لخطأ 404 بدل رسالة تحقق واضحة) — يُبنى نص عربي من اسم الحقل نفسه بدل الاعتماد
  // على "code"/"message" الخامين (NotFound / GUID فارغ لا يُفيدان المستخدم النهائي).
  const items = extractValidationItems(err);
  const first = items?.[0];
  if (first?.code === 'NotFound' && first.field) {
    const label = NOT_FOUND_FIELD_LABELS[first.field] || first.field;
    return `${label} المحدَّد غير موجود — تأكد من اختياره بشكل صحيح ثم أعد المحاولة`;
  }

  const rawOriginal = rawBackendMessage(err);
  if (!rawOriginal) return fallback;

  for (const d of DYNAMIC_ERROR_PATTERNS) {
    const m = rawOriginal.match(d.pattern);
    if (m) return d.friendly(m);
  }

  const raw = rawOriginal.toLowerCase();
  const known = KNOWN_ERROR_MESSAGES.find(k => raw.includes(k.match));
  if (known) return known.friendly;

  // If the backend error message already contains Arabic, display it directly
  if (/[\u0600-\u06FF]/.test(rawOriginal)) {
    return rawOriginal;
  }

  return fallback;
}
