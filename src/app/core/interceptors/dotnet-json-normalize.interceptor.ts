import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

// بعض endpoints في هذا الباك ايند تُفعِّل ReferenceHandler.Preserve في .NET، فتُغلَّف أي
// مصفوفة (في أي مستوى، ليس فقط أعلى الاستجابة) فعلياً كـ {$id, $values:[...]} بدل مصفوفة
// عادية — مؤكَّد حياً على أكثر من endpoint مختلف (opening_balances/list، FiscalPeriod،
// وغيرها ظهرت 2026-07-18 عبر NG0900/NG02200 حقيقية على أكثر من صفحة). بدل فك التغليف يدوياً
// في كل خدمة (يفشل حتماً في أي endpoint جديد لم يُختبَر بعد)، يُطبَّق الفك هنا مرة واحدة على
// كل استجابة HTTP في التطبيق قبل وصولها لأي خدمة — يجعل هذا الصنف من الأخطاء مستحيلاً بنيوياً
// بدل الاعتماد على اكتشاف كل حالة يدوياً.
function isPreserveWrapper(value: unknown): value is { $values: unknown[] } {
  return !!value && typeof value === 'object' && Array.isArray((value as { $values?: unknown }).$values);
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    if (isPreserveWrapper(value)) return normalize(value.$values);
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === '$id') continue; // معرّف مرجعي داخلي من .NET، لا فائدة منه في الواجهة
      result[key] = normalize(v);
    }
    return result;
  }
  return value;
}

export const dotnetJsonNormalizeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map(event => {
      if (
        event instanceof HttpResponse &&
        event.body &&
        typeof event.body === 'object' &&
        !(event.body instanceof Blob) &&
        !(event.body instanceof ArrayBuffer)
      ) {
        return event.clone({ body: normalize(event.body) });
      }
      return event;
    }),
  );
