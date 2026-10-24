import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ApiResult,
  CreateSupplierDto,
  PagedResult,
  PartyListItem,
  SUPPLIER_PARTY_TYPE,
  Supplier,
  UpdatePartyInfoDto,
} from '../models/supplier.model';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private base = `${environment.apiUrl}/Parties`;

  // تخزين مؤقت للطلب الافتراضي (بدون فلترة) لتجنب إعادة طلب نفس البيانات عند التنقل
  // المتكرر بين الصفحات، ويفرغ الكاش عند إضافة أو تعديل مورد.
  private cache$: Observable<PagedResult<PartyListItem>> | null = null;

  constructor(private http: HttpClient) {}

  getAll(search = '', page = 1, pageSize = 200): Observable<PagedResult<PartyListItem>> {
    const isDefault = !search && page === 1 && pageSize === 200;
    if (isDefault && this.cache$) {
      return this.cache$;
    }

    let params = new HttpParams()
      .set('type', SUPPLIER_PARTY_TYPE)
      .set('page', page)
      .set('pageSize', pageSize);
    if (search) params = params.set('search', search);

    const req$ = this.http.get<PagedResult<PartyListItem>>(this.base, { params });

    if (isDefault) {
      this.cache$ = req$.pipe(
        shareReplay(1),
        catchError(err => {
          this.cache$ = null;
          return throwError(() => err);
        })
      );
      return this.cache$;
    }
    return req$;
  }

  getById(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.base}/${id}`);
  }

  create(dto: CreateSupplierDto): Observable<ApiResult> {
    return this.http.post<ApiResult>(`${this.base}/suppliers`, dto).pipe(
      tap(() => this.invalidate())
    );
  }

  update(id: string, dto: UpdatePartyInfoDto): Observable<ApiResult> {
    return this.http.put<ApiResult>(`${this.base}/${id}`, dto).pipe(
      tap(() => this.invalidate())
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(
      tap(() => this.invalidate())
    );
  }

  private invalidate() {
    this.cache$ = null;
  }
}
