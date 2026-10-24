import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the fiscal-period add & manage pages so this sidebar list is defined once.
export const ACCOUNTING_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة حساب', route: '/accounting/accounts/add' },
  { label: 'ادارة دليل الحسابات', route: '/accounting/accounts/manage' },
  { label: 'ادارة الخزائن النقدية', route: '/accounting/cash-safes/manage' },
  { label: 'ادارة الحسابات البنكية', route: '/accounting/bank-accounts/manage' },
  { label: 'اضافة فترة مالية', route: '/accounting/fiscal-periods/add' },
  { label: 'ادارة الفترات المالية', route: '/accounting/fiscal-periods/manage' },
  { label: 'اضافة قيد يومية', route: '/manual-journal/add' },
  { label: 'ادارة القيود اليومية', route: '/manual-journal' },
  { label: 'استلام دفعة', route: '/receive-payment/add' },
  { label: 'ادارة الإيصالات', route: '/receive-payment' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
  { label: 'ادارة دفاتر المشتريات', route: '/purchase-journals' },
  { label: 'ادارة الأرصدة الافتتاحية', route: '/opening-balance/manage' },
];
