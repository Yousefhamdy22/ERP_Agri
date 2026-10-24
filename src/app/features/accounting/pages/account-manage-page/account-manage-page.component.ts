import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { AccountTreeComponent } from '../../../../shared/components/account-tree/account-tree.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { AccountService } from '../../../../shared/services/account.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { AccountNode, FlatAccountNode } from '../../../../shared/models/account.model';
import { ACCOUNTING_QUICK_ACTIONS } from '../../../../shared/data/accounting-quick-actions';

@Component({
  selector: 'app-account-manage-page',
  templateUrl: './account-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, AccountTreeComponent, TreeSelectComponent],
})
export class AccountManagePageComponent implements OnInit {
  loading = false;
  loadError = false;
  seeding = false;
  accounts: AccountNode[] = [];
  searchTerm = '';

  // نقل حساب — الحساب الجاري نقله + قائمة مسطَّحة للحسابات المتاحة كوجهة نقل (بدون الحساب
  // نفسه وأحفاده، لمنع حلقة دائرية في الشجرة لا توجد وسيلة API للتحقق منها).
  movingAccount: AccountNode | null = null;
  moveTargetId: string | null = null;
  private flatAccounts: FlatAccountNode[] = [];

  quickActions = ACCOUNTING_QUICK_ACTIONS;
  topButton = { label: 'اضافة حساب', icon: 'fa-solid fa-plus', route: '/accounting/accounts/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'دليل الحسابات', route: '/sales?module=accounts&tab=def' },
    { label: 'ادارة دليل الحسابات' },
  ];

  get totalCount(): number {
    const countNodes = (nodes: AccountNode[]): number =>
      nodes.reduce((sum, n) => sum + 1 + countNodes(n.children ?? []), 0);
    return countNodes(this.accounts);
  }

  get filteredAccounts(): AccountNode[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.accounts;

    const filterNode = (node: AccountNode): AccountNode | null => {
      const match = node.accountCode.toLowerCase().includes(term) ||
                    (node.nameAr && node.nameAr.toLowerCase().includes(term)) ||
                    (node.name && node.name.toLowerCase().includes(term));
      
      const filteredChildren = (node.children || [])
        .map(c => filterNode(c))
        .filter((c): c is AccountNode => c !== null);

      if (match || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    };

    return this.accounts
      .map(node => filterNode(node))
      .filter((n): n is AccountNode => n !== null);
  }

  get moveTargetOptions(): TreeSelectOption[] {
    if (!this.movingAccount) return [];
    const excludedIds = this.collectSubtreeIds(this.movingAccount);
    return this.flatAccounts
      .filter(a => !excludedIds.has(a.id))
      .map(a => ({ value: a.id, label: `${a.accountCode} — ${a.nameAr}`, level: a.level }));
  }

  constructor(
    private accountService: AccountService,
    private notify: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = false;
    this.accountService.getTree().subscribe({
      next: tree => {
        this.accounts = tree;
        this.flatAccounts = AccountService.flattenTree(tree);
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل دليل الحسابات');
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  seedChart() {
    if (!confirm('تهيئة دليل الحسابات القياسي المصري؟ سيُنشئ هذا مجموعة الحسابات الافتراضية دفعة واحدة.')) return;
    this.seeding = true;
    this.accountService.seed().subscribe({
      next: result => {
        this.notify.success(result?.message || 'تم تهيئة دليل الحسابات بنجاح');
        this.seeding = false;
        this.load();
      },
      error: err => {
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تهيئة دليل الحسابات'));
        this.seeding = false;
      },
    });
  }

  onAddChild(account: AccountNode) {
    this.router.navigate(['/accounting/accounts/add'], { queryParams: { parentAccountId: account.id } });
  }

  onViewLedger(account: AccountNode) {
    this.router.navigate(['/accounting/reports/account-ledger'], { queryParams: { accountId: account.id } });
  }

  onToggleActive(account: AccountNode) {
    const verb = account.isActive ? 'تعطيل' : 'تفعيل';
    if (!confirm(`تأكيد ${verb} الحساب "${account.nameAr}"؟`)) return;

    const action$ = account.isActive ? this.accountService.deactivate(account.id) : this.accountService.activate(account.id);
    action$.subscribe({
      next: () => { this.notify.success(`تم ${verb} الحساب`); this.load(); },
      error: err => this.notify.error(friendlyErrorMessage(err, `تعذّر ${verb} الحساب`)),
    });
  }

  onDelete(account: AccountNode) {
    if (!confirm(`تأكيد حذف الحساب "${account.nameAr}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    this.accountService.delete(account.id).subscribe({
      next: () => { this.notify.success('تم حذف الحساب'); this.load(); },
      error: err => this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف الحساب')),
    });
  }

  openMove(account: AccountNode) {
    this.movingAccount = account;
    this.moveTargetId = null;
  }

  closeMove() {
    this.movingAccount = null;
    this.moveTargetId = null;
  }

  confirmMove() {
    if (!this.movingAccount) return;
    if (!this.moveTargetId) { this.notify.error('اختر الحساب الرئيسي الجديد'); return; }

    this.accountService.move(this.movingAccount.id, this.moveTargetId).subscribe({
      next: () => {
        this.notify.success('تم نقل الحساب بنجاح');
        this.closeMove();
        this.load();
      },
      error: err => this.notify.error(friendlyErrorMessage(err, 'تعذّر نقل الحساب')),
    });
  }

  private collectSubtreeIds(account: AccountNode): Set<string> {
    const ids = new Set<string>([account.id]);
    for (const child of account.children ?? []) {
      for (const id of this.collectSubtreeIds(child)) ids.add(id);
    }
    return ids;
  }
}
