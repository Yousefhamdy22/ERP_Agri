import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CashSafe, CashSafeDetail, CreateCashSafeDto, UpdateCashSafeDto } from '../models/cash-safe.model';

@Injectable({ providedIn: 'root' })
export class CashSafeService {
  private base = `${environment.apiUrl}/CashSafes`;

  // لا يوجد GET عام لكل الخزائن — GET bare /api/CashSafes يُرجع 405 حياً (مؤكَّد 2026-08-15،
  // الكونترولر لا يُعرِّف Action لـ GET على المسار الجذر). فقط GET .../branch/{id} يعمل.
  private cache = new Map<string, Observable<CashSafe[]>>();

  constructor(private http: HttpClient) {}

  getByBranch(branchId: string): Observable<CashSafe[]> {
    let cached = this.cache.get(branchId);
    if (!cached) {
      cached = this.http.get<CashSafe[]>(`${this.base}/branch/${branchId}`).pipe(
        catchError(err => { this.cache.delete(branchId); return throwError(() => err); }),
        shareReplay(1),
      );
      this.cache.set(branchId, cached);
    }
    return cached;
  }

  getById(id: string): Observable<CashSafeDetail> {
    return this.http.get<CashSafeDetail>(`${this.base}/${id}`);
  }

  create(dto: CreateCashSafeDto): Observable<CashSafe> {
    return this.http.post<CashSafe>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  update(dto: UpdateCashSafeDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${dto.id}`, dto).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.cache.clear();
  }
}
