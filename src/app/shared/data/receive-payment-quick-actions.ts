import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the receive-payment add & manage pages so this sidebar list is defined once.
export const RECEIVE_PAYMENT_QUICK_ACTIONS: QuickAction[] = [
  { label: 'استلام دفعة', route: '/receive-payment/add' },
  { label: 'ادارة الإيصالات', route: '/receive-payment' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'ادارة فواتير المبيعات', route: '/invoices/sales/manage' },
];
