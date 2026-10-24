import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreateWarehouseDto, Warehouse, WarehouseDetail } from '../models/warehouse.model';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private base = `${environment.apiUrl}/Warehouses`;

  private allCache$: Observable<Warehouse[]> | null = null;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Warehouse[]> {
    if (!this.allCache$) {
      this.allCache$ = this.http.get<Warehouse[]>(this.base).pipe(
        shareReplay(1),
        catchError(err => { this.allCache$ = null; return throwError(() => err); }),
      );
    }
    return this.allCache$;
  }

  getById(id: string): Observable<WarehouseDetail> {
    return this.http.get<WarehouseDetail>(`${this.base}/${id}`);
  }

  create(dto: CreateWarehouseDto): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.allCache$ = null;
  }
}
