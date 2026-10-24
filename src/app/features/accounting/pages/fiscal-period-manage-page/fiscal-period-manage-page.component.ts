import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod, FiscalPeriodStatus } from '../../../../shared/models/fiscal-period.model';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | FiscalPeriodStatus;

@Component({
  selector: 'app-fiscal-period-manage-page',
  templateUrl: './fiscal-period-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class FiscalPeriodManagePageComponent implements OnInit {
  allPeriods: FiscalPeriod[] = [];
  loading = false;
  refreshing = false;
  loadError = false;

  status: StatusFilter = '';
  search = '';

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    { value: 'Open', label: 'مفتوحة' },
    { value: 'Closed', label: 'مغلقة' },
  ];

  quickActions = ACCOUNTING_QUICK_ACTIONS;
  topButton = { label: 'اضافة فترة مالية', icon: 'fa-solid fa-plus', route: '/accounting/fiscal-periods/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الحسابات', route: '/sales?module=accounts&tab=def' },
    { label: 'ادارة الفترات المالية' },
  ];

  actionLoading = false;
  actioningPeriod: FiscalPeriod | null = null;
  actionType: 'close' | 'reopen' | null = null;
  actionNote = '';

  constructor(
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
  }

  get periods(): FiscalPeriod[] {
    return this.allPeriods.filter(p => {
      if (this.status && p.status !== this.status) return false;
      if (this.search) {
        const q = this.search.trim().toLowerCase();
        if (!p.periodCode.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  load() {
    this.loading = this.allPeriods.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        this.allPeriods = periods;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل الفترات المالية');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  statusLabel(s: FiscalPeriodStatus): string { return s === 'Open' ? 'مفتوحة' : 'مغلقة'; }
  statusBadgeClass(s: FiscalPeriodStatus): string {
    return s === 'Open' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800';
  }

  openAction(period: FiscalPeriod, type: 'close' | 'reopen') {
    this.actioningPeriod = period;
    this.actionType = type;
    this.actionNote = '';
  }

  closeAction() {
    this.actioningPeriod = null;
    this.actionType = null;
    this.actionNote = '';
  }

  confirmAction() {
    if (!this.actioningPeriod || !this.actionType) return;
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن تنفيذ العملية: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }
    if (!this.actionNote.trim()) {
      this.notify.error('أدخل ملاحظة أولاً');
      return;
    }

    this.actionLoading = true;
    const call = this.actionType === 'close'
      ? this.fiscalPeriodService.close(this.actioningPeriod.id, userId, this.actionNote.trim())
      : this.fiscalPeriodService.reopen(this.actioningPeriod.id, userId, this.actionNote.trim());

    call.subscribe({
      next: () => {
        this.notify.success(this.actionType === 'close' ? 'تم إغلاق الفترة المالية' : 'تم إعادة فتح الفترة المالية');
        this.actionLoading = false;
        this.closeAction();
        this.load();
      },
      error: () => {
        this.notify.error(this.actionType === 'close' ? 'تعذّر إغلاق الفترة المالية' : 'تعذّر إعادة فتح الفترة المالية');
        this.actionLoading = false;
      },
    });
  }
}
