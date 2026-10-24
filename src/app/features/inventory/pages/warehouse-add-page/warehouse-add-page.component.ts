import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { BranchService } from '../../services/branch.service';
import { BranchListItem } from '../../models/branch.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { WAREHOUSES_QUICK_ACTIONS } from '../../../../shared/data/warehouses-quick-actions';
import { AccountService } from '../../../../shared/services/account.service';
import { Account } from '../../../../shared/models/account.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-warehouse-add-page',
  templateUrl: './warehouse-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class WarehouseAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  saving = false;
  branches: BranchListItem[] = [];
  // حسابات المخزون (نوع Asset، كود يبدأ بـ 16 — فرع حساب 1600 المخزون في دليل الحسابات)
  // لاختيار حساب مخزون مخصَّص لهذا المخزن، بطلب المستخدم 2026-08-15. اختياري.
  inventoryAccounts: Account[] = [];

  quickActions = WAREHOUSES_QUICK_ACTIONS;
  topButton = { label: 'ادارة المخازن', icon: 'fa-solid fa-table-list', route: '/inventory/warehouses/manage' };

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'المخازن', route: '/inventory?module=warehouses&tab=def' },
    { label: 'اضافة مخزن' },
  ];

  form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.minLength(2)]],
    location: [''],
    branchId: ['', Validators.required],
    allowNegativeStock: [true],
    inventoryAccountId: [''],
  });

  constructor(
    private warehouseService: WarehouseService,
    private branchService: BranchService,
    private accountService: AccountService,
    private notify: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.form.value.branchId) this.form.patchValue({ branchId: b[0].id }); },
      error: () => { this.notify.error('تعذّر تحميل قائمة الفروع'); },
    });
    this.accountService.getSelectable().subscribe({
      next: accounts => { this.inventoryAccounts = accounts.filter(a => a.accountCode.startsWith('16')); },
      error: () => {},
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    this.warehouseService.create({
      nameAr: v.nameAr!,
      name: v.nameAr!,
      location: v.location || null,
      branchId: v.branchId!,
      allowNegativeStock: v.allowNegativeStock ?? true,
      inventoryAccountId: v.inventoryAccountId || null,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة المخزن بنجاح');
        this.router.navigate(['/inventory/warehouses/manage']);
      },
      error: () => {
        this.notify.error('تعذّر إضافة المخزن');
        this.saving = false;
      },
    });
  }
}
