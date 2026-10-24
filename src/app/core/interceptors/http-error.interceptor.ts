import { ApplicationRef, inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../../shared/services/auth.service';
import { friendlyErrorMessage, isInsufficientStockError } from '../../shared/utils/http-error.util';

// هذا التطبيق zoneless (لا يوجد zone.js) — الاشتراك في Observable وتعديل خاصية
// عادية داخل next() لا يُشعر Angular بأي تغيير تلقائياً، فتبقى الشاشة على حالها حتى
// يحدث أي حدث آخر (كنقرة) يُشغّل tick() من تلقاء نفسه. استدعاء tick() هنا بعد كل
// استجابة HTTP (نجاح أو فشل) يحل هذا مرة واحدة لكل الصفحات بدل تعديل كل مكوّن.
//
// مهم: هذا الـ interceptor أعلى (upstream) من أي map()/shareReplay() تضيفه الخدمات
// ومن subscribe() الخاص بالمكوّن نفسه. RxJS يُنفِّذ تأثير tap() الجانبي قبل تمرير القيمة
// للأسفل، فلو استُدعي tick() هنا بشكل متزامن (synchronous) فإنه يُنفَّذ ويُصيِّر الشاشة
// قبل أن يُشغَّل callback الـ subscribe في المكوّن أصلاً (الذي يُحدِّث loading/data فعلياً) —
// فيُصيِّر الحالة القديمة (لا يزال "جارٍ التحميل…")، ولا يُجدوَل أي tick لاحق، فتبقى الواجهة
// عالقة على الحالة القديمة حتى يحدث أي حدث آخر غير مرتبط يُشغِّل tick() (مؤكَّد حياً 2026-07-18:
// صفحة إدارة الأرصدة الافتتاحية كانت تُظهر "جارٍ التحميل" رغم اكتمال الطلب فعلياً في الشبكة).
// الحل: تأجيل tick() لِـ microtask بعد اكتمال السلسلة المتزامنة كاملة (map/shareReplay/
// subscribe كلها متزامنة أيضاً، فتُنفَّذ قبل الـ microtask التالي).
let tickPending = false;
function safeTick(appRef: ApplicationRef) {
  // تشغيل tick في microtask للتحديث السريع
  queueMicrotask(() => {
    try { appRef.tick(); } catch { /* تجاهل */ }
  });

  // تشغيل tick مؤجل ومزيل التكرار (debounced) لضمان التحديث بعد جميع العمليات والاشتراكات المتزامنة وغير المتزامنة في RxJS
  if (!tickPending) {
    tickPending = true;
    setTimeout(() => {
      tickPending = false;
      try { appRef.tick(); } catch { /* تجاهل */ }
    }, 0);
  }
}

// بعض نقاط الباك ايند (مثل UserCurrent.UserId عند عدم إرفاق توكن) ترمي
// InvalidOperationException غير مُعالَج بدل رفض الطلب بـ 401 نظيف — فيصل كخطأ 500 عام
// ونصه الخام "User is not authenticated. Please provide a valid JWT token." يظهر
// للمستخدم كما هو. يُكتشف هذا النص بغض النظر عن كود الحالة ويُعامَل كجلسة منتهية.
function isAuthError(err: HttpErrorResponse): boolean {
  if (err.status === 401) return true;
  const raw = typeof err.error === 'string' ? err.error : (err.error?.message || err.error?.detail || err.error?.title || '');
  return /not authenticated|jwt token/i.test(String(raw));
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const appRef = inject(ApplicationRef);
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    tap({ next: () => safeTick(appRef) }),
    catchError((err: HttpErrorResponse) => {
      const sessionExpired = () => {
        auth.logout();
        notify.error('انتهت صلاحية الجلسة — يرجى تسجيل الدخول مرة أخرى');
        router.navigateByUrl('/login');
        safeTick(appRef);
        return throwError(() => err);
      };

      // 401 (أو خطأ 500 يحمل نص "not authenticated"/"JWT token" الخام من الباك ايند) يعني
      // التوكن منتهي أو غير صالح. قبل إنهاء الجلسة مباشرة، يُحاوَل تجديده عبر
      // /Auth/refresh-token وإعادة الطلب الأصلي مرة واحدة بالتوكن الجديد — فقط لو لم يكن
      // الطلب الفاشل هو طلب التجديد نفسه (تجنباً لحلقة لا نهائية).
      if (isAuthError(err)) {
        if (req.url === auth.refreshTokenUrl) return sessionExpired();
        return auth.refreshAccessToken().pipe(
          switchMap(res => {
            if (!res.succeeded || !res.token?.accessToken) return sessionExpired();
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.token.accessToken}` } });
            return next(retried);
          }),
          catchError(() => sessionExpired()),
        );
      }
      // 409 "Insufficient stock for product {id}" عند تأكيد فاتورة: صفحة التأكيد نفسها
      // (sales-invoice-add-page) تلتقط هذا الخطأ وتعرض رسالة مخصَّصة تسمّي الصنف (SKU + الاسم)
      // بدل الرسالة العامة هنا — فيُتجاهَل هذا الخطأ هنا تماماً حتى لا يظهر تنبيهان متضاربان
      // (التنبيه هنا Toast وحيد يُستبدَل بالكامل عند كل notify.error، فأيّهما يصل أخيراً يطغى
      // على الآخر بدل تراكمهما، وهو تسلسل غير موثوق لعرض نفس الخطأ من مصدرين).
      if (isInsufficientStockError(err)) {
        safeTick(appRef);
        return throwError(() => err);
      }
      // بعض الـ endpoints (مثل إغلاق/إعادة فتح الفترة المالية) ترجع أخطاءها بصيغة RFC7807
      // ProblemDetails، حيث تكون الرسالة في err.error.detail وليس message — وغالباً نص إنجليزي
      // خام غير مفهوم للمستخدم النهائي. friendlyErrorMessage تترجم النصوص المعروفة قبل العرض.
      const fallback = err.error?.message || err.error?.detail || 'حدث خطأ في الاتصال بالخادم';
      notify.error(friendlyErrorMessage(err, fallback));
      safeTick(appRef);
      return throwError(() => err);
    }),
  );
};
