import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreatePurchaseReturnDto, PurchaseReturnDetailsDto, PurchaseReturnListResponse } from '../models/purchase-return.model';

@Injectable({ providedIn: 'root' })
export class PurchaseReturnService {
  private base = `${environment.apiUrl}/PurchaseReturns`;

  private allCache: Observable<PurchaseReturnListResponse> | null = null;

  constructor(private http: HttpClient) {}

  create(dto: CreatePurchaseReturnDto): Observable<PurchaseReturnDetailsDto> {
    return this.http.post<PurchaseReturnDetailsDto>(`${this.base}/create`, dto).pipe(tap(() => this.invalidate()));
  }

  confirmReturn(returnId: string, periodId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${returnId}/confirm?periodId=${periodId}&userId=${userId}`, {}).pipe(tap(() => this.invalidate()));
  }

  getDetail(returnId: string): Observable<PurchaseReturnDetailsDto> {
    return this.http.get<PurchaseReturnDetailsDto>(`${this.base}/${returnId}`);
  }

  getAll(): Observable<PurchaseReturnListResponse> {
    if (!this.allCache) {
      this.allCache = this.http.get<PurchaseReturnListResponse>(`${this.base}/all`).pipe(shareReplay(1));
    }
    return this.allCache;
  }

  private invalidate() {
    this.allCache = null;
  }
}
