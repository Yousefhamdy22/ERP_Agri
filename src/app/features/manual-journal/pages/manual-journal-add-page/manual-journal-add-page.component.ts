import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { TreeSelectComponent, TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { AccountService } from '../../../../shared/services/account.service';
import { AccountNode } from '../../../../shared/models/account.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { ManualJournalService } from '../../services/manual-journal.service';
import { ManualJournalLineSide } from '../../models/manual-journal.model';
import { MANUAL_JOURNAL_QUICK_ACTIONS } from '../../../../shared/data/manual-journal-quick-actions';
import { CustomerService } from '../../../parties/services/customer.service';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface ManualJournalLineRow {
  accountId: string;
  side: ManualJournalLineSide;
  amount: number | null;
  description: string;
  partyId: string;
}

const CURRENCIES = ['EGP', 'USD', 'SAR'];
const EPSILON = 0.01;

@Component({
  selector: 'app-manual-journal-add-page',
  templateUrl: './manual-journal-add-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, TreeSelectComponent, CustomSelectComponent,],
})
export class ManualJournalAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  saving = false;
  loadingDraft = false;
  editingId: string | null = null;

  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);

  branches: BranchListItem[] = [];
  fiscalPeriods: FiscalPeriod[] = [];
  accountOptions: TreeSelectOption[] = [];
  currencies = CURRENCIES;
  parties: PartyListItem[] = [];

  lines: ManualJournalLineRow[] = [];

  quickActions = MANUAL_JOURNAL_QUICK_ACTIONS;
  topButton = { label: 'ادارة القيود اليومية', icon: 'fa-solid fa-table-list', route: '/manual-journal' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'القيود اليومية', route: '/manual-journal' },
    { label: 'اضافة قيد يومية' },
  ];

  headerForm = this.fb.group({
    entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
    description: [''],
    branchId: ['', Validators.required],
    fiscalPeriodId: ['', Validators.required],
    currency: ['EGP', Validators.required],
    exchangeRate: [1, [Validators.required, Validators.min(0.0001)]],
  });

  constructor(
    private manualJournalService: ManualJournalService,
    private accountService: AccountService,
    private branchService: BranchService,
    private fiscalPeriodService: FiscalPeriodService,
    private notify: NotificationService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.headerForm.value.branchId) this.headerForm.patchValue({ branchId: b[0].id }); },
      error: () => this.notify.error('تعذّر تحميل قائمة الفروع'),
    });

    this.fiscalPeriodService.getAll().subscribe({
      next: periods => {
        this.fiscalPeriods = periods.filter(p => p.status === 'Open');
        if (this.fiscalPeriods.length && !this.headerForm.value.fiscalPeriodId) this.headerForm.patchValue({ fiscalPeriodId: this.fiscalPeriods[0].id });
      },
      error: () => {},
    });

    this.accountService.getTree().subscribe({
      next: tree => { this.accountOptions = this.leafOptions(tree); },
      error: () => this.notify.error('تعذّر تحميل دليل الحسابات'),
    });

    forkJoin({
      customers: this.customerService.getAll(),
      suppliers: this.supplierService.getAll(),
    }).subscribe({
      next: ({ customers, suppliers }) => {
        this.parties = [...customers.items, ...suppliers.items];
      },
      error: () => {},
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) this.loadDraft(id);
    else { this.addLine('Debit'); this.addLine('Credit'); }
  }

  private loadDraft(id: string) {
    this.loadingDraft = true;
    this.manualJournalService.getDetail(id).subscribe({
      next: detail => {
        if (detail.status !== 'Draft') {
          this.notify.error('لا يمكن تعديل قيد مُرحَّل أو معكوس — المسودة فقط قابلة للتعديل');
          this.router.navigate(['/manual-journal']);
          return;
        }
        this.editingId = detail.id;
        this.headerForm.patchValue({
          entryDate: detail.entryDate.slice(0, 10),
          description: detail.description,
          currency: detail.currency,
          exchangeRate: detail.exchangeRate,
          branchId: detail.branchId,
          fiscalPeriodId: detail.fiscalPeriodId,
        });
        this.lines = detail.lines.map(l => ({ accountId: l.accountId, side: l.side, amount: l.amount, description: l.description, partyId: l.partyId || '' }));
        this.loadingDraft = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل القيد');
        this.loadingDraft = false;
        this.router.navigate(['/manual-journal']);
      },
    });
  }

  // الشجرة الكاملة (chart-of-accounts) هي المصدر المؤكَّد حياً فعلاً (خلافاً لـ /leaf غير
  // المؤكَّدة) — تُصفَّى هنا محلياً للأوراق النشطة فقط (لا يمكن الترحيل على حساب تجميعي).
  private leafOptions(nodes: AccountNode[], level = 0): TreeSelectOption[] {
    const result: TreeSelectOption[] = [];
    for (const node of nodes) {
      const canPost = node.allowPosting ?? node.isLeaf;
      if (canPost && node.isActive) result.push({ value: node.id, label: `${node.accountCode} — ${node.nameAr}`, level });
      if (node.children?.length) result.push(...this.leafOptions(node.children, level + 1));
    }
    return result;
  }

  get totalDebit(): number { return this.lines.filter(l => l.side === 'Debit').reduce((s, l) => s + (l.amount || 0), 0); }
  get totalCredit(): number { return this.lines.filter(l => l.side === 'Credit').reduce((s, l) => s + (l.amount || 0), 0); }
  get difference(): number { return this.totalDebit - this.totalCredit; }
  get isBalanced(): boolean { return Math.abs(this.difference) < EPSILON && this.totalDebit > 0; }

  get canSave(): boolean {
    return this.lines.length >= 2
      && this.lines.every(l => !!l.accountId && !!l.amount && l.amount > 0)
      && this.isBalanced;
  }

  // سبب تعطيل زر الحفظ — يظهر بجانب الزر ليعرف المستخدم ماذا ينقص بدل أن يبقى الزر
  // معطَّلاً بصمت بلا تفسير.
  get saveBlockedReason(): string | null {
    if (this.lines.length < 2) return 'أضف سطرين على الأقل (مدين ودائن)';
    if (this.lines.some(l => !l.accountId)) return 'اختر الحساب لكل سطر';
    if (this.lines.some(l => !l.amount || l.amount <= 0)) return 'أدخل مبلغاً أكبر من صفر لكل سطر';
    if (!this.isBalanced) return 'إجمالي المدين يجب أن يساوي إجمالي الدائن';
    return null;
  }

  addLine(side: ManualJournalLineSide = 'Debit') {
    this.lines.push({ accountId: '', side, amount: null, description: '', partyId: '' });
  }

  removeLine(idx: number) { this.lines.splice(idx, 1); }

  invalid(ctrl: string): boolean {
    const c = this.headerForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit() {
    if (this.headerForm.invalid) { this.headerForm.markAllAsTouched(); return; }
    if (this.lines.length < 2) { this.notify.error('أضف سطرين على الأقل (مدين ودائن)'); return; }
    if (this.lines.some(l => !l.accountId)) { this.notify.error('اختر الحساب لكل سطر'); return; }
    if (this.lines.some(l => !l.amount || l.amount <= 0)) { this.notify.error('أدخل مبلغاً أكبر من صفر لكل سطر'); return; }
    if (!this.isBalanced) { this.notify.error('إجمالي المدين يجب أن يساوي إجمالي الدائن قبل الحفظ'); return; }

    const v = this.headerForm.value;
    const lines = this.lines.map(l => ({
      accountId: l.accountId,
      side: l.side,
      amount: Number(l.amount),
      description: l.description || v.description!,
      partyId: l.partyId || null,
    }));

    this.saving = true;

    if (this.editingId) {
      this.manualJournalService.update({
        journalEntryId: this.editingId,
        entryDate: new Date(v.entryDate!).toISOString(),
        description: v.description!,
        currency: v.currency!,
        exchangeRate: Number(v.exchangeRate),
        lines,
      }).subscribe(this.saveHandlers());
      return;
    }

    const userId = this.auth.userId;
    if (!userId) { this.saving = false; this.notify.error('لا يمكن حفظ القيد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }

    this.manualJournalService.create({
      entryDate: new Date(v.entryDate!).toISOString(),
      description: v.description!,
      userId,
      fiscalPeriodId: v.fiscalPeriodId!,
      branchId: v.branchId!,
      currency: v.currency!,
      exchangeRate: Number(v.exchangeRate),
      lines,
    }).subscribe(this.saveHandlers());
  }

  private saveHandlers() {
    return {
      next: () => {
        this.saving = false;
        this.notify.success(this.editingId ? 'تم تحديث القيد' : 'تم حفظ القيد كمسودة');
        this.router.navigate(['/manual-journal']);
      },
      error: (err: unknown) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, this.editingId ? 'تعذّر تحديث القيد' : 'تعذّر حفظ القيد'));
      },
    };
  }
}
