import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpParams, HttpResponse } from '@angular/common/http';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, expand, filter, map, reduce, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { CreateProductDto, CreateProductPriceDto, MeasureUnit, ProductByWarehouseItem, ProductColor, ProductDetail, ProductListItem, ProductOption, UpdateCurrentPriceDto, UpdateProductDto } from '../models/product.model';
import { ImportProductsRequest, ImportProductsResult } from '../models/import.model';

export type ImportProgressEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; result: ImportProductsResult };

export interface ProductListFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  includeSubCategories?: boolean;
  sortBy?: string;
  sortAscending?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortByPrice?: 'cost' | 'sell';
}

// مطابق حرفياً لـ GetProductsByWarehouseQuery(WarehouseId, Page, PageSize, Search, CategoryId)
// المؤكَّد حياً من المستخدم (2026-08-01) — أضيق عمداً من ProductListFilter العام: هذا الـ
// endpoint لا يقبل isActive/sortBy/minPrice/... إطلاقاً، فلا تُرسَل حقول غير مدعومة.
export interface ProductByWarehouseFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = `${environment.apiUrl}/Products`;

  // نفس فكرة تخزين شجرة المجموعات: كل رجوع لنفس صفحة/فلتر من "ادارة الأصناف" كان
  // يعيد الطلب من الـ API من جديد. تُخزَّن هنا نتيجة كل تركيبة (فلتر + صفحة) على
  // حدة، وتُفرَّغ بالكامل فقط بعد إضافة صنف جديد (لأن الأعداد الكلية تتغيّر حينها).
  private listCache = new Map<string, Observable<PagedResult<ProductListItem>>>();

  // تخزين مؤقت للدروب داون الافتراضي للمنتجات لتسريع فتح وإضافة فواتير المبيعات والمشتريات
  private dropdownCache$: Observable<ProductOption[]> | null = null;

  constructor(private http: HttpClient) {}

  // المسار الصحيح المؤكَّد هو GET /api/Products مباشرة (بدون لاحقة /list) — استخدام
  // /Products/list كان يُوجَّه من طرف الباك ايند إلى GET /Products/{id} فيفشل تحويل
  // "list" إلى Guid (400: "The value 'list' is not valid").
  getList(filter: ProductListFilter = {}): Observable<PagedResult<ProductListItem>> {
    const key = JSON.stringify(filter);
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      for (const [k, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number | boolean);
      }
      cached = this.http.get<PagedResult<ProductListItem>>(this.base, { params }).pipe(shareReplay(1));
      this.listCache.set(key, cached);
    }
    return cached;
  }

  // GET /Products/by-warehouse/{warehouseId} — يُستخدم بدل getList() العام عند اختيار المستخدم
  // مخزناً محدَّداً بالفعل (فواتير المبيعات/المشتريات): يعرض فقط الأصناف المُسجَّلة فعلياً بهذا
  // المخزن بدل كل الأصناف في النظام. مؤكَّد حياً 2026-07-29: الشكل ProductByWarehouseItem
  // (مختلف عن ProductListItem — انظر تعليق النموذج). الفلتر ProductByWarehouseFilter
  // (page/pageSize/search/categoryId) مطابق حرفياً لمعاملات GetProductsByWarehouseQuery.
  getByWarehouse(warehouseId: string, filter: ProductByWarehouseFilter = {}): Observable<PagedResult<ProductByWarehouseItem>> {
    let params = new HttpParams();
    for (const [k, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(k, value as string | number);
    }
    return this.http.get<PagedResult<ProductByWarehouseItem>>(`${this.base}/by-warehouse/${warehouseId}`, { params });
  }

  // يجلب كل الصفحات (لا صفحة واحدة فقط) لنفس فلتر getByWarehouse — للتصدير (Excel/PDF)
  // حيث يجب أن يشمل الملف كل الأصناف المطابقة للبحث الحالي، لا الصفحة المعروضة فقط.
  getAllByWarehouse(warehouseId: string, filter: Pick<ProductByWarehouseFilter, 'search' | 'categoryId'> = {}): Observable<ProductByWarehouseItem[]> {
    const pageSize = 200;
    const fetchPage = (page: number) => this.getByWarehouse(warehouseId, { ...filter, page, pageSize });
    return fetchPage(1).pipe(
      expand(r => r.hasNextPage ? fetchPage(r.page + 1) : EMPTY),
      reduce((acc: ProductByWarehouseItem[], r) => acc.concat(r.items), []),
    );
  }

  getById(id: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.base}/${id}`);
  }

  getAllForDropdown(includeInactive = false, categoryId?: string, orderByName = true): Observable<ProductOption[]> {
    const isDefault = !includeInactive && !categoryId && orderByName;
    if (isDefault && this.dropdownCache$) {
      return this.dropdownCache$;
    }

    let params = new HttpParams()
      .set('includeInactive', includeInactive)
      .set('orderByName', orderByName);
    if (categoryId) params = params.set('categoryId', categoryId);

    const req$ = this.http.get<ProductOption[]>(`${this.base}/all`, { params });

    if (isDefault) {
      this.dropdownCache$ = req$.pipe(
        shareReplay(1),
        catchError(err => {
          this.dropdownCache$ = null;
          return throwError(() => err);
        })
      );
      return this.dropdownCache$;
    }
    return req$;
  }

  // GET /api/Products/measeure-unit — مسار مؤكَّد من المستخدم حرفياً (بما فيه الخطأ
  // الإملائي)، شكل الاستجابة (MeasureUnit[]) غير مؤكَّد بعد.
  private measureUnitsCache$: Observable<MeasureUnit[]> | null = null;
  getMeasureUnits(): Observable<MeasureUnit[]> {
    if (!this.measureUnitsCache$) {
      this.measureUnitsCache$ = this.http.get<MeasureUnit[]>(`${this.base}/measeure-unit`).pipe(
        shareReplay(1),
        catchError(err => { this.measureUnitsCache$ = null; return throwError(() => err); }),
      );
    }
    return this.measureUnitsCache$;
  }

  // GET /api/Products/colors — تأكيد حي 2026-07-13. لا يوجد endpoint لإنشاء لون جديد،
  // هذه قائمة ثابتة يُختار منها فقط.
  private colorsCache$: Observable<ProductColor[]> | null = null;
  getColors(): Observable<ProductColor[]> {
    if (!this.colorsCache$) {
      this.colorsCache$ = this.http.get<ProductColor[]>(`${this.base}/colors`).pipe(
        shareReplay(1),
        catchError(err => { this.colorsCache$ = null; return throwError(() => err); }),
      );
    }
    return this.colorsCache$;
  }

  create(dto: CreateProductDto): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  update(id: string, dto: UpdateProductDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, dto).pipe(tap(() => this.invalidate()));
  }

  addPrice(productId: string, dto: CreateProductPriceDto): Observable<void> {
    return this.http.post<void>(`${this.base}/${productId}/prices`, dto).pipe(tap(() => this.invalidate()));
  }

  bulkDelete(productIds: string[], forceDelete = false): Observable<{ deletedCount: number; failures: Array<{ productId: string; reason: string }> }> {
    return this.http.post<{ deletedCount: number; failures: Array<{ productId: string; reason: string }> }>(`${this.base}/bulk-delete`, { productIds, forceDelete }).pipe(tap(() => this.invalidate()));
  }

  deleteProduct(id: string, forceDelete = false): Observable<{ deletedCount: number; failures: Array<{ productId: string; reason: string }> }> {
    const params = new HttpParams().set('forceDelete', forceDelete);
    return this.http.delete<{ deletedCount: number; failures: Array<{ productId: string; reason: string }> }>(`${this.base}/${id}`, { params }).pipe(tap(() => this.invalidate()));
  }

  updateCurrentPrice(productId: string, dto: UpdateCurrentPriceDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${productId}/prices/current`, dto).pipe(tap(() => this.invalidate()));
  }

  // reportProgress+observe:'events' يسمح بعرض نسبة الرفع الفعلية للملفات الكبيرة بدل
  // مؤشر تحميل غير محدَّد فقط — مفيد هنا تحديداً لأن ملفات الإكسيل قد تصل لعدة ميجابايت.
  importExcel(req: ImportProductsRequest): Observable<ImportProgressEvent> {
    const form = new FormData();
    form.append('file', req.file);
    form.append('branchId', req.branchId);
    form.append('overwriteExisting', String(req.overwriteExisting));
    form.append('createIfNotExist', String(req.createIfNotExist));
    form.append('defaultMarkupPercentage', String(req.defaultMarkupPercentage));
    form.append('createSalePriceAutomatically', String(req.createSalePriceAutomatically));
    return this.http.post<ImportProductsResult>(`${this.base}/excel-import`, form, { reportProgress: true, observe: 'events' }).pipe(
      filter(event => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event): ImportProgressEvent => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { kind: 'progress', percent };
        }
        this.invalidate();
        return { kind: 'done', result: (event as HttpResponse<ImportProductsResult>).body! };
      }),
    );
  }

  bulkUpdateStockExcel(file: File, branchId: string, warehouseId: string): Observable<BulkUpdateStockProgressEvent> {
    const form = new FormData();
    form.append('file', file);
    form.append('branchId', branchId);
    form.append('warehouseId', warehouseId);
    return this.http.post<StockBulkUpdateResult>(`${this.base}/excel-bulk-update-quantity`, form, { reportProgress: true, observe: 'events' }).pipe(
      filter(event => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event): BulkUpdateStockProgressEvent => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          return { kind: 'progress', percent };
        }
        this.invalidate();
        return { kind: 'done', result: (event as HttpResponse<StockBulkUpdateResult>).body! };
      }),
    );
  }

  getLowStock(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/low-stock`);
  }

  private invalidate() {
    this.listCache.clear();
    this.dropdownCache$ = null;
  }
}

export interface StockBulkUpdateError {
  rowNumber: number;
  sku: string;
  errorMessage: string;
}

export interface StockBulkUpdateResult {
  total: number;
  updated: number;
  skipped: number;
  errors: StockBulkUpdateError[];
}

export type BulkUpdateStockProgressEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; result: StockBulkUpdateResult };
