// ─────────────────────────────────────────────────────────
//  Report Registry Model
//  Defines the shape of every report in the system.
//  Each entry describes its filters, columns, and category
//  so the Report Center page can render them dynamically.
// ─────────────────────────────────────────────────────────

export type ReportCategory =
  | 'accounting'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'parties'
  | 'payments'
  | 'management';

export interface ReportCategoryDef {
  readonly id: ReportCategory;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly icon: string;
  readonly color: string;
}

export type FilterType =
  | 'fiscalPeriod'
  | 'dateRange'
  | 'branch'
  | 'warehouse'
  | 'category'
  | 'party'
  | 'customer'
  | 'supplier'
  | 'product'
  | 'account'
  | 'invoiceType'
  | 'paymentStatus'
  | 'select'
  | 'number'
  | 'boolean'
  | 'text';

export interface ReportFilter {
  readonly key: string;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly type: FilterType;
  readonly required?: boolean;
  readonly defaultValue?: unknown;
  /** For 'select' type filters */
  readonly options?: ReadonlyArray<{ value: string; labelAr: string }>;
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'print';

export interface ReportDefinition {
  readonly key: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly descriptionAr: string;
  readonly icon: string;
  readonly category: ReportCategory;
  readonly filters: ReadonlyArray<ReportFilter>;
  readonly supportedFormats: ReadonlyArray<ExportFormat>;
  /** Route path for the existing report page (if any) */
  readonly existingRoute?: string;
  /** Whether the report has an existing backend endpoint */
  readonly hasBackend: boolean;
  /** Badge indicator */
  readonly isNew?: boolean;
}

// ─────────────────────────────────────────────
//  Static definitions
// ─────────────────────────────────────────────

export const REPORT_CATEGORIES: ReadonlyArray<ReportCategoryDef> = [
  {
    id: 'accounting',
    labelAr: 'التقارير المحاسبية',
    labelEn: 'Accounting Reports',
    icon: 'fa-solid fa-calculator',
    color: '#3b82f6',
  },
  {
    id: 'inventory',
    labelAr: 'تقارير المخزون',
    labelEn: 'Inventory Reports',
    icon: 'fa-solid fa-warehouse',
    color: '#f59e0b',
  },
  {
    id: 'sales',
    labelAr: 'تقارير المبيعات',
    labelEn: 'Sales Reports',
    icon: 'fa-solid fa-cart-shopping',
    color: '#10b981',
  },
  {
    id: 'purchases',
    labelAr: 'تقارير المشتريات',
    labelEn: 'Purchase Reports',
    icon: 'fa-solid fa-truck-ramp-box',
    color: '#ef4444',
  },
  {
    id: 'parties',
    labelAr: 'العملاء والموردين',
    labelEn: 'Parties Reports',
    icon: 'fa-solid fa-users',
    color: '#8b5cf6',
  },
  {
    id: 'payments',
    labelAr: 'المدفوعات والخزينة',
    labelEn: 'Payments & Safe',
    icon: 'fa-solid fa-vault',
    color: '#06b6d4',
  },
  {
    id: 'management',
    labelAr: 'التقارير الإدارية',
    labelEn: 'Management Reports',
    icon: 'fa-solid fa-chart-pie',
    color: '#ec4899',
  },
];

// ─────── Shared filter presets ─────────────────

const PERIOD_FILTER: ReportFilter = {
  key: 'periodId',
  labelAr: 'الفترة المالية',
  labelEn: 'Fiscal Period',
  type: 'fiscalPeriod',
  required: true,
};

const DATE_RANGE_FILTER: ReadonlyArray<ReportFilter> = [
  { key: 'fromDate', labelAr: 'من تاريخ', labelEn: 'From', type: 'dateRange' },
  { key: 'toDate', labelAr: 'إلى تاريخ', labelEn: 'To', type: 'dateRange' },
];

const BRANCH_FILTER: ReportFilter = {
  key: 'branchId',
  labelAr: 'الفرع',
  labelEn: 'Branch',
  type: 'branch',
};

const WAREHOUSE_FILTER: ReportFilter = {
  key: 'warehouseId',
  labelAr: 'المخزن',
  labelEn: 'Warehouse',
  type: 'warehouse',
};

const CATEGORY_FILTER: ReportFilter = {
  key: 'categoryId',
  labelAr: 'التصنيف',
  labelEn: 'Category',
  type: 'category',
};

const ACCOUNT_FILTER: ReportFilter = {
  key: 'accountId',
  labelAr: 'الحساب',
  labelEn: 'Account',
  type: 'account',
  required: true,
};

const ALL_FORMATS: ReadonlyArray<ExportFormat> = ['pdf', 'excel', 'csv', 'print'];

// ─────── Complete 30 Report Definitions ─────────

export const REPORT_DEFINITIONS: ReadonlyArray<ReportDefinition> = [
  // ═══════════════ 1. التقارير المحاسبية (7) ═══════════════
  {
    key: 'trial-balance',
    titleAr: 'ميزان المراجعة',
    titleEn: 'Trial Balance',
    descriptionAr: 'عرض أرصدة جميع الحسابات المدينة والدائنة للفترة المالية',
    icon: 'fa-solid fa-scale-balanced',
    category: 'accounting',
    filters: [PERIOD_FILTER],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/trial-balance',
    hasBackend: true,
  },
  {
    key: 'income-statement',
    titleAr: 'قائمة الدخل',
    titleEn: 'Income Statement',
    descriptionAr: 'تحليل الإيرادات والمصروفات وتكلفة البضاعة وصافي الربح للفترة',
    icon: 'fa-solid fa-chart-line',
    category: 'accounting',
    filters: [
      PERIOD_FILTER,
      ...DATE_RANGE_FILTER,
      BRANCH_FILTER,
      {
        key: 'includeDrafts',
        labelAr: 'تضمين المسودات',
        labelEn: 'Include Drafts',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'hideZeroBalances',
        labelAr: 'إخفاء الأرصدة الصفرية',
        labelEn: 'Hide Zero Balances',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/income-statement',
    hasBackend: true,
  },
  {
    key: 'balance-sheet',
    titleAr: 'الميزانية العمومية',
    titleEn: 'Balance Sheet',
    descriptionAr: 'عرض الأصول والخصوم وحقوق الملكية للمنشأة',
    icon: 'fa-solid fa-building-columns',
    category: 'accounting',
    filters: [PERIOD_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
  },
  {
    key: 'general-ledger',
    titleAr: 'دفتر الأستاذ العام',
    titleEn: 'General Ledger',
    descriptionAr: 'جميع القيود المحاسبية وحركات حساب معين تفصيلياً مع الرصيد المتراكم',
    icon: 'fa-solid fa-book',
    category: 'accounting',
    filters: [
      {
        key: 'accountId',
        labelAr: 'الحساب',
        labelEn: 'Account',
        type: 'account',
      },
      PERIOD_FILTER,
      ...DATE_RANGE_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/account-ledger',
    hasBackend: true,
  },
  {
    key: 'detailed-revenue-expenses',
    titleAr: 'الإيرادات والمصروفات التفصيلي',
    titleEn: 'Detailed Revenue & Expenses',
    descriptionAr: 'تفصيل كامل لحسابات الإيرادات والمصروفات مع التوزيع والاتجاه الشهري',
    icon: 'fa-solid fa-arrows-left-right',
    category: 'accounting',
    filters: [PERIOD_FILTER, ...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/revenue-expenses',
    hasBackend: true,
  },
  {
    key: 'general-journal',
    titleAr: 'دفتر اليومية العام',
    titleEn: 'General Journal',
    descriptionAr: 'جميع القيود والعمليات المحاسبية بالترتيب الزمني مع أطراف القيد',
    icon: 'fa-solid fa-calendar-days',
    category: 'accounting',
    filters: [PERIOD_FILTER, ...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'cash-flow',
    titleAr: 'قائمة التدفقات النقدية',
    titleEn: 'Cash Flow Statement',
    descriptionAr: 'تحليل التدفقات النقدية الداخلة والخارجة التشغيلية والاستثمارية والتمويلية',
    icon: 'fa-solid fa-money-bill-wave',
    category: 'accounting',
    filters: [PERIOD_FILTER, ...DATE_RANGE_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 2. تقارير المخزون (6) ═══════════════
  {
    key: 'stock-balance',
    titleAr: 'أرصدة المخزون الحالية',
    titleEn: 'Stock Balance',
    descriptionAr: 'الكميات المتوفرة والقيمة الحالية لكل صنف في كل مخزن',
    icon: 'fa-solid fa-boxes-stacked',
    category: 'inventory',
    filters: [
      {
        key: 'warehouseId',
        labelAr: 'المخزن',
        labelEn: 'Warehouse',
        type: 'warehouse',
        required: true,
      },
      CATEGORY_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
    existingRoute: '/inventory/warehouses/products',
    isNew: true,
  },
  {
    key: 'stock-movement',
    titleAr: 'حركة المخزون التفصيلية',
    titleEn: 'Stock Movement',
    descriptionAr: 'تتبع كافة حركات الوارد والصادر والتحويلات والتسويات لصنف محدد',
    icon: 'fa-solid fa-arrows-rotate',
    category: 'inventory',
    filters: [
      {
        key: 'productId',
        labelAr: 'الصنف',
        labelEn: 'Product',
        type: 'product',
      },
      ...DATE_RANGE_FILTER,
      WAREHOUSE_FILTER,
      CATEGORY_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
  },
  {
    key: 'inventory-valuation',
    titleAr: 'تقييم المخزون (FIFO)',
    titleEn: 'Inventory Valuation',
    descriptionAr: 'تقييم شامل للمخزون بتكلفة طبقات الشراء الفعلية (الوارد أولاً يصرف أولاً)',
    icon: 'fa-solid fa-coins',
    category: 'inventory',
    filters: [WAREHOUSE_FILTER, CATEGORY_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
  },
  {
    key: 'slow-moving-items',
    titleAr: 'الأصناف الراكدة',
    titleEn: 'Slow Moving Items',
    descriptionAr: 'حصر الأصناف التي لم تشهد حركة بيع أو سحب لفترة محددة',
    icon: 'fa-solid fa-clock-rotate-left',
    category: 'inventory',
    filters: [...DATE_RANGE_FILTER, WAREHOUSE_FILTER, CATEGORY_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'reorder-level',
    titleAr: 'أصناف تحت حد الطلب',
    titleEn: 'Reorder Level Alert',
    descriptionAr: 'قائمة النواقص والأصناف التي وصلت كمياتها لحد الأمان لإعادة الطلب',
    icon: 'fa-solid fa-triangle-exclamation',
    category: 'inventory',
    filters: [WAREHOUSE_FILTER, CATEGORY_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
  },
  {
    key: 'inventory-aging',
    titleAr: 'تقادم المخزون',
    titleEn: 'Inventory Aging',
    descriptionAr: 'تحليل أعمار البضاعة بالمخازن حسب تاريخ الشراء الفعلي لطبقات الوارد',
    icon: 'fa-solid fa-hourglass-half',
    category: 'inventory',
    filters: [WAREHOUSE_FILTER, CATEGORY_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 3. تقارير المبيعات (5) ═══════════════
  {
    key: 'top-selling-items',
    titleAr: 'أكثر الأصناف مبيعًا',
    titleEn: 'Top Selling Items',
    descriptionAr: 'ترتيب المنتجات الأكثر طلباً حسب الكمية المباعة أو الإيراد أو الربح',
    icon: 'fa-solid fa-ranking-star',
    category: 'sales',
    filters: [
      ...DATE_RANGE_FILTER,
      BRANCH_FILTER,
      WAREHOUSE_FILTER,
      CATEGORY_FILTER,
      {
        key: 'topCount',
        labelAr: 'عدد الأصناف',
        labelEn: 'Top Count',
        type: 'number',
        defaultValue: 20,
      },
      {
        key: 'sortBy',
        labelAr: 'ترتيب حسب',
        labelEn: 'Sort By',
        type: 'select',
        defaultValue: 'Quantity',
        options: [
          { value: 'Quantity', labelAr: 'الكمية' },
          { value: 'Revenue', labelAr: 'الإيراد' },
          { value: 'Profit', labelAr: 'الربح' },
        ],
      },
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/top-selling',
    hasBackend: true,
  },
  {
    key: 'detailed-sales',
    titleAr: 'تقرير المبيعات التفصيلي',
    titleEn: 'Detailed Sales Report',
    descriptionAr: 'سجل كامل لجميع فواتير البيع مع الأصناف والخصومات وحالات السداد',
    icon: 'fa-solid fa-file-invoice-dollar',
    category: 'sales',
    filters: [
      ...DATE_RANGE_FILTER,
      BRANCH_FILTER,
      WAREHOUSE_FILTER,
      CATEGORY_FILTER,
      {
        key: 'customerId',
        labelAr: 'العميل',
        labelEn: 'Customer',
        type: 'customer',
      },
      {
        key: 'invoiceType',
        labelAr: 'نوع الفاتورة',
        labelEn: 'Invoice Type',
        type: 'select',
        options: [
          { value: 'Sale', labelAr: 'بيع' },
          { value: 'Return', labelAr: 'مرتجع' },
        ],
      },
      {
        key: 'paymentStatus',
        labelAr: 'حالة الدفع',
        labelEn: 'Payment Status',
        type: 'select',
        options: [
          { value: 'Paid', labelAr: 'مدفوع' },
          { value: 'Partial', labelAr: 'جزئي' },
          { value: 'Unpaid', labelAr: 'غير مدفوع' },
        ],
      },
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/reports/sales-detailed',
    hasBackend: true,
  },
  {
    key: 'sales-by-customer',
    titleAr: 'المبيعات حسب العميل',
    titleEn: 'Sales by Customer',
    descriptionAr: 'إجمالي حجم المبيعات والمدفوعات والمتبقي لكل عميل عن فترة محددة',
    icon: 'fa-solid fa-users-line',
    category: 'sales',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'sales-returns',
    titleAr: 'مرتجعات المبيعات',
    titleEn: 'Sales Returns Report',
    descriptionAr: 'حصر تفصيلي لفواتير وبنود مرتجع المبيعات وأسباب الإرجاع',
    icon: 'fa-solid fa-rotate-left',
    category: 'sales',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'profit-analysis',
    titleAr: 'تحليل الأرباح وهوامش الربحية',
    titleEn: 'Profit Analysis',
    descriptionAr: 'تحليل هامش الربح لكل فاتورة وصنف بحساب سعر البيع مقابل تكلفة الـ FIFO',
    icon: 'fa-solid fa-chart-pie',
    category: 'sales',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER, CATEGORY_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 4. تقارير المشتريات (3) ═══════════════
  {
    key: 'purchase-report',
    titleAr: 'تقرير المشتريات التفصيلي',
    titleEn: 'Purchase Report',
    descriptionAr: 'سجل تفصيلي لجميع فواتير الشراء والتوريدات وتكاليف الاستيراد والمحلي',
    icon: 'fa-solid fa-cart-flatbed',
    category: 'purchases',
    filters: [
      ...DATE_RANGE_FILTER,
      BRANCH_FILTER,
      WAREHOUSE_FILTER,
      {
        key: 'supplierId',
        labelAr: 'المورد',
        labelEn: 'Supplier',
        type: 'supplier',
      },
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'purchase-returns',
    titleAr: 'مرتجعات المشتريات',
    titleEn: 'Purchase Returns Report',
    descriptionAr: 'حصر فواتير وبنود البضائع المرتجعة إلى الموردين مع مبالغ التسوية',
    icon: 'fa-solid fa-right-left',
    category: 'purchases',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'purchases-by-supplier',
    titleAr: 'المشتريات حسب المورد',
    titleEn: 'Purchases by Supplier',
    descriptionAr: 'إجمالي حجم المشتريات المسحوبة من كل مورد ومقارنة الأسعار والأحجام',
    icon: 'fa-solid fa-truck-field',
    category: 'purchases',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 5. تقارير العملاء والموردين (5) ═══════════════
  {
    key: 'customer-statement',
    titleAr: 'كشف حساب عميل',
    titleEn: 'Customer Statement',
    descriptionAr: 'كشف حساب تفصيلي بجميع فواتير وسدادات ومرتجعات العميل مع الرصيد المتراكم',
    icon: 'fa-solid fa-file-invoice',
    category: 'parties',
    filters: [
      {
        key: 'partyId',
        labelAr: 'العميل',
        labelEn: 'Customer',
        type: 'customer',
        required: true,
      },
      ...DATE_RANGE_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/parties/statement',
    hasBackend: true,
  },
  {
    key: 'supplier-statement',
    titleAr: 'كشف حساب مورد',
    titleEn: 'Supplier Statement',
    descriptionAr: 'كشف حساب تفصيلي بمشتريات وسدادات ومرتجعات المورد مع الرصيد المتراكم',
    icon: 'fa-solid fa-file-contract',
    category: 'parties',
    filters: [
      {
        key: 'partyId',
        labelAr: 'المورد',
        labelEn: 'Supplier',
        type: 'supplier',
        required: true,
      },
      ...DATE_RANGE_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    existingRoute: '/parties/statement',
    hasBackend: true,
  },
  {
    key: 'customer-aging',
    titleAr: 'أعمار ديون العملاء',
    titleEn: 'Customer Aging Report',
    descriptionAr: 'تصنيف مديونيات العملاء حسب فترات التأخير (30 / 60 / 90 / +90 يوم)',
    icon: 'fa-solid fa-clock-rotate-left',
    category: 'parties',
    filters: [
      ACCOUNT_FILTER,
      BRANCH_FILTER,
      {
        key: 'toDate',
        labelAr: 'كما في تاريخ',
        labelEn: 'As of Date',
        type: 'dateRange',
      },
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
  },
  {
    key: 'supplier-aging',
    titleAr: 'أعمار مستحقات الموردين',
    titleEn: 'Supplier Aging Report',
    descriptionAr: 'تصنيف فواتير ومستحقات الموردين حسب فترات الاستحقاق والتأخير',
    icon: 'fa-solid fa-business-time',
    category: 'parties',
    filters: [
      ACCOUNT_FILTER,
      BRANCH_FILTER,
      {
        key: 'toDate',
        labelAr: 'كما في تاريخ',
        labelEn: 'As of Date',
        type: 'dateRange',
      },
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: true,
  },
  {
    key: 'party-balances',
    titleAr: 'أرصدة العملاء والموردين',
    titleEn: 'Party Balances',
    descriptionAr: 'قائمة أرصدة العملاء والموردين الحالية الإجمالية لبيان الموقف المالي العام',
    icon: 'fa-solid fa-address-book',
    category: 'parties',
    filters: [
      {
        key: 'partyType',
        labelAr: 'نوع الطرف',
        labelEn: 'Party Type',
        type: 'select',
        defaultValue: 'Customer',
        options: [
          { value: 'Customer', labelAr: 'العملاء' },
          { value: 'Supplier', labelAr: 'الموردين' },
        ],
      },
      BRANCH_FILTER,
    ],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 6. تقارير المدفوعات والخزينة (4) ═══════════════
  {
    key: 'payments-report',
    titleAr: 'تقرير سندات الصرف (المدفوعات)',
    titleEn: 'Payments Voucher Report',
    descriptionAr: 'حصر كامل لسندات الصرف النقدية والبنكية للموردين والمصروفات',
    icon: 'fa-solid fa-hand-holding-dollar',
    category: 'payments',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'receipts-report',
    titleAr: 'تقرير سندات القبض (المقبوضات)',
    titleEn: 'Receipts Voucher Report',
    descriptionAr: 'حصر كامل لجميع سندات القبض والتحصيلات النقدية والبنكية من العملاء',
    icon: 'fa-solid fa-money-check-dollar',
    category: 'payments',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'cash-safe-report',
    titleAr: 'تقرير حركة الخزينة (الصندوق)',
    titleEn: 'Cash Safe Report',
    descriptionAr: 'كشف حركة الخزينة النقدية (الوارد والمنصرف) مع الرصيد اللحظي',
    icon: 'fa-solid fa-vault',
    category: 'payments',
    filters: [...DATE_RANGE_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
  {
    key: 'bank-account-report',
    titleAr: 'تقرير حركة الحسابات البنكية',
    titleEn: 'Bank Accounts Report',
    descriptionAr: 'كشف حركة الحسابات البنكية والشيكات والإيداعات مع الرصيد الختامي',
    icon: 'fa-solid fa-building-columns',
    category: 'payments',
    filters: [...DATE_RANGE_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },

  // ═══════════════ 7. التقارير الإدارية (1) ═══════════════
  {
    key: 'daily-summary',
    titleAr: 'ملخص اليوم الشامل',
    titleEn: 'Daily Executive Summary',
    descriptionAr: 'لوحة قيادية يومية مجمعة (مبيعات + مشتريات + مقبوضات + مدفوعات + أرصدة الخزنة)',
    icon: 'fa-solid fa-calendar-day',
    category: 'management',
    filters: [...DATE_RANGE_FILTER, BRANCH_FILTER],
    supportedFormats: ALL_FORMATS,
    hasBackend: false,
    isNew: true,
  },
];
