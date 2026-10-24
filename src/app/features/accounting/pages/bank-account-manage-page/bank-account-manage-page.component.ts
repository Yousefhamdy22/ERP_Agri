import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { BankAccountService } from '../../services/bank-account.service';
import { BankAccount, BankAccountDetail, BankAccountWithBranch } from '../../models/bank-account.model';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;

@Component({
  selector: 'app-bank-account-manage-page',
  templateUrl: './bank-account-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class BankAccountManagePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankAccountService = inject(BankAccountService);
  private branchService = inject(BranchService);
  private notify = inject(NotificationService);

  branches: BranchListItem[] = [];
  private allAccounts: BankAccountWithBranch[] = [];
  accounts: BankAccountWithBranch[] = [];
  loading = false;
  loadError = false;
  skeletonRows = [1, 2, 3, 4, 5];

  search = '';
  branchFilter = '';

  showCreateModal = false;
  creating = false;
  createForm = this.fb.group({
    bankName: ['', [Validators.required, Validators.minLength(2)]],
    bankNameAr: ['', [Validators.required, Validators.minLength(2)]],
    accountName: ['', Validators.required],
    accountNumber: ['', Validators.required],
    iban: ['', [Validators.pattern(IBAN_PATTERN)]],
    branchId: ['', Validators.required],
    type: [1, Validators.required],
  });

  // Edit state
  showEditModal = false;
  editing = false;
  editTarget: BankAccountWithBranch | null = null;
  editForm = this.fb.group({
    bankName: ['', [Validators.required, Validators.minLength(2)]],
    bankNameAr: ['', [Validators.required, Validators.minLength(2)]],
    accountName: ['', Validators.required],
    accountNumber: ['', Validators.required],
    iban: ['', [Validators.pattern(IBAN_PATTERN)]],
    isActive: [true],
  });

  // Delete state
  showDeleteModal = false;
  deleting = false;
  deleteTarget: BankAccountWithBranch | null = null;

  showDetailsModal = false;
  detailAccount: BankAccountDetail | null = null;
  detailLoading = false;
  detailError = false;

  quickActions = ACCOUNTING_QUICK_ACTIONS;

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الخزائن والحسابات البنكية' },
    { label: 'ادارة الحسابات البنكية' },
  ];

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.loading = true;
    this.loadError = false;
    this.branchService.getAll().subscribe({
      next: branches => {
        this.branches = branches.filter(b => b.isActive !== false);
        if (!this.branches.length) {
          this.allAccounts = [];
          this.applyFilters();
          this.loading = false;
          return;
        }
        forkJoin(this.branches.map(b =>
          this.bankAccountService.getByBranch(b.id).pipe(
            map(list => list.map((account): BankAccountWithBranch => ({ ...account, branchName: b.nameAr || b.name || '—' }))),
            catchError(() => of<BankAccountWithBranch[]>([])),
          )
        )).subscribe(results => {
          const accountsById = new Map<string, BankAccountWithBranch>();
          for (const list of results) {
            for (const account of list) {
              accountsById.set(account.id, account);
            }
          }
          this.allAccounts = Array.from(accountsById.values());
          this.applyFilters();
          this.loading = false;
        });
      },
      error: () => {
        this.notify.error('تعذّر تحميل الفروع');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    this.accounts = this.allAccounts.filter(a => {
      if (this.branchFilter && a.branchId !== this.branchFilter) return false;
      if (!term) return true;
      return (a.bankName || '').toLowerCase().includes(term)
        || (a.bankNameAr || '').toLowerCase().includes(term)
        || (a.accountName || '').toLowerCase().includes(term)
        || (a.accountNumber || '').toLowerCase().includes(term)
        || (a.iban || '').toLowerCase().includes(term);
    });
  }

  branchName(id: string): string {
    return this.branches.find(b => b.id === id)?.nameAr || this.branches.find(b => b.id === id)?.name || '—';
  }

  getTypeLabel(type?: number): string {
    if (type === 2) return 'إنستا باي (InstaPay)';
    if (type === 3) return 'فودافون كاش (VodafoneCash)';
    return 'بنك (Bank)';
  }

  onSearchChange(value: string) {
    this.search = value;
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!this.search.trim() || !!this.branchFilter;
  }

  resetFilters() {
    this.search = '';
    this.branchFilter = '';
    this.applyFilters();
  }

  // ── Details modal ───────────────────────────────────────────────────────────
  viewDetails(account: BankAccount) {
    this.showDetailsModal = true;
    this.detailAccount = null;
    this.detailLoading = true;
    this.detailError = false;
    this.bankAccountService.getById(account.id).subscribe({
      next: detail => {
        this.detailAccount = detail;
        this.detailLoading = false;
      },
      error: err => {
        this.detailError = true;
        this.detailLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تحميل تفاصيل الحساب'));
      },
    });
  }

  closeDetails() {
    this.showDetailsModal = false;
    this.detailAccount = null;
  }

  get detailCreatedAt(): string {
    const d = this.detailAccount as Record<string, unknown> | null;
    const v = (d?.['createdAt'] ?? d?.['createdDate'] ?? d?.['creationDate']) as string | undefined;
    return v ? new Date(v).toLocaleDateString('ar-EG') : '—';
  }

  get detailCreatedBy(): string {
    const d = this.detailAccount as Record<string, unknown> | null;
    return (d?.['createdBy'] ?? d?.['createdByName'] ?? d?.['createdByUserName']) as string || '—';
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  openEdit(a: BankAccountWithBranch) {
    this.editTarget = a;
    this.editForm.patchValue({
      bankName: a.bankName,
      bankNameAr: a.bankNameAr,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      iban: a.iban || '',
      isActive: a.isActive,
    });
    this.showEditModal = true;
  }

  closeEdit() {
    if (this.editing) return;
    this.showEditModal = false;
    this.editTarget = null;
  }

  invalidEdit(ctrl: string): boolean {
    const c = this.editForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submitEdit() {
    if (this.editForm.invalid || !this.editTarget) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.editing = true;
    this.bankAccountService.update({
      id: this.editTarget.id,
      bankName: v.bankName!.trim(),
      bankNameAr: v.bankNameAr!.trim(),
      accountName: v.accountName!.trim(),
      accountNumber: v.accountNumber!.trim(),
      iban: (v.iban || '').trim() || undefined,
      isActive: v.isActive!,
    }).subscribe({
      next: () => {
        this.editing = false;
        this.showEditModal = false;
        this.editTarget = null;
        this.notify.success('تم تعديل الحساب البنكي بنجاح');
        this.loadAccounts();
      },
      error: err => {
        this.editing = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تعديل الحساب البنكي'));
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  confirmDelete(a: BankAccountWithBranch) {
    this.deleteTarget = a;
    this.showDeleteModal = true;
  }

  closeDelete() {
    if (this.deleting) return;
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  executeDelete() {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.bankAccountService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.notify.success('تم حذف الحساب البنكي بنجاح');
        this.loadAccounts();
      },
      error: err => {
        this.deleting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف الحساب البنكي'));
      },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  openCreate() {
    this.createForm.reset({
      bankName: '',
      bankNameAr: '',
      accountName: '',
      accountNumber: '',
      iban: '',
      branchId: this.branches[0]?.id || '',
      type: 1,
    });
    this.onTypeChange();
    this.showCreateModal = true;
  }

  closeCreate() {
    if (this.creating) return;
    this.showCreateModal = false;
  }

  invalid(ctrl: string): boolean {
    const c = this.createForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onTypeChange() {
    const type = this.createForm.value.type;
    const ibanCtrl = this.createForm.get('iban');
    if (type !== 1) {
      ibanCtrl?.clearValidators();
      ibanCtrl?.setValue('');
    } else {
      ibanCtrl?.setValidators([Validators.pattern(IBAN_PATTERN)]);
    }
    ibanCtrl?.updateValueAndValidity();
  }

  submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    this.creating = true;
    this.bankAccountService.create({
      bankName: v.bankName!.trim(),
      bankNameAr: v.bankNameAr!.trim(),
      accountName: v.accountName!.trim(),
      accountNumber: v.accountNumber!.trim(),
      iban: (v.iban || '').trim(),
      branchId: v.branchId!,
      type: Number(v.type),
    }).subscribe({
      next: account => {
        this.creating = false;
        this.showCreateModal = false;
        this.notify.success(`تم إنشاء الحساب البنكي بنجاح — الحساب المحاسبي المُولَّد: ${account.accountCode}`);
        this.loadAccounts();
      },
      error: err => {
        this.creating = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إنشاء الحساب البنكي'));
      },
    });
  }
}
