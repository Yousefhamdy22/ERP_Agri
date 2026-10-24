import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CreateManualJournalCommand,
  ManualJournalDetail,
  ManualJournalListResponse,
  PostManualJournalCommand,
  UpdateManualJournalCommand,
} from '../models/manual-journal.model';

export interface ManualJournalListFilter {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ManualJournalService {
  private base = `${environment.apiUrl}/ManualJournal`;

  // نفس فكرة تخزين قوائم السندات: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة، وتُفرَّغ
  // بعد أي إنشاء/تعديل/حذف/ترحيل لأن القائمة والحالات تتغيّر.
  private listCache = new Map<string, Observable<ManualJournalListResponse>>();

  constructor(private http: HttpClient) {}

  create(command: CreateManualJournalCommand): Observable<ManualJournalDetail> {
    return this.http.post<ManualJournalDetail>(`${this.base}/create`, command).pipe(tap(() => this.invalidate()));
  }

  update(command: UpdateManualJournalCommand): Observable<ManualJournalDetail> {
    return this.http.put<ManualJournalDetail>(`${this.base}/update`, command).pipe(tap(() => this.invalidate()));
  }

  post(command: PostManualJournalCommand): Observable<ManualJournalDetail> {
    return this.http.post<ManualJournalDetail>(`${this.base}/post`, command).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidate()));
  }

  getList(filter: ManualJournalListFilter = {}): Observable<ManualJournalListResponse> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number);
      }
      cached = this.http.get<ManualJournalListResponse>(this.base, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getDetail(id: string): Observable<ManualJournalDetail> {
    return this.http.get<ManualJournalDetail>(`${this.base}/${id}`);
  }

  private invalidate() {
    this.listCache.clear();
  }
}
