import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';

export enum InventoryPolicyType {
  Perpetual = 0,
  Periodic = 1,
}

@Component({
  selector: 'app-inventory-policy-settings',
  templateUrl: './inventory-policy-settings.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
})
export class InventoryPolicySettingsComponent implements OnInit {
  readonly PolicyType = InventoryPolicyType;

  currentPolicy: number | null = null;
  selectedPolicy: number = InventoryPolicyType.Perpetual;

  loading = false;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;

  breadcrumbs = [
    { label: 'الرئيسية', route: '/dashboard' },
    { label: 'الإعدادات', route: '/settings' },
    { label: 'سياسة الجرد' },
  ];

  constructor(
    private http: HttpClient,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPolicy();
  }

  private get apiUrl(): string {
    const base = (environment.apiUrl || '').replace(/\/+$/, '');
    return base.endsWith('/api')
      ? `${base}/settings/inventory-policy`
      : `${base}/api/settings/inventory-policy`;
  }

  loadPolicy(): void {
    this.loading = true;
    this.error = null;
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        this.loading = false;
        const val = this.extractPolicyValue(res);
        this.currentPolicy = val;
        this.selectedPolicy = val;
        try {
          localStorage.setItem('app_inventory_policy', String(val));
        } catch {}
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 404) {
          // Fallback to local storage or default 0 (Perpetual)
          const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('app_inventory_policy') : null;
          const fallbackVal = cached !== null ? Number(cached) : InventoryPolicyType.Perpetual;
          this.currentPolicy = fallbackVal;
          this.selectedPolicy = fallbackVal;

          this.error =
            'تنبيه: نقطة النهاية (api/settings/inventory-policy) غير مفعّلة في نسخة السيرفر التي تعمل حالياً (404 Not Found). تم إنشاء SettingsController.cs في مشروع Backend — يرجى إعادة تشغيل السيرفر (Restart Backend in Visual Studio) لتفعيل الـ API.';
        } else {
          this.error = friendlyErrorMessage(err, 'فشل في تحميل سياسة الجرد الحالية من الخادم');
          this.notify.error(this.error);
        }
      },
    });
  }

  savePolicy(): void {
    if (!this.isModified || this.saving || this.loading) return;

    this.saving = true;
    this.error = null;
    this.successMessage = null;

    const payload = { value: this.selectedPolicy };

    this.http.put<any>(this.apiUrl, payload).subscribe({
      next: () => {
        this.saving = false;
        this.currentPolicy = this.selectedPolicy;
        try {
          localStorage.setItem('app_inventory_policy', String(this.selectedPolicy));
        } catch {}
        const policyName =
          this.selectedPolicy === InventoryPolicyType.Perpetual
            ? 'الجرد المستمر (Perpetual)'
            : 'الجرد الدوري (Periodic)';
        this.successMessage = `تم حفظ وتطبيق سياسة ${policyName} بنجاح على السيرفر.`;
        this.notify.success(this.successMessage);
      },
      error: (err) => {
        this.saving = false;
        if (err?.status === 404) {
          try {
            localStorage.setItem('app_inventory_policy', String(this.selectedPolicy));
            this.currentPolicy = this.selectedPolicy;
            this.successMessage =
              'تم حفظ السياسة محلياً مؤقتاً. يرجى إعادة تشغيل السيرفر (Backend) في Visual Studio لاعتماد الـ Controller والربط المباشر.';
            this.notify.info(this.successMessage);
          } catch {}
        } else {
          this.error = friendlyErrorMessage(
            err,
            'حدث خطأ أثناء حفظ سياسة الجرد، يرجى المحاولة مرة أخرى'
          );
          this.notify.error(this.error);
        }
      },
    });
  }

  selectPolicy(type: number): void {
    if (this.saving) return;
    this.selectedPolicy = type;
  }

  resetSelection(): void {
    if (this.currentPolicy !== null) {
      this.selectedPolicy = this.currentPolicy;
      this.error = null;
    }
  }

  get isModified(): boolean {
    return this.currentPolicy !== null && this.selectedPolicy !== this.currentPolicy;
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }

  dismissError(): void {
    this.error = null;
  }

  private extractPolicyValue(res: any): number {
    if (typeof res === 'number') {
      return res === 1 ? InventoryPolicyType.Periodic : InventoryPolicyType.Perpetual;
    }
    if (res && typeof res.value === 'number') {
      return res.value === 1 ? InventoryPolicyType.Periodic : InventoryPolicyType.Perpetual;
    }
    if (res && typeof res.policy === 'number') {
      return res.policy === 1 ? InventoryPolicyType.Periodic : InventoryPolicyType.Perpetual;
    }
    if (res && res.data !== undefined) {
      if (typeof res.data === 'number') {
        return res.data === 1 ? InventoryPolicyType.Periodic : InventoryPolicyType.Perpetual;
      }
      if (res.data && typeof res.data.value === 'number') {
        return res.data.value === 1 ? InventoryPolicyType.Periodic : InventoryPolicyType.Perpetual;
      }
    }
    if (typeof res === 'string') {
      return res.trim() === '1' || res.toLowerCase().includes('periodic')
        ? InventoryPolicyType.Periodic
        : InventoryPolicyType.Perpetual;
    }
    if (res && typeof res.value === 'string') {
      return res.value.trim() === '1' || res.value.toLowerCase().includes('periodic')
        ? InventoryPolicyType.Periodic
        : InventoryPolicyType.Perpetual;
    }
    return InventoryPolicyType.Perpetual;
  }
}
