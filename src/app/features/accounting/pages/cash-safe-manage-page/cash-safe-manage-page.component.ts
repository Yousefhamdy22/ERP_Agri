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
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { CashSafeService } from '../../services/cash-safe.service';
import { CashSafeDetail, CashSafeWithBranch } from '../../models/cash-safe.model';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem, BranchWarehouseOption } from '../../../inventory/models/branch.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-cash-safe-manage-page',
  templateUrl: './cash-safe-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class CashSafeManagePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cashSafeService = inject(CashSafeService);
  private warehouseService = inject(WarehouseService);
  private branchService = inject(BranchService);
  private notify = inject(NotificationService);

  branches: BranchListItem[] = [];
  warehouses: Warehouse[] = [];
  selectedBranchWarehouses: BranchWarehouseOption[] = [];

  // كل الخزائن عبر كل الفروع (بلا فلترة) — مصدر الحقيقة الوحيد، تُفلتَر محلياً في safes.
  private allSafes: CashSafeWithBranch[] = [];
  safes: CashSafeWithBranch[] = [];
  loading = false;
  loadError = false;
  skeletonRows = [1, 2, 3, 4, 5];

  search = '';
  branchFilter = '';

  showCreateModal = false;
  creating = false;

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    nameAr: ['', [Validators.required, Validators.minLength(3)]],
    code: ['', Validators.required],
    branchId: ['', Validators.required],
    linkedWarehouseIds: [[] as string[]],
  });

  // Edit state
  showEditModal = false;
  editing = false;
  editTarget: CashSafeWithBranch | null = null;
  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    isActive: [true],
  });

  // Delete state
  showDeleteModal = false;
  deleting = false;
  deleteTarget: CashSafeWithBranch | null = null;

  showDetailsModal = false;
  detailSafe: CashSafeDetail | null = null;
  detailLoading = false;
  detailError = false;

  quickActions = ACCOUNTING_QUICK_ACTIONS;

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'الخزائن والحسابات البنكية' },
    { label: 'ادارة الخزائن النقدية' },
  ];

  ngOnInit() {
    this.loadSafes();
  }

  loadSafes() {
    this.loading = true;
    this.loadError = false;

    forkJoin({
      branches: this.branchService.getAll(),
      warehouses: this.warehouseService.getAll(),
    }).subscribe({
      next: ({ branches, warehouses }) => {
        this.branches = branches.filter(b => b.isActive !== false);
        this.warehouses = warehouses.filter(w => w.isActive !== false);

        if (!this.branches.length) {
          this.allSafes = [];
          this.applyFilters();
          this.loading = false;
          return;
        }

        forkJoin(this.branches.map(b =>
          this.cashSafeService.getByBranch(b.id).pipe(
            map(list => list.map((s): CashSafeWithBranch => ({ ...s, branchName: b.nameAr || b.name || '—' }))),
            catchError(() => of<CashSafeWithBranch[]>([])),
          )
        )).subscribe(results => {
          this.allSafes = results.flat();
          this.applyFilters();
          this.loading = false;
        });
      },
      error: () => {
        this.notify.error('تعذّر تحميل البيانات الأساسية (الفروع والمخازن)');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    this.safes = this.allSafes.filter(s => {
      if (this.branchFilter && s.branchId !== this.branchFilter) return false;
      if (!term) return true;
      return (s.name || '').toLowerCase().includes(term)
        || (s.nameAr || '').toLowerCase().includes(term)
        || (s.code || '').toLowerCase().includes(term);
    });
  }

  branchName(id: string): string {
    const b = this.branches.find(x => x.id === id);
    return b?.nameAr || b?.name || '—';
  }

  getLinkedWarehousesDisplay(linkedWarehouseIds?: string[]): string {
    if (!linkedWarehouseIds || linkedWarehouseIds.length === 0) {
      return 'عامة (كل مخازن الفرع)';
    }
    return linkedWarehouseIds.map(id => {
      const w = this.warehouses.find(x => x.warehouseId === id);
      return w?.nameAr || w?.name || '—';
    }).join('، ');
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
  viewDetails(safe: CashSafeWithBranch) {
    this.showDetailsModal = true;
    this.detailSafe = null;
    this.detailLoading = true;
    this.detailError = false;
    this.cashSafeService.getById(safe.id).subscribe({
      next: detail => {
        this.detailSafe = detail;
        this.detailLoading = false;
      },
      error: err => {
        this.detailError = true;
        this.detailLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تحميل تفاصيل الخزينة'));
      },
    });
  }

  closeDetails() {
    this.showDetailsModal = false;
    this.detailSafe = null;
  }

  get detailCreatedAt(): string {
    const d = this.detailSafe as Record<string, unknown> | null;
    const v = (d?.['createdAt'] ?? d?.['createdDate'] ?? d?.['creationDate']) as string | undefined;
    return v ? new Date(v).toLocaleDateString('ar-EG') : '—';
  }

  get detailCreatedBy(): string {
    const d = this.detailSafe as Record<string, unknown> | null;
    return (d?.['createdBy'] ?? d?.['createdByName'] ?? d?.['createdByUserName']) as string || '—';
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  openEdit(s: CashSafeWithBranch) {
    this.editTarget = s;
    this.editForm.patchValue({
      name: s.name,
      isActive: s.isActive,
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
    this.cashSafeService.update({
      id: this.editTarget.id,
      name: v.name!.trim(),
      isActive: v.isActive!,
    }).subscribe({
      next: () => {
        this.editing = false;
        this.showEditModal = false;
        this.editTarget = null;
        this.notify.success('تم تعديل الخزينة النقدية بنجاح');
        this.loadSafes();
      },
      error: err => {
        this.editing = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تعديل الخزينة النقدية'));
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  confirmDelete(s: CashSafeWithBranch) {
    this.deleteTarget = s;
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
    this.cashSafeService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.notify.success('تم حذف الخزينة النقدية بنجاح');
        this.loadSafes();
      },
      error: err => {
        this.deleting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف الخزينة النقدية'));
      },
    });
  }

  openCreate() {
    this.createForm.reset({ name: '', nameAr: '', code: '', branchId: this.branches[0]?.id || '', linkedWarehouseIds: [] });
    this.selectedBranchWarehouses = [];
    if (this.branches.length) {
      this.onCreateBranchChange();
    }
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

  get codeHasSpaces(): boolean {
    return /\s/.test(this.createForm.value.code ?? '');
  }

  onCreateBranchChange() {
    const branchId = this.createForm.value.branchId;
    this.selectedBranchWarehouses = [];
    this.createForm.patchValue({ linkedWarehouseIds: [] });
    if (!branchId) return;

    this.branchService.getBranchWithWarehouses(branchId).subscribe({
      next: data => {
        this.selectedBranchWarehouses = data.warehouses.filter(w => w.isActive);
      },
      error: () => {
        this.notify.error('تعذّر تحميل مخازن الفرع المختار');
      },
    });
  }

  isWarehouseSelected(id: string): boolean {
    const list = this.createForm.value.linkedWarehouseIds || [];
    return list.includes(id);
  }

  toggleLinkedWarehouse(id: string) {
    const list = [...(this.createForm.value.linkedWarehouseIds || [])];
    const idx = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(id);
    }
    this.createForm.patchValue({ linkedWarehouseIds: list });
  }

  submitCreate() {
    if (this.createForm.invalid || this.codeHasSpaces) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    this.creating = true;
    this.cashSafeService.create({
      name: v.name!.trim(),
      nameAr: v.nameAr!.trim(),
      code: v.code!.trim(),
      branchId: v.branchId!,
      linkedWarehouseIds: v.linkedWarehouseIds || [],
    }).subscribe({
      next: safe => {
        this.creating = false;
        this.showCreateModal = false;
        this.notify.success(`تم إنشاء الخزينة بنجاح — الحساب المحاسبي المُولَّد: ${safe.accountCode}`);
        this.loadSafes();
      },
      error: err => {
        this.creating = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إنشاء الخزينة'));
      },
    });
  }
}
