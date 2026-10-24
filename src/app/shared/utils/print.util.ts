/**
 * Isolates `.print-root` content and hides the rest of the app during browser print.
 * `onDone` (اختياري) يُستدعى بعد اكتمال/إلغاء الطباعة فعلياً (حدث afterprint) — وليس فوراً
 * بعد استدعاء window.print() نفسها. window.print() لا تحجب تنفيذ الجافاسكريبت بالضرورة في كل
 * المتصفحات (معاينة الطباعة في Chrome تحديداً قد تُرسَم بشكل غير محجوب) — أي كود يفترض أنها
 * تحجب وينفِّذ تنظيفاً (كإغلاق نافذة التفاصيل) "بعدها مباشرة" في نفس الاستدعاء قد يزيل محتوى
 * الطباعة من الـ DOM قبل أن يلتقطه المتصفح فعلياً، فتخرج الطباعة صفحة بيضاء بلا بيانات
 * (مؤكَّد حياً 2026-08-01 — هذا بالضبط ما حدث). afterprint وحده مضمون الحدوث بعد اكتمال العملية.
 */
export function triggerPrint(onDone?: () => void): void {
  document.body.classList.add('print-active');

  const startTime = Date.now();
  let cleaned = false;
  
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('print-active');
    window.removeEventListener('afterprint', cleanup);
    window.removeEventListener('focus', focusCleanup);
    onDone?.();
  };

  const focusCleanup = () => {
    if (Date.now() - startTime > 1000) {
      cleanup();
    }
  };

  window.addEventListener('afterprint', cleanup);
  // Fallback: only clean up when returning if at least 1 second has elapsed
  window.addEventListener('focus', focusCleanup);
  window.print();
}
