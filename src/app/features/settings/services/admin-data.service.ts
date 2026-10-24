import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface EntityTypeInfo {
  key: string;
  displayName: string;
  displayNameAr: string;
}

export interface DeleteResponse {
  totalDeleted: number;
  deletedEntities: { entityType: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private base = `${environment.apiUrl}/admin/data`;

  constructor(private http: HttpClient) {}

  getEntities(): Observable<EntityTypeInfo[]> {
    return this.http.get<EntityTypeInfo[]>(`${this.base}/entities`);
  }

  deleteRecord(entityKey: string, entityId: string, userId: string): Observable<DeleteResponse> {
    const params = new HttpParams().set('userId', userId);
    return this.http.delete<DeleteResponse>(`${this.base}/${entityKey}/${entityId}`, { params });
  }

  browseRecords(
    key: string,
    page: number,
    pageSize: number,
    search?: string
  ): Observable<{ items: any[]; totalCount: number }> {
    const searchTerm = search?.trim().toLowerCase() || '';

    // Check entity type and delegate to correct API route
    switch (key) {
      // ── Server-Side Paged & Searched Entities ──
      // ⚠️ لا يوجد GET /Invoices موحَّد على هذا الباك ايند إطلاقاً (مؤكَّد من sales-invoice.service.ts
      // وpurchase-invoice.service.ts) — المبيعات والمشتريات مساران منفصلان تماماً:
      // /Invoices/sales و/Invoices/purchase، بلا نقطة موحَّدة تجمعهما. هذا الفرع يعرض فواتير
      // المبيعات فقط مؤقتاً لتفادي 404 مضمون؛ فواتير المشتريات غير قابلة للتصفح/الحذف من هنا
      // حتى تُحسَم آلية عرض/حذف موحَّدة (أو مفتاح "invoice" الحقيقي من /admin/data/entities
      // يُوضِّح أيهما يقصد فعلاً — غير مؤكَّد بعد).
      case 'invoice': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/Invoices/sales`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      case 'product': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/Products`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      // ⚠️ غير مؤكَّد: CustomerService/SupplierService يُرسلان دائماً type= عند طلب /Parties
      // (لتمييز عملاء عن موردين) — غير معروف إن كان الباك ايند يرجع الطرفين معاً حين يُحذف
      // type من الاستعلام، أو يرفض الطلب، أو يرجع نوعاً افتراضياً واحداً فقط.
      case 'party': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/Parties`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      case 'payment-voucher': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/PaymentVouchers`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      case 'journal-entry': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/ManualJournal`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      case 'opening-balance': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('search', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/opening_balances/list`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }
      case 'payment': {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (searchTerm) params = params.set('searchText', searchTerm);
        return this.http.get<any>(`${environment.apiUrl}/payments/list`, { params }).pipe(
          map(res => ({
            items: res.items || [],
            totalCount: res.totalCount ?? res.total ?? (res.items?.length || 0),
          }))
        );
      }

      // ── Client-Side Entities (API returns flat array, we handle paging/filtering in frontend) ──
      // مؤكَّد حياً (CategoryService.getTree): المسار الحقيقي /Categories/tree — لا يوجد
      // GET /Categories مسطَّح بلا لاحقة. الاستجابة شجرة (children متداخلة)، ولا يوجد حقل
      // productCount ولا parentCategoryName في Category الحقيقي (انظر category.model.ts) —
      // كانا يُنتجان قيماً وهمية (0 و"—" دائماً) بدل بيانات حقيقية.
      case 'category': {
        return this.http.get<any[]>(`${environment.apiUrl}/Categories/tree`).pipe(
          map(list => {
            const flatList = this.flattenCategories(list);
            return this.applyClientPaging(flatList, page, pageSize, searchTerm, ['name', 'nameAr', 'parentCategory']);
          })
        );
      }
      case 'warehouse': {
        return this.http.get<any[]>(`${environment.apiUrl}/Warehouses`).pipe(
          map(list => this.applyClientPaging(list, page, pageSize, searchTerm, ['name', 'nameAr', 'location']))
        );
      }
      case 'account': {
        return this.http.get<any[]>(`${environment.apiUrl}/Accountings/load`).pipe(
          map(list => this.applyClientPaging(list, page, pageSize, searchTerm, ['accountCode', 'name', 'nameAr', 'type']))
        );
      }
      case 'fiscal-period': {
        return this.http.get<any[]>(`${environment.apiUrl}/FiscalPeriod`).pipe(
          map(list => this.applyClientPaging(list, page, pageSize, searchTerm, ['periodCode', 'status']))
        );
      }
      case 'branch': {
        // Try all, default to base if all doesn't exist
        return this.http.get<any[]>(`${environment.apiUrl}/Branches/all`).pipe(
          map(list => this.applyClientPaging(list, page, pageSize, searchTerm, ['code', 'name', 'city']))
        );
      }
      default:
        throw new Error(`Unsupported entity key: ${key}`);
    }
  }

  // parentName يُمرَّر من الأب أثناء النزول في الشجرة (بدل حقل parentCategoryName الوهمي
  // غير الموجود في الاستجابة الحقيقية) — عمود "عدد المنتجات" حُذف من هذا الكيان في المكوّن
  // لأنه لا يوجد مصدر حقيقي له هنا (انظر التعليق في browseRecords).
  private flattenCategories(categories: any[], level = 0, parentName = '—'): any[] {
    const result: any[] = [];
    for (const cat of categories) {
      const displayName = cat.nameAr || cat.name;
      result.push({
        id: cat.categoryId,
        categoryId: cat.categoryId,
        name: cat.name,
        nameAr: displayName,
        parentCategory: parentName,
        level,
      });
      if (cat.children?.length) {
        result.push(...this.flattenCategories(cat.children, level + 1, displayName));
      }
    }
    return result;
  }

  private applyClientPaging(
    list: any[],
    page: number,
    pageSize: number,
    searchTerm: string,
    searchableFields: string[]
  ): { items: any[]; totalCount: number } {
    let filtered = list;
    if (searchTerm) {
      filtered = list.filter(item =>
        searchableFields.some(field => {
          const val = item[field];
          return val != null && String(val).toLowerCase().includes(searchTerm);
        })
      );
    }
    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);
    return {
      items,
      totalCount: filtered.length,
    };
  }
}
