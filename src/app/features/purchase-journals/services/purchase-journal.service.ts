import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ConfirmCashPurchaseDto,
  ConfirmCheckPurchaseDto,
  ConfirmCreditPurchaseDto,
  PurchaseJournalDto,
} from '../models/purchase-journal.model';

// نقاط GET هنا (period/{id}, All) ترجع مصفوفة مسطّحة بدون ترقيم صفحات (لا معاملات
// فلترة موثّقة)، فتُخزَّن هنا وتُفرَّغ بعد أي تأكيد شراء جديد — نفس فكرة FiscalPeriodService.
@Injectable({ providedIn: 'root' })
export class PurchaseJournalService {
  private base = `${environment.apiUrl}/PurchaseJournals`;

  private allCache: Observable<PurchaseJournalDto[]> | null = null;
  private periodCache = new Map<string, Observable<PurchaseJournalDto[]>>();

  constructor(private http: HttpClient) {}

  confirmCashPurchase(dto: ConfirmCashPurchaseDto): Observable<PurchaseJournalDto> {
    return this.http.post<PurchaseJournalDto>(`${this.base}/confirm-cash-purchase`, dto).pipe(tap(() => this.invalidate()));
  }

  confirmCreditPurchase(dto: ConfirmCreditPurchaseDto): Observable<PurchaseJournalDto> {
    return this.http.post<PurchaseJournalDto>(`${this.base}/confirm-credit-purchase`, dto).pipe(tap(() => this.invalidate()));
  }

  confirmCheckPurchase(dto: ConfirmCheckPurchaseDto): Observable<PurchaseJournalDto> {
    return this.http.post<PurchaseJournalDto>(`${this.base}/confirm-check-purchase`, dto).pipe(tap(() => this.invalidate()));
  }

  getByPeriod(periodId: string): Observable<PurchaseJournalDto[]> {
    let cached = this.periodCache.get(periodId);
    if (!cached) {
      cached = this.http.get<PurchaseJournalDto[]>(`${this.base}/period/${periodId}`).pipe(shareReplay(1));
      this.periodCache.set(periodId, cached);
    }
    return cached;
  }

  getAll(): Observable<PurchaseJournalDto[]> {
    if (!this.allCache) {
      this.allCache = this.http.get<PurchaseJournalDto[]>(`${this.base}/All`).pipe(shareReplay(1));
    }
    return this.allCache;
  }

  getDetail(journalId: string): Observable<PurchaseJournalDto> {
    return this.http.get<PurchaseJournalDto>(`${this.base}/${journalId}`);
  }

  private invalidate() {
    this.allCache = null;
    this.periodCache.clear();
  }
}
