import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

// نهاية الفترة يجب أن تكون بعد بدايتها.
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const startDate = group.get('startDate')?.value;
  const endDate = group.get('endDate')?.value;
  if (!startDate || !endDate) return null;
  return new Date(endDate) <= new Date(startDate) ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-fiscal-period-add-page',
  templateUrl: './fiscal-period-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class FiscalPeriodAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;
  branches: BranchListItem[] = [];

  quickActions = ACCOUNTING_QUICK_ACTIONS;
  topButton = { label: 'ادارة الفترات المالية', icon: 'fa-solid fa-table-list', route: '/accounting/fiscal-periods/manage' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الحسابات', route: '/sales?module=accounts&tab=def' },
    { label: 'اضافة فترة مالية' },
  ];

  form = this.fb.group({
    periodCode: ['', Validators.required],
    description: [''],
    startDate: [new Date().toISOString().slice(0, 10), Validators.required],
    endDate: ['', Validators.required],
    branchId: [''],
  }, { validators: endAfterStart });

  constructor(
    private fiscalPeriodService: FiscalPeriodService,
    private branchService: BranchService,
    private notify: NotificationService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.branchService.getAll().subscribe({ next: b => { this.branches = b; }, error: () => {} });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get endBeforeStart(): boolean {
    const touched = this.form.get('startDate')?.touched || this.form.get('endDate')?.touched;
    return !!this.form.errors?.['endBeforeStart'] && !!touched;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ الفترة المالية: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.saving = true;
    const v = this.form.value;
    this.fiscalPeriodService.create({
      periodCode: v.periodCode!,
      description: v.description || null,
      startDate: v.startDate!,
      endDate: v.endDate!,
      branchId: v.branchId || null,
      createdByUserId: userId,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة الفترة المالية بنجاح');
        this.router.navigate(['/accounting/fiscal-periods/manage']);
      },
      error: () => {
        this.saving = false;
        this.notify.error('تعذّر إضافة الفترة المالية');
      },
    });
  }
}
