import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { dotnetJsonNormalizeInterceptor } from './core/interceptors/dotnet-json-normalize.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // dotnetJsonNormalizeInterceptor آخر عنصر عمداً — أقرب للباك ايند، فيُطبَّق على الجسم
    // الخام أولاً عند عودة الاستجابة، قبل أن تصل لـ httpErrorInterceptor/authInterceptor
    // أو لأي خدمة، فلا تحتاج أي خدمة فك التغليف ({$id,$values}) يدوياً بعد الآن.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor, dotnetJsonNormalizeInterceptor])),
  ]
};
