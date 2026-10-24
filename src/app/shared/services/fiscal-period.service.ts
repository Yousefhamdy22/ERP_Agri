import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateFiscalPeriodDto, FiscalPeriod } from '../models/fiscal-period.model';

@Injectable({ providedIn: 'root' })
export class FiscalPeriodService {
  private base = `${environment.apiUrl}/FiscalPeriod`;

  // نفس فكرة تخزين قوائم الفروع: القائمة الكاملة تُخزَّن مرة واحدة وتُعاد لأي مكوّن
  // آخر يطلبها، وتُفرَّغ فقط بعد إضافة/إغلاق/إعادة فتح فترة حقيقية.
  private listCache: Observable<FiscalPeriod[]> | null = null;

  constructor(private http: HttpClient) {}

  getAll(): Observable<FiscalPeriod[]> {
    if (!this.listCache) {
      // shareReplay(1) يُخزِّن الخطأ نفسه أيضاً ويعيده لكل مشترك جديد إن فشل الطلب مرة
      // واحدة — بدون catchError هنا يبقى كل استدعاء لاحق لـ getAll() يفشل بصمت للأبد
      // حتى إعادة تحميل الصفحة كاملة (نفس نمط BranchService.getAll()). فك تغليف
      // {$id,$values} المحتمل (ReferenceHandler.Preserve في .NET) يحدث عالمياً في
      // dotnetJsonNormalizeInterceptor قبل وصول الاستجابة هنا — لا حاجة لفكه يدوياً.
      this.listCache = this.http.get<FiscalPeriod[]>(this.base).pipe(
        shareReplay(1),
        catchError(err => { this.listCache = null; return throwError(() => err); }),
      );
    }
    return this.listCache;
  }

  getById(id: string): Observable<FiscalPeriod> {
    return this.http.get<FiscalPeriod>(`${this.base}/${id}`);
  }

  create(dto: CreateFiscalPeriodDto): Observable<FiscalPeriod> {
    return this.http.post<FiscalPeriod>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  // Controller reads closebyUserId/note as plain query params (no [FromBody] model).
  close(periodId: string, closedByUserId: string, note: string): Observable<void> {
    const params = new HttpParams().set('closebyUserId', closedByUserId).set('note', note);
    return this.http.post<void>(`${this.base}/${periodId}/close`, null, { params }).pipe(tap(() => this.invalidate()));
  }

  reopen(periodId: string, reopenedByUserId: string, note: string): Observable<void> {
    const params = new HttpParams().set('reopenByUserId', reopenedByUserId).set('note', note);
    return this.http.post<void>(`${this.base}/${periodId}/reopen`, null, { params }).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.listCache = null;
  }
}
