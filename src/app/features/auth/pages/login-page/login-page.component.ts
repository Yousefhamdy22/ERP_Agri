import { ApplicationRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private appRef = inject(ApplicationRef);

  submitting = false;
  slowServer = false;
  errorMessage = '';
  showPassword = false;
  logoFailed = false;

  private slowServerTimer: ReturnType<typeof setTimeout> | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogoError(): void {
    this.logoFailed = true;
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.slowServer = false;
    this.errorMessage = '';
    const v = this.form.value;

    // الخادم قد يكون نائماً (استضافة مجانية) فيأخذ أول طلب وقتاً طويلاً؛ بعد 4 ثوانٍ
    // نُعلم المستخدم أن هذا طبيعي بدل ترك الشاشة تبدو معلّقة بلا تفسير. التطبيق zoneless
    // فـ setTimeout لا يُشغّل الكشف عن التغييرات تلقائياً، لذا نستدعي tick() يدوياً.
    this.slowServerTimer = setTimeout(() => {
      this.slowServer = true;
      try {
        this.appRef.tick();
      } catch {
        /* تجاهل: tick قيد التنفيذ بالفعل */
      }
    }, 4000);

    this.auth.login(v.email!, v.password!).subscribe({
      next: (res) => {
        this.stopSlowServerTimer();
        this.submitting = false;
        if (!res.succeeded) {
          this.errorMessage = res.message || res.errors?.[0] || 'تعذّر تسجيل الدخول، يرجى التأكد من البريد وكلمة المرور';
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('/login') ? returnUrl : '/dashboard';
        this.router.navigateByUrl(target);
      },
      error: () => {
        this.stopSlowServerTimer();
        this.submitting = false;
        this.errorMessage = 'تعذّر الاتصال بالخادم، يرجى التأكد من الاتصال بالشبكة أو محاولة الخدمة لاحقاً';
      },
    });
  }

  private stopSlowServerTimer(): void {
    if (this.slowServerTimer) {
      clearTimeout(this.slowServerTimer);
      this.slowServerTimer = null;
    }
    this.slowServer = false;
  }
}
