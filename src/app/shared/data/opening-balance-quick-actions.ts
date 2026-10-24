import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across the opening-balance add & manage pages so this sidebar list is defined once.
export const OPENING_BALANCE_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة رصيد افتتاحي', route: '/opening-balance/add' },
  { label: 'ادارة الأرصدة الافتتاحية', route: '/opening-balance/manage' },
  { label: 'ادارة الفترات المالية', route: '/accounting/fiscal-periods/manage' },
  { label: 'ادارة الدفعات', route: '/payments' },
];
