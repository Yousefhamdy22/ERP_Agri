import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Category, CreateCategoryDto, FlatCategory } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private base = `${environment.apiUrl}/Categories`;

  // كل صفحة (اضافة/ادارة مجموعات، فلتر الأصناف، ...) تحتاج نفس شجرة المجموعات — كانت
  // كل واحدة تطلبها من الـ API من جديد بشكل متكرر. تُخزَّن هنا مرة واحدة وتُعاد
  // نفس النتيجة لأي مكوّن آخر يطلبها، وتُفرَّغ فقط بعد أي تعديل حقيقي (إضافة/تعديل/حذف).
  private treeCache$: Observable<Category[]> | null = null;

  constructor(private http: HttpClient) {}

  getTree(): Observable<Category[]> {
    if (!this.treeCache$) {
      this.treeCache$ = this.http.get<Category[]>(`${this.base}/tree`).pipe(shareReplay(1));
    }
    return this.treeCache$;
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.http.post<Category>(this.base, dto).pipe(tap(() => this.invalidateTree()));
  }

  update(id: string, dto: CreateCategoryDto): Observable<Category> {
    return this.http.put<Category>(`${this.base}/${id}`, dto).pipe(tap(() => this.invalidateTree()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidateTree()));
  }

  private invalidateTree() {
    this.treeCache$ = null;
  }

  static flattenTree(categories: Category[], level = 0): FlatCategory[] {
    const result: FlatCategory[] = [];
    for (const cat of categories) {
      result.push({ categoryId: cat.categoryId, name: cat.name, nameAr: cat.nameAr || cat.name, level });
      if (cat.children?.length) {
        result.push(...CategoryService.flattenTree(cat.children, level + 1));
      }
    }
    return result;
  }
}
