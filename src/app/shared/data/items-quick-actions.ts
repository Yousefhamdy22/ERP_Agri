import { QuickAction } from '../components/quick-actions-panel/quick-actions-panel.component';

// Shared across all category/product add & manage pages so this sidebar list is defined once.
export const ITEMS_QUICK_ACTIONS: QuickAction[] = [
  { label: 'اضافة مجموعات الاصناف', route: '/inventory/categories/add' },
  { label: 'ادارة مجموعات الاصناف', route: '/inventory/categories/manage' },
  { label: 'اضافة الاصناف', route: '/inventory/products/add' },
  { label: 'ادارة الاصناف', route: '/inventory/products/manage' },
  { label: 'تحديث أسعار الأصناف', route: '/inventory/products/prices' },
  { label: 'استيراد من اكسيل الاصناف' },
  { label: 'تحديث الكميات من اكسيل' },
];
