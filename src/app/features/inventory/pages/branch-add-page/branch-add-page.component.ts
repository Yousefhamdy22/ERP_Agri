import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { BranchService } from '../../services/branch.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { BranchType, CurrencyType, BRANCH_TYPE_LABELS, CURRENCY_LABELS } from '../../models/branch.model';
import { WAREHOUSES_QUICK_ACTIONS } from '../../../../shared/data/warehouses-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-branch-add-page',
  templateUrl: './branch-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class BranchAddPageComponent {
  private fb = inject(FormBuilder);
  saving = false;

  quickActions = WAREHOUSES_QUICK_ACTIONS;
  topButton = { label: 'ادارة الفروع', icon: 'fa-solid fa-table-list', route: '/inventory/branches/manage' };

  branchTypes = Object.entries(BRANCH_TYPE_LABELS).map(([k, v]) => ({ value: +k as BranchType, label: v }));
  currencies = Object.entries(CURRENCY_LABELS).map(([k, v]) => ({ value: +k as CurrencyType, label: v }));

  form = this.fb.group({
    name: ['', [Validators.required]],
    code: [''],
    city: [''],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    managerName: [''],
    isHeadquarters: [false],
    branchType: [BranchType.Retail],
    currency: [CurrencyType.EGP],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'المخازن', route: '/inventory?module=warehouses&tab=def' },
    { label: 'اضافة فرع' },
  ];

  constructor(
    private branchService: BranchService,
    private notify: NotificationService,
    private router: Router,
  ) {}

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    this.branchService.create({
      name: v.name!,
      code: v.code || undefined,
      city: v.city || undefined,
      address: v.address || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
      managerName: v.managerName || undefined,
      isHeadquarters: v.isHeadquarters ?? false,
      branchType: v.branchType != null ? Number(v.branchType) : undefined,
      currency: v.currency != null ? Number(v.currency) : undefined,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة الفرع بنجاح');
        this.router.navigate(['/inventory/branches/manage']);
      },
      error: () => {
        this.notify.error('تعذّر إضافة الفرع');
        this.saving = false;
      },
    });
  }
}
