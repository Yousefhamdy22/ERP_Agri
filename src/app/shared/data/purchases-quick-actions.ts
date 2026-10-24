import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across every page in the purchases/suppliers area (supplier add/manage,
// purchase invoice add/manage, ...) so this sidebar list is defined once.
export const PURCHASES_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة فواتير توريد', route: '/invoices/purchase/add' },
  { label: 'ادارة فواتير توريد', route: '/invoices/purchase/manage' },
  { label: 'ادارة دفاتر المشتريات', route: '/purchase-journals' },
  { label: 'اضافة فواتير مرتجع توريد', route: '/purchase-returns/add' },
  { label: 'ادارة فواتير مرتجع توريد', route: '/purchase-returns/manage' },
  { label: 'اضافة دفعة لمورد', route: '/payments/add?type=Payment' },
  { label: 'ادارة الدفعات', route: '/payments' },
  { label: 'اضافة عروض اسعار' },
  { label: 'اضافة اوامر الشراء' },
  { label: 'اضافة فئات الموردين' },
  { label: 'اضافة الموردين', route: '/parties/suppliers/add' },
  { label: 'كشف حساب عميل/مورد', route: '/parties/statement' },
  { label: 'دفعات عميل/مورد', route: '/parties/payments' },
];
