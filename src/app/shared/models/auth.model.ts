export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  customerCode?: string | null;
  userType?: number;
  roles?: string[];
  profilePhotoUrl?: string | null;
  phoneNumber?: string | null;
  emailConfirmed?: boolean;
  phoneNumberConfirmed?: boolean;
  twoFactorEnabled?: boolean;
  preferredLanguage?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
}

// token ليس نصاً مباشراً بل كائن — تم تأكيده حياً من استجابة Admin-Login الفعلية.
// تخزين res.token مباشرة كسلسلة نصية (كما كان سابقاً) ينتج "[object Object]" في
// localStorage، وهو ما تسبب فعلياً في Authorization: Bearer [object Object] وفشل
// المصادقة في الباك ايند رغم إرسال الهيدر.
export interface AuthTokenInfo {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  issuedAt: string;
}

// Shape returned by both /api/Auth/Admin-Login and /api/Auth/Admin-Register
export interface AuthResult {
  succeeded: boolean;
  message?: string | null;
  errors?: string[] | null;
  token?: AuthTokenInfo | null;
  user?: AuthUser | null;
  metadata?: Record<string, unknown>;
}

// Fields the login form itself collects — everything else in AdminLoginDto
// (device/session info) is filled in by AuthService, not shown in the UI.
export interface AdminRegisterDto {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
