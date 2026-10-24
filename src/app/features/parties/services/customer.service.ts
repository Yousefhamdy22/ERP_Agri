import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { PartyListItem, UpdatePartyInfoDto } from '../models/supplier.model';
import { CreateCustomerDto, CUSTOMER_PARTY_TYPE, Customer } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private base = `${environment.apiUrl}/Parties`;

  // تخزين مؤقت للطلب الافتراضي (بدون فلترة) لتجنب إعادة طلب نفس البيانات عند التنقل
  // المتكرر بين الصفحات، ويفرغ الكاش عند إضافة أو تعديل عميل.
  private cache$: Observable<PagedResult<PartyListItem>> | null = null;

  constructor(private http: HttpClient) {}

  getAll(search = '', page = 1, pageSize = 200): Observable<PagedResult<PartyListItem>> {
    const isDefault = !search && page === 1 && pageSize === 200;
    if (isDefault && this.cache$) {
      return this.cache$;
    }

    let params = new HttpParams()
      .set('type', CUSTOMER_PARTY_TYPE)
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

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${id}`);
  }

  // مسار الإنشاء مؤكَّد حياً: POST /api/Parties/customers (تُستخدم صيغة الجمع، بنفس نمط
  // /api/Parties/suppliers الموجود فعلاً في SupplierService).
  create(dto: CreateCustomerDto): Observable<Customer> {
    return this.http.post<Customer>(`${this.base}/customers`, dto).pipe(
      tap(() => this.invalidate())
    );
  }

  update(id: string, dto: UpdatePartyInfoDto): Observable<Customer> {
    return this.http.put<Customer>(`${this.base}/${id}`, dto).pipe(
      tap(() => this.invalidate())
    );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.base}/${id}`).pipe(
      tap(() => this.invalidate())
    );
  }

  private invalidate() {
    this.cache$ = null;
  }
}
