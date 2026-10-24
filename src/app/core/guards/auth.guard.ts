import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

// السيرفر (SSR) ما عنده وصول لـ localStorage، فأي فحص لـ isAuthenticated وقت الـ SSR
// بيرجع false دايماً ويحوّل لصفحة /login حتى لو التوكن الحقيقي في متصفح المستخدم سليم —
// وده اللي كان بيحصل مع أي refresh (رندر SSR جديد كل مرة). الحل: تخطي الفحص وقت الـ SSR
// وترك الفحص الحقيقي للمتصفح بعد الـ hydration.
export const authGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
