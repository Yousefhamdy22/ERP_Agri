import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the sales-invoice add & manage pages so this sidebar list is defined once.
export const SALES_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة فواتير مبيعات', route: '/invoices/sales/add' },
  { label: 'ادارة فواتير مبيعات', route: '/invoices/sales/manage' },
  { label: 'اضافة فواتير مرتجع مبيعات', route: '/sales-returns/add' },
  { label: 'ادارة فواتير مرتجع مبيعات', route: '/sales-returns/manage' },
  { label: 'اضافة عميل', route: '/parties/customers/add' },
  { label: 'ادارة العملاء', route: '/parties/customers/manage' },
  { label: 'كشف حساب عميل/مورد', route: '/parties/statement' },
  { label: 'دفعات عميل/مورد', route: '/parties/payments' },
  { label: 'اضافة دفعة من عميل', route: '/payments/add?type=Receipt' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'ادارة السندات', route: '/payment-vouchers' },
];
