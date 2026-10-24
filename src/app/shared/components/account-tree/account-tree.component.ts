import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountNode } from '../../models/account.model';
import { ACCOUNT_TYPE_LABELS, NORMAL_BALANCE_LABELS } from '../../models/accounting-enums.model';

interface TreeRow {
  account: AccountNode;
  level: number;
  hasChildren: boolean;
}

// عرض شجري لدليل الحسابات — يعرض الشجرة ويُصدر أحداث الإجراءات (إضافة فرع/نقل/تفعيل-تعطيل/
// حذف) لصفحة الأب لتنفيذها فعلياً عبر AccountService، بنفس أسلوب CategoryTreeComponent
// (تسطيح الشجرة لقائمة مع مستوى/طي بدل تكرار القالب).
@Component({
  selector: 'app-account-tree',
  templateUrl: './account-tree.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class AccountTreeComponent {
  @Output() addChild = new EventEmitter<AccountNode>();
  @Output() moveAccount = new EventEmitter<AccountNode>();
  @Output() toggleActive = new EventEmitter<AccountNode>();
  @Output() deleteAccount = new EventEmitter<AccountNode>();
  @Output() viewLedger = new EventEmitter<AccountNode>();

  private _accounts: AccountNode[] = [];
  rows: TreeRow[] = [];
  collapsed = new Set<string>();

  @Input() set accounts(value: AccountNode[]) {
    this._accounts = value || [];
    this.rows = this.flatten(this._accounts, 0);
  }

  typeLabel(t: string): string { return ACCOUNT_TYPE_LABELS[t as keyof typeof ACCOUNT_TYPE_LABELS] ?? t; }
  balanceLabel(b: string): string { return NORMAL_BALANCE_LABELS[b as keyof typeof NORMAL_BALANCE_LABELS] ?? b; }

  private flatten(nodes: AccountNode[], level: number): TreeRow[] {
    const result: TreeRow[] = [];
    for (const node of nodes) {
      const hasChildren = (node.children?.length ?? 0) > 0;
      result.push({ account: node, level, hasChildren });
      if (hasChildren && !this.collapsed.has(node.id)) {
        result.push(...this.flatten(node.children, level + 1));
      }
    }
    return result;
  }

  toggle(id: string) {
    if (this.collapsed.has(id)) this.collapsed.delete(id);
    else this.collapsed.add(id);
    this.rows = this.flatten(this._accounts, 0);
  }

  expandAll() {
    this.collapsed.clear();
    this.rows = this.flatten(this._accounts, 0);
  }

  collapseAll() {
    this.collectNodeIds(this._accounts).forEach(id => this.collapsed.add(id));
    this.rows = this.flatten(this._accounts, 0);
  }

  private collectNodeIds(nodes: AccountNode[]): string[] {
    const ids: string[] = [];
    for (const n of nodes) {
      if (n.children?.length) {
        ids.push(n.id);
        ids.push(...this.collectNodeIds(n.children));
      }
    }
    return ids;
  }

  isCollapsed(id: string): boolean { return this.collapsed.has(id); }
  indent(level: number): number { return level * 24; }
}
