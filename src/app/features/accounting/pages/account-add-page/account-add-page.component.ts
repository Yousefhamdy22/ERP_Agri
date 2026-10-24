import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { AccountService } from '../../../../shared/services/account.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FlatAccountNode } from '../../../../shared/models/account.model';
import { AccountType, NormalBalance, ACCOUNT_TYPE_LABELS, NORMAL_BALANCE_LABELS } from '../../../../shared/models/accounting-enums.model';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-account-add-page',
  templateUrl: './account-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, TreeSelectComponent, CustomSelectComponent,],
})
export class AccountAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  saving = false;
  flatAccounts: FlatAccountNode[] = [];

  quickActions = ACCOUNTING_QUICK_ACTIONS;
  topButton = { label: 'ادارة دليل الحسابات', icon: 'fa-solid fa-table-list', route: '/accounting/accounts/manage' };

  typeOptions = (Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([value, label]) => ({ value, label }));
  balanceOptions = (Object.entries(NORMAL_BALANCE_LABELS) as [NormalBalance, string][]).map(([value, label]) => ({ value, label }));

  get accountOptions(): TreeSelectOption[] {
    return this.flatAccounts.map(a => ({ value: a.id, label: `${a.accountCode} — ${a.nameAr}`, level: a.level }));
  }

  form = this.fb.group({
    accountCode: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    nameAr: ['', [Validators.required, Validators.minLength(2)]],
    type: ['Asset' as AccountType, Validators.required],
    normalBalance: ['Debit' as NormalBalance, Validators.required],
    parentAccountId: [null as string | null],
  });

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'دليل الحسابات', route: '/sales?module=accounts&tab=def' },
    { label: 'اضافة حساب' },
  ];

  constructor(
    private accountService: AccountService,
    private notify: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.accountService.getTree().subscribe({
      next: tree => { this.flatAccounts = AccountService.flattenTree(tree); },
      error: () => this.notify.error('تعذّر تحميل شجرة الحسابات (لن تتمكن من اختيار حساب رئيسي)'),
    });

    // يصل عبر شجرة الحسابات عند الضغط على "إضافة حساب فرعي" لحساب مُحدَّد — يُعبّأ الحساب
    // الرئيسي مسبقاً بدل تركه فارغاً.
    const parentAccountId = this.route.snapshot.queryParamMap.get('parentAccountId');
    if (parentAccountId) {
      this.form.patchValue({ parentAccountId });
      this.fetchNextCode(parentAccountId);
    }

    // Auto-suggest next account code on parent change
    this.form.get('parentAccountId')?.valueChanges.subscribe(parentId => {
      this.fetchNextCode(parentId);
    });
  }

  fetchNextCode(parentId: string | null) {
    if (!parentId) return;
    this.accountService.getNextAccountCode(parentId).subscribe({
      next: res => {
        if (res && res.nextCode) {
          this.form.patchValue({ accountCode: res.nextCode });
        }
      },
      error: () => { /* Silent fallback: user can type manually */ }
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
    this.accountService.create({
      accountCode: v.accountCode!.trim(),
      name: v.name!.trim(),
      nameAr: v.nameAr!.trim(),
      type: v.type!,
      normalBalance: v.normalBalance!,
      parentAccountId: v.parentAccountId || null,
      isSystem: false,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة الحساب بنجاح');
        this.router.navigate(['/accounting/accounts/manage']);
      },
      error: () => {
        this.notify.error('تعذّر إضافة الحساب');
        this.saving = false;
      },
    });
  }
}
