import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

// معظم نقاط الـ API في هذا الباك ايند تعمل بدون Authorization header أصلاً (لا تتطلب
// مصادقة)، وإرفاق توكن عليها كان يُسقط الطلب بالكامل (ERR_HTTP2_PROTOCOL_ERROR / 401)
// حتى على نقاط لم تكن تحتاج توكن من الأساس. لذلك بدل إرفاق التوكن على كل شيء (blocklist)،
// يُرفق فقط على مسارات معروف أنها تتطلب مصادقة فعلياً (allowlist).
// أضف بادئة جديدة هنا فقط بعد تأكيد أن نقطتها الفعلية ترجع 401/InvalidOperationException
// بدون توكن. ملاحظة مفيدة: أي نقطة POST/PUT لا تأخذ userId صراحةً في جسم الطلب (كـ
// /Products/excel-import) تعتمد داخلياً على UserCurrent.UserId المُستخرج من التوكن،
// فتحتاج الهيدر لزاماً — بخلاف نقاط مثل Payments/Invoices التي تستقبل userId كحقل صريح.
const PROTECTED_PREFIXES = [
  `${environment.apiUrl}/payments`,
  `${environment.apiUrl}/Products/excel-import`,
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const token = isBrowser ? localStorage.getItem('token') : null;
  const isProtected = PROTECTED_PREFIXES.some(p => req.url.toLowerCase().startsWith(p.toLowerCase()));

  if (!token || !isProtected) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
