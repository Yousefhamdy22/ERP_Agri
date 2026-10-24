import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the payment-voucher add & manage pages so this sidebar list is defined once.
export const PAYMENT_VOUCHERS_QUICK_ACTIONS: QuickAction[] = [
  { label: 'سند قبض نقدي', route: '/payment-vouchers/add?type=CashReceipt' },
  { label: 'سند صرف نقدي', route: '/payment-vouchers/add?type=CashPayment' },
  { label: 'سند قبض شيك', route: '/payment-vouchers/add?type=CheckReceipt' },
  { label: 'سند تحويل بنكي', route: '/payment-vouchers/add?type=BankTransfer' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
  { label: 'ادارة الخزائن النقدية', route: '/accounting/cash-safes/manage' },
  { label: 'ادارة الحسابات البنكية', route: '/accounting/bank-accounts/manage' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'استلام دفعة', route: '/receive-payment/add' },
  { label: 'ادارة الإيصالات', route: '/receive-payment' },
  { label: 'ادارة القيود اليومية', route: '/manual-journal' },
  { label: 'ادارة فواتير التوريد', route: '/invoices/purchase/manage' },
  { label: 'ادارة فواتير المبيعات', route: '/invoices/sales/manage' },
];
