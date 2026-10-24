import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the manual-journal add & manage pages so this sidebar list is defined once.
export const MANUAL_JOURNAL_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة قيد يومية', route: '/manual-journal/add' },
  { label: 'ادارة القيود اليومية', route: '/manual-journal' },
  { label: 'ادارة دليل الحسابات', route: '/accounting/accounts/manage' },
  { label: 'ادارة الفترات المالية', route: '/accounting/fiscal-periods/manage' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'ادارة دفاتر المشتريات', route: '/purchase-journals' },
];
