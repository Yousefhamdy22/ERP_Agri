import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreateSalesReturnDto, SalesReturnDetailsDto, SalesReturnListResponse } from '../models/sales-return.model';

@Injectable({ providedIn: 'root' })
export class SalesReturnService {
  private base = `${environment.apiUrl}/SalesReturns`;

  private allCache: Observable<SalesReturnListResponse> | null = null;

  constructor(private http: HttpClient) {}

  create(dto: CreateSalesReturnDto): Observable<SalesReturnDetailsDto> {
    return this.http.post<SalesReturnDetailsDto>(`${this.base}/create`, dto).pipe(tap(() => this.invalidate()));
  }

  confirmReturn(returnId: string, periodId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${returnId}/confirm?periodId=${periodId}&userId=${userId}`, {}).pipe(tap(() => this.invalidate()));
  }

  getDetail(returnId: string): Observable<SalesReturnDetailsDto> {
    return this.http.get<SalesReturnDetailsDto>(`${this.base}/${returnId}`);
  }

  getAll(): Observable<SalesReturnListResponse> {
    if (!this.allCache) {
      this.allCache = this.http.get<SalesReturnListResponse>(`${this.base}/all`).pipe(shareReplay(1));
    }
    return this.allCache;
  }

  private invalidate() {
    this.allCache = null;
  }
}
