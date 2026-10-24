import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the payment add & manage pages so this sidebar list is defined once.
export const PAYMENTS_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة دفعة', route: '/payments/add' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'كشف حساب عميل/مورد', route: '/parties/statement' },
  { label: 'دفعات عميل/مورد', route: '/parties/payments' },
  { label: 'استلام دفعة', route: '/receive-payment/add' },
  { label: 'ادارة الإيصالات', route: '/receive-payment' },
  { label: 'ادارة فواتير المبيعات', route: '/invoices/sales/manage' },
  { label: 'ادارة فواتير التوريد', route: '/invoices/purchase/manage' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
  { label: 'ادارة القيود اليومية', route: '/manual-journal' },
];
