import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BankAccount, BankAccountDetail, CreateBankAccountDto, UpdateBankAccountDto } from '../models/bank-account.model';

@Injectable({ providedIn: 'root' })
export class BankAccountService {
  private base = `${environment.apiUrl}/BankAccounts`;

  // لا يوجد GET عام لكل الحسابات البنكية — GET bare /api/BankAccounts يُرجع 405 حياً
  // (مؤكَّد 2026-08-15، الكونترولر لا يُعرِّف Action لـ GET على المسار الجذر). فقط
  // GET .../branch/{id} يعمل.
  private cache = new Map<string, Observable<BankAccount[]>>();

  constructor(private http: HttpClient) {}

  getByBranch(branchId: string): Observable<BankAccount[]> {
    let cached = this.cache.get(branchId);
    if (!cached) {
      cached = this.http.get<BankAccount[]>(`${this.base}/branch/${branchId}`).pipe(
        catchError(err => { this.cache.delete(branchId); return throwError(() => err); }),
        shareReplay(1),
      );
      this.cache.set(branchId, cached);
    }
    return cached;
  }

  getById(id: string): Observable<BankAccountDetail> {
    return this.http.get<BankAccountDetail>(`${this.base}/${id}`);
  }

  create(dto: CreateBankAccountDto): Observable<BankAccount> {
    return this.http.post<BankAccount>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  update(dto: UpdateBankAccountDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${dto.id}`, dto).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.cache.clear();
  }
}
