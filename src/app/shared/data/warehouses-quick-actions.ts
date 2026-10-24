import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across all branch/warehouse add & manage pages so this sidebar list is defined once.
export const WAREHOUSES_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة مخزن', route: '/inventory/warehouses/add' },
  { label: 'ادارة المخازن', route: '/inventory/warehouses/manage' },
  { label: 'اضافة فرع', route: '/inventory/branches/add' },
  { label: 'ادارة الفروع', route: '/inventory/branches/manage' },
];
