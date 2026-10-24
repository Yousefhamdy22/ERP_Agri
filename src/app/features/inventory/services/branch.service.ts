import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { BranchListItem, BranchDetail, BranchWithWarehouses, CreateBranchDto, UpdateBranchDto, BranchType } from '../models/branch.model';

export interface BranchListFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  branchType?: BranchType;
  sortBy?: string;
  sortAscending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchService {
  private base = `${environment.apiUrl}/Branches`;

  // نفس فكرة تخزين قوائم المنتجات: كل تركيبة (فلتر + صفحة) تُخزَّن على حدة،
  // وتُفرَّغ بالكامل مع قائمة الدروب داون بعد أي إضافة/تعديل حقيقي.
  private listCache = new Map<string, Observable<PagedResult<BranchListItem>>>();
  private allCache$: Observable<BranchListItem[]> | null = null;

  constructor(private http: HttpClient) {}

  getList(filter: BranchListFilter = {}): Observable<PagedResult<BranchListItem>> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number | boolean);
      }
      cached = this.http.get<PagedResult<BranchListItem>>(`${this.base}/list`, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getAll(): Observable<BranchListItem[]> {
    if (!this.allCache$) {
      // shareReplay(1) يُخزِّن الخطأ نفسه أيضاً ويعيده لكل مشترك جديد إن فشل الطلب مرة
      // واحدة (مثلاً بسبب انقطاع مؤقت أو مشكلة توكن سابقة) — بدون catchError هنا يبقى
      // كل استدعاء لاحق لـ getAll() يفشل بصمت للأبد حتى إعادة تحميل الصفحة كاملة.
      this.allCache$ = this.http.get<BranchListItem[]>(`${this.base}/all`).pipe(
        shareReplay(1),
        catchError(err => { this.allCache$ = null; return throwError(() => err); }),
      );
    }
    return this.allCache$;
  }

  getById(id: string): Observable<BranchDetail> {
    return this.http.get<BranchDetail>(`${this.base}/${id}`);
  }

  // GET /Branches/BranchWithWarehouses?BranchId={id} — مخازن فرع محدَّد فقط، لا كل المخازن.
  getBranchWithWarehouses(branchId: string): Observable<BranchWithWarehouses> {
    const params = new HttpParams().set('BranchId', branchId);
    return this.http.get<BranchWithWarehouses>(`${this.base}/BranchWithWarehouses`, { params });
  }

  create(dto: CreateBranchDto): Observable<BranchDetail> {
    return this.http.post<BranchDetail>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  update(branchId: string, dto: UpdateBranchDto): Observable<BranchDetail> {
    return this.http.put<BranchDetail>(`${this.base}/${branchId}`, dto).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.listCache.clear();
    this.allCache$ = null;
  }
}
