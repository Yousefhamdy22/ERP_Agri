import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminRegisterDto, AuthResult, AuthTokenInfo, AuthUser } from '../models/auth.model';

const ADMIN_USER_TYPE = 1;
const STAFF_USER_TYPE = 2;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/Auth`;
  readonly refreshTokenUrl = `${this.base}/refresh-token`;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private _user: AuthUser | null = this.readStoredUser();
  private refreshInFlight$: Observable<AuthResult> | null = null;

  constructor(private http: HttpClient) {}

  get user(): AuthUser | null { return this._user; }
  get userId(): string | null { return this._user?.id ?? null; }

  // البيع بالسالب (وقيود أخرى مستقبلاً) يعتمد على هذا — يتحقق من userType الرقمي
  // (المصدر الأساسي) وأيضاً roles النصية احتياطاً لو رجع الباك ايند أحدهما فقط دون الآخر.
  get isAdmin(): boolean {
    const u = this._user;
    if (!u) return false;
    if (u.userType === ADMIN_USER_TYPE) return true;
    return !!u.roles?.some(r => r.toLowerCase() === 'admin');
  }

  get isStaff(): boolean {
    const u = this._user;
    if (!u) return false;
    if (u.userType === STAFF_USER_TYPE) return true;
    return !!u.roles?.some(r => r.toLowerCase() === 'staff');
  }

  get canSeeCostPrice(): boolean {
    return this.isAdmin;
  }

  get canAccessAccounting(): boolean {
    return this.isAdmin;
  }

  get canViewStatements(): boolean {
    return this.isAdmin;
  }

  get isAuthenticated(): boolean {
    if (!this.isBrowser || !localStorage.getItem('token')) return false;
    if (this.isTokenExpired()) { this.logout(); return false; }
    return true;
  }

  private isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return false;
    const expiryTime = Date.parse(expiresAt);
    return !Number.isNaN(expiryTime) && expiryTime <= Date.now();
  }

  // واجهة تسجيل الدخول تعرض email + password فقط؛ باقي حقول AdminLoginCommand
  // (deviceName/deviceId/ipAddress/userAgent/rememberMe/expectedUserType) تُملأ هنا.
  login(email: string, password: string): Observable<AuthResult> {
    const body = {
      email,
      password,
      deviceName: this.deviceName(),
      deviceId: this.deviceId(),
      ipAddress: '',
      userAgent: this.isBrowser ? navigator.userAgent : '',
      rememberMe: true,
      expectedUserType: ADMIN_USER_TYPE,
    };
    return this.http.post<AuthResult>(`${this.base}/Admin-Login`, body).pipe(
      tap(res => { if (res.succeeded && res.token?.accessToken && res.user) this.setSession(res.token, res.user); }),
    );
  }

  register(dto: AdminRegisterDto): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/Admin-Register`, dto).pipe(
      tap(res => { if (res.succeeded && res.token?.accessToken && res.user) this.setSession(res.token, res.user); }),
    );
  }

  // يُستدعى من httpErrorInterceptor عند 401 قبل تسجيل الخروج مباشرة. مُشارَك (shareReplay)
  // بين النداءات المتزامنة حتى لا تُطلق عدة طلبات refresh-token في نفس اللحظة عندما تفشل
  // أكثر من استجابة HTTP بـ 401 معاً.
  refreshAccessToken(): Observable<AuthResult> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const accessToken = this.isBrowser ? localStorage.getItem('token') : null;
    const refreshToken = this.isBrowser ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken || !accessToken) return throwError(() => new Error('No refresh token available'));

    this.refreshInFlight$ = this.http.post<AuthResult>(this.refreshTokenUrl, { refreshToken, accessToken }).pipe(
      tap(res => { if (res.succeeded && res.token?.accessToken && res.user) this.setSession(res.token, res.user); }),
      finalize(() => { this.refreshInFlight$ = null; }),
      shareReplay(1),
    );
    return this.refreshInFlight$;
  }

  logout() {
    if (!this.isBrowser) return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiresAt');
    this._user = null;
  }

  private setSession(token: AuthTokenInfo, user: AuthUser) {
    this._user = user;
    if (!this.isBrowser) return;
    localStorage.setItem('token', token.accessToken);
    localStorage.setItem('refreshToken', token.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (token.expiresAt) localStorage.setItem('tokenExpiresAt', token.expiresAt);
    else localStorage.removeItem('tokenExpiresAt');
  }

  private readStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  }

  private deviceName(): string {
    return this.isBrowser ? navigator.userAgent.slice(0, 60) : '';
  }

  private deviceId(): string {
    if (!this.isBrowser) return '';
    let id = localStorage.getItem('deviceId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('deviceId', id); }
    return id;
  }
}
