import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { BranchService } from '../../services/branch.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { BranchListItem, BranchDetail, BranchType, CurrencyType, BRANCH_TYPE_LABELS, CURRENCY_LABELS } from '../../models/branch.model';
import { WAREHOUSES_QUICK_ACTIONS } from '../../../../shared/data/warehouses-quick-actions';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/custom-select/custom-select.component';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-branch-manage-page',
  templateUrl: './branch-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class BranchManagePageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  branches: BranchListItem[] = [];
  loading = false;
  saving = false;
  loadingDetail = false;

  search = '';
  branchType = '';
  activeFilter: ActiveFilter = 'all';

  page = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 1;
  hasNextPage = false;
  hasPreviousPage = false;

  quickActions = WAREHOUSES_QUICK_ACTIONS;
  topButton = { label: 'اضافة فرع', icon: 'fa-solid fa-code-branch', route: '/inventory/branches/add' };

  branchTypes = Object.entries(BRANCH_TYPE_LABELS).map(([k, v]) => ({ value: +k as BranchType, label: v }));
  currencies = Object.entries(CURRENCY_LABELS).map(([k, v]) => ({ value: +k as CurrencyType, label: v }));

  get branchTypeOptions(): { value: string; label: string }[] {
    return [
      { value: '', label: 'كل الأنواع' },
      ...Object.entries(BRANCH_TYPE_LABELS).map(([k, v]) => ({ value: String(k), label: v })),
    ];
  }

  editingBranch: BranchDetail | null = null;

  editForm = this.fb.group({
    nameAr: ['', [Validators.required, Validators.minLength(2)]],
    name: [''],
    code: ['', [Validators.required]],
    city: [''],
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    managerName: [''],
    branchType: [BranchType.Retail, Validators.required],
    currency: [CurrencyType.EGP],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'المخازن', route: '/inventory?module=warehouses&tab=def' },
    { label: 'ادارة الفروع' },
  ];

  private search$ = new Subject<string>();

  constructor(
    private branchService: BranchService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  load() {
    this.loading = true;
    this.branchService.getList({
      page: this.page,
      pageSize: this.pageSize,
      search: this.search || undefined,
      branchType: this.branchType ? (+this.branchType as BranchType) : undefined,
      isActive: this.activeFilter === 'all' ? undefined : this.activeFilter === 'active',
    }).subscribe({
      next: r => {
        this.branches = r.items;
        this.totalCount = r.totalCount;
        this.totalPages = r.totalPages;
        this.hasNextPage = r.hasNextPage;
        this.hasPreviousPage = r.hasPreviousPage;
        this.loading = false;
      },
      error: () => { this.notify.error('تعذّر تحميل الفروع'); this.loading = false; },
    });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  clearSearch() {
    this.search = '';
    this.page = 1;
    this.load();
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage) { this.page--; this.load(); } }

  startEdit(row: BranchListItem) {
    this.loadingDetail = true;
    this.branchService.getById(row.id).subscribe({
      next: detail => {
        this.editingBranch = detail;
        this.editForm.setValue({
          nameAr: detail.nameAr,
          name: detail.name,
          code: detail.code,
          city: detail.city ?? '',
          address: detail.address ?? '',
          phone: detail.phone ?? '',
          email: detail.email ?? '',
          managerName: detail.managerName ?? '',
          branchType: (BranchType as unknown as Record<string, BranchType>)[detail.branchType] ?? BranchType.Retail,
          currency: detail.currency,
        });
        this.loadingDetail = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل بيانات الفرع');
        this.loadingDetail = false;
      },
    });
  }

  cancelEdit() {
    this.editingBranch = null;
    this.editForm.reset();
  }

  saveEdit() {
    if (this.editForm.invalid || !this.editingBranch) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.editForm.value;
    this.branchService.update(this.editingBranch.id, {
      branchId: this.editingBranch.id,
      name: v.name || v.nameAr!,
      nameAr: v.nameAr!,
      code: v.code!,
      city: v.city || undefined,
      address: v.address || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
      managerName: v.managerName || undefined,
      branchType: Number(v.branchType),
      currency: v.currency != null ? Number(v.currency) : undefined,
    }).subscribe({
      next: () => {
        this.notify.success('تم تحديث الفرع بنجاح');
        this.editingBranch = null;
        this.saving = false;
        this.load();
      },
      error: () => {
        this.notify.error('تعذّر تحديث الفرع');
        this.saving = false;
      },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.editForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  branchTypeLabel(t: BranchType): string { return BRANCH_TYPE_LABELS[t] ?? ''; }
  currencyLabel(c: CurrencyType): string { return CURRENCY_LABELS[c] ?? ''; }
}
