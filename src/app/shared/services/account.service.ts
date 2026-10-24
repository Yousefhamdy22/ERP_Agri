import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Account,
  AccountDetail,
  AccountNode,
  CreateAccountDto,
  FlatAccountNode,
  MoveAccountRequest,
  SeedAccountsResult,
} from '../models/account.model';
import { AccountType } from '../models/accounting-enums.model';

// أكواد الحسابات التجميعية (الجذرية) الخمسة الثابتة من دليل الحسابات — أُكِّدت حياً عبر
// /Accountings/All 2026-07-18 (Assets/Liabilities/Equity/Revenue/Expenses، isLeaf:false هناك).
// /Accountings/load لا يُرجع isLeaf إطلاقاً، فتُستبعَد هذه الأكواد الخمسة يدوياً هنا لمنع
// اختيار حساب تجميعي غير قابل للترحيل عليه مباشرة، دون الحاجة لطلب الشجرة الأبطأ.
const NON_POSTABLE_ROOT_CODES = new Set(['1000', '2000', '3000', '4000', '5000']);

@Injectable({ providedIn: 'root' })
export class AccountService {
  private base = `${environment.apiUrl}/Accountings`;

  private listCache: Observable<Account[]> | null = null;
  // شجرة دليل الحسابات (لصفحة "دليل الحسابات" فقط) — منفصلة عن listCache عمداً، لأن
  // /chart-of-accounts ظهر أبطأ من /load على هذه الاستضافة (نفس درس PROJECT_BACKEND_API_GAPS
  // بخصوص /Accountings/All)، فلا تُستخدَم الشجرة إلا حين يحتاجها المستخدم فعلياً هذه الصفحة.
  private treeCache$: Observable<AccountNode[]> | null = null;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Account[]> {
    if (!this.listCache) {
      this.listCache = this.http.get<Account[]>(`${this.base}/load`).pipe(
        shareReplay(1),
        catchError(err => { this.listCache = null; return throwError(() => err); }),
      );
    }
    return this.listCache;
  }

  // الحسابات القابلة فعلياً للاختيار/الترحيل — يستبعد الحسابات التجميعية الجذرية الخمسة.
  getSelectable(): Observable<Account[]> {
    return this.getAll().pipe(
      map(accounts => accounts.filter(a => !NON_POSTABLE_ROOT_CODES.has(a.accountCode))),
    );
  }

  getTree(): Observable<AccountNode[]> {
    if (!this.treeCache$) {
      this.treeCache$ = this.http.get<AccountNode[]>(`${this.base}/chart-of-accounts`).pipe(
        shareReplay(1),
        catchError(err => { this.treeCache$ = null; return throwError(() => err); }),
      );
    }
    return this.treeCache$;
  }

  create(dto: CreateAccountDto): Observable<Account> {
    return this.http.post<Account>(this.base, dto).pipe(tap(() => this.invalidate()));
  }

  // ما يلي غير مؤكَّد حياً بعد (خلافاً لـ getAll/getTree/create أعلاه) — أُضيف مطابقاً لتوثيق
  // Swagger الذي زوَّده المستخدم، ويحتاج تحقق أول استخدام فعلي قبل الاعتماد عليه بثقة كاملة.

  getById(id: string): Observable<AccountDetail> {
    return this.http.get<AccountDetail>(`${this.base}/GetById`, { params: new HttpParams().set('id', id) });
  }

  getByCode(code: string): Observable<AccountDetail> {
    return this.http.get<AccountDetail>(`${this.base}/code/${code}`);
  }

  getByType(type: AccountType): Observable<AccountDetail[]> {
    return this.http.get<AccountDetail[]>(`${this.base}/type/${type}`);
  }

  getChildren(parentId: string): Observable<AccountDetail[]> {
    return this.http.get<AccountDetail[]>(`${this.base}/${parentId}/children`);
  }

  getLeafAccounts(): Observable<AccountDetail[]> {
    return this.http.get<AccountDetail[]>(`${this.base}/leaf`);
  }

  // GET /api/Accountings/All — قائمة مسطَّحة أوسع من /load (تتضمن isLeaf/isActive/isSystem)،
  // استُخدمت مصدراً مرة واحدة لتأكيد NON_POSTABLE_ROOT_CODES أعلاه؛ غير مستخدَمة حالياً في
  // أي مكوّن، مُعرَّضة هنا لاستكمال تغطية نقاط الـ API الموثَّقة فقط.
  getAllFlat(): Observable<AccountDetail[]> {
    return this.http.get<AccountDetail[]>(`${this.base}/All`);
  }

  seed(): Observable<SeedAccountsResult> {
    return this.http.post<SeedAccountsResult>(`${this.base}/seed`, {}).pipe(tap(() => this.invalidate()));
  }

  getNextAccountCode(parentAccountId?: string | null, accountType?: number | null): Observable<{ nextCode: string }> {
    let params = new HttpParams();
    if (parentAccountId) params = params.set('parentAccountId', parentAccountId);
    if (accountType != null) params = params.set('accountType', accountType.toString());
    return this.http.get<{ nextCode: string }>(`${this.base}/next-code`, { params });
  }

  activate(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/activate`, {}).pipe(tap(() => this.invalidate()));
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/deactivate`, {}).pipe(tap(() => this.invalidate()));
  }

  move(id: string, newParentId: string): Observable<void> {
    const body: MoveAccountRequest = { newParentId };
    return this.http.post<void>(`${this.base}/${id}/move`, body).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.invalidate()));
  }

  private invalidate() {
    this.listCache = null;
    this.treeCache$ = null;
  }

  static flattenTree(nodes: AccountNode[], level = 0): FlatAccountNode[] {
    const result: FlatAccountNode[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, accountCode: node.accountCode, name: node.name, nameAr: node.nameAr, level });
      if (node.children?.length) result.push(...AccountService.flattenTree(node.children, level + 1));
    }
    return result;
  }
}
