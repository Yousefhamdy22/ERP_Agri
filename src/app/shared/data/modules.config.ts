import { ModuleDef, NavGroup, NavItem } from '../models/navigation.model';

export const TABS: { id: 'def' | 'main' | 'sub' | 'reports'; label: string; icon: string }[] = [
  { id: 'def',     label: 'التعريفات الرئيسية', icon: 'fa-solid fa-sliders' },
  { id: 'main',    label: 'العمليات الرئيسية',  icon: 'fa-solid fa-layer-group' },
  { id: 'sub',     label: 'العمليات الفرعية',   icon: 'fa-solid fa-diagram-project' },
  { id: 'reports', label: 'التقارير',            icon: 'fa-solid fa-chart-pie' },
];

// ── التوريدات ─────────────────────────────────────────────────────────────────
const PURCHASES_MODULE: ModuleDef = {
  id: 'purchases', name: 'التوريدات', icon: 'fa-solid fa-truck-ramp-box', route: '/sales',
  kpis: [
    { label: 'مشتريات اليوم',    value: '—', sub: 'اليوم',   color: '#8a909c', icon: 'fa-solid fa-cart-arrow-down',     iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
    { label: 'فواتير التوريد',   value: '—', sub: 'فاتورة',   color: '#8a909c', icon: 'fa-solid fa-file-invoice',         iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'مرتجعات التوريد', value: '—', sub: 'مرتجع',    color: '#8a909c', icon: 'fa-solid fa-rotate-left',          iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'مديونية الموردين', value: '—', sub: 'موردون آجلون', color: '#8a909c', icon: 'fa-solid fa-hand-holding-dollar',  iconBg: '#fdeaea', iconColor: '#dc2626' },
  ],
  tabs: {
    def: [
      { title: 'الموردين', ops: [
        { label: 'اضافة الموردين', icon: 'fa-solid fa-plus',       primary: true, route: '/parties/suppliers/add'    },
        { label: 'ادارة الموردين', icon: 'fa-solid fa-table-list',               route: '/parties/suppliers/manage' },
        { label: 'كشف حساب مورد',  icon: 'fa-solid fa-file-invoice-dollar',      route: '/parties/statement'        },
        { label: 'دفعات مورد',     icon: 'fa-solid fa-hand-holding-dollar',      route: '/parties/payments'         },
      ]},
    ],
    main: [
      { title: 'فواتير التوريد', ops: [
        { label: 'اضافة فواتير توريد',   icon: 'fa-solid fa-plus',       primary: true, route: '/invoices/purchase/add'    },
        { label: 'ادارة فواتير توريد',   icon: 'fa-solid fa-table-list',                route: '/invoices/purchase/manage' },
        { label: 'استيراد من اكسيل',     icon: 'fa-solid fa-file-excel'                                                     },
      ]},
      { title: 'فواتير مرتجع التوريد', ops: [
        { label: 'اضافة فواتير مرتجع توريد', icon: 'fa-solid fa-plus',       primary: true, route: '/purchase-returns/add'    },
        { label: 'ادارة فواتير مرتجع توريد', icon: 'fa-solid fa-table-list',                route: '/purchase-returns/manage' },
      ]},
    ],
    sub:     [],
    reports: [],
  },
};

// ── المبيعات ──────────────────────────────────────────────────────────────────
const SALES_MODULE: ModuleDef = {
  id: 'sales', name: 'المبيعات', icon: 'fa-solid fa-cart-shopping', route: '/sales',
  kpis: [
    { label: 'مبيعات اليوم',    value: '—', sub: 'اليوم',    color: '#8a909c', icon: 'fa-solid fa-sack-dollar',          iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
    { label: 'فواتير اليوم',    value: '—', sub: 'فاتورة',    color: '#8a909c', icon: 'fa-solid fa-file-invoice',         iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'مرتجعات',         value: '—', sub: 'مرتجع',     color: '#8a909c', icon: 'fa-solid fa-rotate-left',          iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'مديونية العملاء', value: '—', sub: 'عملاء آجلون', color: '#8a909c', icon: 'fa-solid fa-hand-holding-dollar',  iconBg: '#fdeaea', iconColor: '#dc2626' },
  ],
  tabs: {
    def: [
      { title: 'العملاء', ops: [
        { label: 'ادارة العملاء', icon: 'fa-solid fa-table-list',              route: '/parties/customers/manage' },
        { label: 'اضافة العملاء', icon: 'fa-solid fa-plus',      primary: true, route: '/parties/customers/add'    },
        { label: 'كشف حساب عميل', icon: 'fa-solid fa-file-invoice-dollar',     route: '/parties/statement'        },
        { label: 'دفعات عميل',    icon: 'fa-solid fa-hand-holding-dollar',     route: '/parties/payments'         },
      ]},
    ],
    main: [
      { title: 'المبيعات', ops: [
        { label: 'اضافة فواتير مبيعات',   icon: 'fa-solid fa-plus',       primary: true, route: '/invoices/sales/add'    },
        { label: 'ادارة فواتير مبيعات',   icon: 'fa-solid fa-table-list',                          route: '/invoices/sales/manage' },
        { label: 'استيراد من اكسيل',      icon: 'fa-solid fa-file-excel'                                                            },
      ]},
      { title: 'فواتير مرتجع مبيعات', ops: [
        { label: 'اضافة فواتير مرتجع مبيعات', icon: 'fa-solid fa-plus',              primary: true, route: '/sales-returns/add'    },
        { label: 'ادارة فواتير مرتجع مبيعات', icon: 'fa-solid fa-table-list',                      route: '/sales-returns/manage' },
        { label: 'مرتجع من فاتورة مبيعات',    icon: 'fa-solid fa-file-circle-minus',               route: '/sales-returns/add'    },
      ]},
    ],
    sub: [
      { title: 'عروض الأسعار', ops: [{ label: 'اضافة عرض سعر',   icon: 'fa-solid fa-plus',       primary: true }, { label: 'ادارة عروض الأسعار', icon: 'fa-solid fa-table-list' }] },
      { title: 'أوامر البيع',  ops: [{ label: 'اضافة أمر بيع',   icon: 'fa-solid fa-plus',       primary: true }, { label: 'ادارة أوامر البيع',  icon: 'fa-solid fa-table-list' }] },
    ],
    reports: [
      { title: 'تقارير المبيعات', ops: [
        { label: 'تقرير مبيعات تفصيلي', icon: 'fa-solid fa-file-invoice-dollar', primary: true, route: '/reports/sales-detailed' },
        { label: 'الأصناف الأكثر مبيعاً', icon: 'fa-solid fa-chart-column', primary: true, route: '/reports/top-selling' },
      ] },
    ],
  },
};

// ── الأصناف ───────────────────────────────────────────────────────────────────
const ITEMS_MODULE: ModuleDef = {
  id: 'items', name: 'الأصناف', icon: 'fa-solid fa-tag', route: '/inventory',
  kpis: [
    { label: 'إجمالي الأصناف',   value: '—', sub: 'صنف',      color: '#8a909c', icon: 'fa-solid fa-boxes-stacked',       iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'مجموعات الأصناف', value: '—', sub: 'مجموعة',    color: '#8a909c', icon: 'fa-solid fa-layer-group',         iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'تحت حد الطلب',    value: '—', sub: 'أصناف',     color: '#8a909c', icon: 'fa-solid fa-triangle-exclamation', iconBg: '#fdeaea', iconColor: '#dc2626' },
    { label: 'قيمة المخزون',    value: '—', sub: 'بالتكلفة',  color: '#8a909c', icon: 'fa-solid fa-sack-dollar',         iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
  ],
  tabs: {
    def: [
      { title: 'مجموعات الأصناف', ops: [
        { label: 'اضافة مجموعات الاصناف', icon: 'fa-solid fa-folder-plus', primary: true, route: '/inventory/categories/add'    },
        { label: 'ادارة مجموعات الاصناف', icon: 'fa-solid fa-folder-tree',               route: '/inventory/categories/manage' },
      ]},
      { title: 'الأصناف', ops: [
        { label: 'اضافة الاصناف',          icon: 'fa-solid fa-plus',       primary: true, route: '/inventory/products/add'    },
        { label: 'ادارة الاصناف',          icon: 'fa-solid fa-table-list',                            route: '/inventory/products/manage' },
        { label: 'تحديث أسعار الأصناف',    icon: 'fa-solid fa-tags',                                  route: '/inventory/products/prices' },
        { label: 'استيراد من اكسيل الاصناف', icon: 'fa-solid fa-file-excel' },
        { label: 'تحديث كميات المخزون من إكسيل', icon: 'fa-solid fa-boxes-packing' },
      ]},
    ],
    main: [], sub: [], reports: [],
  },
};

// ── المخازن ───────────────────────────────────────────────────────────────────
const WAREHOUSES_MODULE: ModuleDef = {
  id: 'warehouses', name: 'المخازن', icon: 'fa-solid fa-warehouse', route: '/inventory',
  kpis: [
    { label: 'عدد المخازن',     value: '—', sub: 'مخزن',      color: '#8a909c', icon: 'fa-solid fa-warehouse',           iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'حركات اليوم',     value: '—', sub: 'إذن',       color: '#8a909c', icon: 'fa-solid fa-right-left',          iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'قيمة المخزون',    value: '—', sub: 'بالتكلفة',  color: '#8a909c', icon: 'fa-solid fa-sack-dollar',         iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
    { label: 'أصناف تحت الحد', value: '—', sub: 'أصناف',     color: '#8a909c', icon: 'fa-solid fa-triangle-exclamation', iconBg: '#fdeaea', iconColor: '#dc2626' },
  ],
  tabs: {
    def: [
      { title: 'المخازن', ops: [
        { label: 'اضافة المخازن',  icon: 'fa-solid fa-plus',            primary: true, route: '/inventory/warehouses/add'      },
        { label: 'ادارة المخازن',  icon: 'fa-solid fa-table-list',                     route: '/inventory/warehouses/manage'   },
        { label: 'أصناف المخزن',   icon: 'fa-solid fa-boxes-packing',                  route: '/inventory/warehouses/products' },
      ]},
      { title: 'الفروع', ops: [
        { label: 'اضافة الفروع', icon: 'fa-solid fa-plus',       primary: true, route: '/inventory/branches/add'    },
        { label: 'ادارة الفروع', icon: 'fa-solid fa-table-list',               route: '/inventory/branches/manage' },
      ]},
    ],
    main: [], sub: [], reports: [],
  },
};

// ── الحسابات ──────────────────────────────────────────────────────────────────
const ACCOUNTS_MODULE: ModuleDef = {
  id: 'accounts', name: 'الحسابات', icon: 'fa-solid fa-scale-balanced', route: '/sales',
  kpis: [
    { label: 'رصيد الخزائن',     value: '—', sub: 'نقدية + بنوك', color: '#8a909c', icon: 'fa-solid fa-vault',            iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
    { label: 'قيود اليوم',       value: '—', sub: 'قيد',           color: '#8a909c', icon: 'fa-solid fa-book',             iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'إجمالي المدينون', value: '—', sub: 'عملاء',         color: '#8a909c', icon: 'fa-solid fa-arrow-trend-up',  iconBg: '#fdeaea', iconColor: '#dc2626' },
    { label: 'إجمالي الدائنون', value: '—', sub: 'موردون',        color: '#8a909c', icon: 'fa-solid fa-arrow-trend-down', iconBg: '#fdf0e6', iconColor: '#d4830a' },
  ],
  tabs: {
    def:  [
      { title: 'دليل الحسابات', ops: [
        { label: 'اضافة حساب',    icon: 'fa-solid fa-plus',       primary: true, route: '/accounting/accounts/add'    },
        { label: 'دليل الحسابات', icon: 'fa-solid fa-table-list',                route: '/accounting/accounts/manage' },
      ]},
      { title: 'الفترات المالية', ops: [
        { label: 'اضافة فترة مالية',      icon: 'fa-solid fa-plus',       primary: true, route: '/accounting/fiscal-periods/add'    },
        { label: 'ادارة الفترات المالية', icon: 'fa-solid fa-table-list',                route: '/accounting/fiscal-periods/manage' },
      ]},
      { title: 'الخزائن والحسابات البنكية', ops: [
        { label: 'ادارة الخزائن النقدية',   icon: 'fa-solid fa-vault',            route: '/accounting/cash-safes/manage'    },
        { label: 'ادارة الحسابات البنكية', icon: 'fa-solid fa-building-columns', route: '/accounting/bank-accounts/manage' },
      ]},
    ],
    main: [
      { title: 'القيود', ops: [
        { label: 'اضافة قيد يومية',    icon: 'fa-solid fa-plus',       primary: true, route: '/manual-journal/add' },
        { label: 'ادارة القيود اليومية', icon: 'fa-solid fa-table-list',              route: '/manual-journal'     },
      ]},
      { title: 'تسجيل الدفعات', ops: [
        { label: 'اضافة دفعة',    icon: 'fa-solid fa-plus',       primary: true, route: '/payments/add' },
        { label: 'ادارة الدفعات', icon: 'fa-solid fa-table-list',                route: '/payments'      },
        { label: 'استلام دفعة',    icon: 'fa-solid fa-hand-holding-dollar', primary: true, route: '/receive-payment/add' },
        { label: 'ادارة الإيصالات', icon: 'fa-solid fa-table-list',                        route: '/receive-payment'      },
      ]},
      // الأربع مجموعات (صرف نقدي/تحويل بنكي لمورد، استلام نقدية/شيك من عميل) كانت بطاقات
      // منفصلة بزرّين فقط لكل منها — 4 بطاقات كاملة الارتفاع لعملية واحدة فعلياً (سندات
      // القبض والصرف) تسبب سكرول طويل غير احترافي. دُمجت في بطاقة واحدة بكل الاختصارات.
      { title: 'سندات القبض والصرف', ops: [
        { label: 'صرف نقدي لمورد',     icon: 'fa-solid fa-money-bill-transfer', primary: true, route: '/payment-vouchers/add?type=CashPayment'  },
        { label: 'تحويل بنكي لمورد',   icon: 'fa-solid fa-building-columns',    primary: true, route: '/payment-vouchers/add?type=BankTransfer' },
        { label: 'استلام نقدية من عميل', icon: 'fa-solid fa-money-bill-wave',   primary: true, route: '/payment-vouchers/add?type=CashReceipt'  },
        { label: 'استلام شيك من عميل', icon: 'fa-solid fa-money-check-dollar',  primary: true, route: '/payment-vouchers/add?type=CheckReceipt' },
        { label: 'ادارة السندات',      icon: 'fa-solid fa-table-list',                        route: '/payment-vouchers'                        },
      ]},
      { title: 'دفاتر المشتريات', ops: [
        { label: 'ادارة دفاتر المشتريات', icon: 'fa-solid fa-book', primary: true, route: '/purchase-journals' },
      ]},
    ],
    sub:     [{ title: 'التسويات', ops: [{ label: 'تسوية بنكية', icon: 'fa-solid fa-file-lines' }] }],
    reports: [{ title: 'التقارير المالية', ops: [
      { label: 'الإيرادات والمصروفات التفصيلي', icon: 'fa-solid fa-chart-line', primary: true, route: '/reports/revenue-expenses' },
      { label: 'ميزان المراجعة (كشف حساب بالأرصدة)', icon: 'fa-solid fa-chart-column', primary: true, route: '/reports/trial-balance' },
      { label: 'كشف حساب تفصيلي دليل الحسابات', icon: 'fa-solid fa-file-invoice-dollar', primary: true, route: '/reports/account-ledger' },
      { label: 'قائمة الدخل', icon: 'fa-solid fa-chart-line', primary: true, route: '/reports/income-statement' },
    ] }],
  },
};

// ── رصيد اول المدة ────────────────────────────────────────────────────────────
const OPENING_BALANCE_MODULE: ModuleDef = {
  id: 'opening-balance', name: 'رصيد اول المدة', icon: 'fa-solid fa-scale-unbalanced', route: '/sales',
  kpis: [
    { label: 'إجمالي أرصدة العملاء',  value: '—', sub: 'مدين افتتاحي',  color: '#8a909c', icon: 'fa-solid fa-arrow-trend-up',   iconBg: '#fdeaea', iconColor: '#dc2626' },
    { label: 'إجمالي أرصدة الموردين', value: '—', sub: 'دائن افتتاحي',  color: '#8a909c', icon: 'fa-solid fa-arrow-trend-down', iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'أرصدة الحسابات',        value: '—', sub: 'رصيد افتتاحي',  color: '#8a909c', icon: 'fa-solid fa-scale-balanced',   iconBg: '#eef0fb', iconColor: '#5156be' },
  ],
  tabs: {
    def: [{ title: 'الأرصدة الافتتاحية', ops: [
      { label: 'اضافة رصيد افتتاحي',        icon: 'fa-solid fa-plus',       primary: true, route: '/opening-balance/add'    },
      { label: 'استيراد أرصدة المخزون (Excel)', icon: 'fa-solid fa-file-excel', primary: true, route: '/opening-balance/add?type=Inventory&workflow=bulk' },
      { label: 'ادارة الأرصدة الافتتاحية', icon: 'fa-solid fa-table-list',               route: '/opening-balance/manage' },
      { label: 'تأكيد الأرصدة الافتتاحية',  icon: 'fa-solid fa-check-double', primary: true, route: '/opening-balance/manage' },
    ]}],
    main: [], sub: [], reports: [],
  },
};

// ── الموارد البشرية ───────────────────────────────────────────────────────────
const HR_MODULE: ModuleDef = {
  id: 'hr', name: 'الموارد البشرية', icon: 'fa-solid fa-users', route: '/sales',
  kpis: [
    { label: 'الموظفون',    value: '—', sub: 'موظف',    color: '#8a909c', icon: 'fa-solid fa-users',              iconBg: '#eef0fb', iconColor: '#5156be' },
    { label: 'حضور اليوم', value: '—', sub: 'حضور',    color: '#8a909c', icon: 'fa-solid fa-user-check',         iconBg: '#eaf7f1', iconColor: '#0e9f6e' },
    { label: 'إجازات',      value: '—', sub: 'اليوم',   color: '#8a909c', icon: 'fa-solid fa-umbrella-beach',     iconBg: '#fdf0e6', iconColor: '#d4830a' },
    { label: 'مسير الشهر', value: '—', sub: 'إجمالي', color: '#8a909c', icon: 'fa-solid fa-money-check-dollar', iconBg: '#eef0fb', iconColor: '#5156be' },
  ],
  tabs: {
    def:     [{ title: 'الموظفون', ops: [{ label: 'اضافة موظف',         icon: 'fa-solid fa-plus',       primary: true }, { label: 'ادارة الموظفين', icon: 'fa-solid fa-table-list' }] }],
    main:    [{ title: 'الرواتب',  ops: [{ label: 'تشغيل مسير رواتب',  icon: 'fa-solid fa-plus',       primary: true            }, { label: 'ادارة المسيرات', icon: 'fa-solid fa-table-list' }] }],
    sub:     [{ title: 'السلف',    ops: [{ label: 'اضافة سلفة',         icon: 'fa-solid fa-plus',       primary: true            }] }],
    reports: [{ title: 'تقارير الموظفين', ops: [{ label: 'كشف رواتب',  icon: 'fa-solid fa-chart-column' }] }],
  },
};

const SETTINGS_MODULE: ModuleDef = {
  id: 'settings', name: 'إدارة البيانات', icon: 'fa-solid fa-database', route: '/settings/admin-data',
  kpis: [],
  tabs: {
    def: [
      { title: 'التحكم بالبيانات', ops: [
        { label: 'إدارة البيانات', icon: 'fa-solid fa-trash-can', primary: true, route: '/settings/admin-data' }
      ]}
    ],
    main: [], sub: [], reports: []
  }
};

const INVENTORY_POLICY_MODULE: ModuleDef = {
  id: 'inventory-policy', name: 'سياسة الجرد', icon: 'fa-solid fa-boxes-stacked', route: '/settings/inventory-policy',
  kpis: [],
  tabs: {
    def: [
      { title: 'إعدادات الجرد', ops: [
        { label: 'سياسة الجرد', icon: 'fa-solid fa-boxes-stacked', primary: true, route: '/settings/inventory-policy' }
      ]}
    ],
    main: [], sub: [], reports: []
  }
};

// ── MODULES array (used by NavigationService.getModule) ──────────────────────
export const MODULES: ModuleDef[] = [
  PURCHASES_MODULE,
  SALES_MODULE,
  ITEMS_MODULE,
  WAREHOUSES_MODULE,
  ACCOUNTS_MODULE,
  OPENING_BALANCE_MODULE,
  HR_MODULE,
  SETTINGS_MODULE,
  INVENTORY_POLICY_MODULE,
];

// ── Nav groups ────────────────────────────────────────────────────────────────
const SALES_PURCHASES_GROUP: NavGroup = {
  id:         'sales-purchases',
  name:       'التوريدات والمبيعات',
  icon:       'fa-solid fa-right-left',
  subModules: [PURCHASES_MODULE, SALES_MODULE],
};

const INVENTORY_GROUP: NavGroup = {
  id:         'inventory',
  name:       'الأصناف والمخازن',
  icon:       'fa-solid fa-boxes-stacked',
  subModules: [ITEMS_MODULE, WAREHOUSES_MODULE],
};

const ACCOUNTS_GROUP: NavGroup = {
  id:         'accounts-group',
  name:       'الحسابات',
  icon:       'fa-solid fa-scale-balanced',
  subModules: [ACCOUNTS_MODULE, OPENING_BALANCE_MODULE],
};

const SETTINGS_GROUP: NavGroup = {
  id:         'settings-group',
  name:       'الإعدادات',
  icon:       'fa-solid fa-gear',
  subModules: [SETTINGS_MODULE, INVENTORY_POLICY_MODULE],
};

export const NAV_ITEMS: NavItem[] = [
  SALES_PURCHASES_GROUP,
  INVENTORY_GROUP,
  ACCOUNTS_GROUP,
];
