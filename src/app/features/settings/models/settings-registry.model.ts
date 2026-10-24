export interface SettingCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
}

export interface SettingItem {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  descriptionAr: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route?: string;
  adminOnly: boolean;
  status: 'active' | 'upcoming';
  tags: string[];
  badges?: string[];
}

export const SETTING_CATEGORIES: SettingCategory[] = [
  { id: 'all', nameAr: 'جميع الإعدادات', nameEn: 'All Settings', icon: 'fa-solid fa-layer-group' },
  { id: 'data', nameAr: 'إدارة البيانات', nameEn: 'Data Management', icon: 'fa-solid fa-database' },
  { id: 'business', nameAr: 'سياسات العمل', nameEn: 'Business Policies', icon: 'fa-solid fa-briefcase' },
  { id: 'company', nameAr: 'المنشأة والطباعة', nameEn: 'Company & Printing', icon: 'fa-solid fa-building' },
  { id: 'security', nameAr: 'الأمان والمستخدمين', nameEn: 'Security & Access', icon: 'fa-solid fa-shield-halved' },
];

export const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'admin-data',
    titleAr: 'إدارة وتنظيف البيانات',
    titleEn: 'Admin Data Management',
    category: 'data',
    descriptionAr: 'التحكم بالسجلات وحذف العمليات والحركات التجريبية والتنظيف المتسلسل مع حماية القيود والأرصدة.',
    icon: 'fa-solid fa-trash-can',
    iconColor: '#dc2626',
    iconBg: '#fee2e2',
    route: '/settings/admin-data',
    adminOnly: true,
    status: 'active',
    tags: ['بيانات', 'تنظيف', 'حذف', 'تصفير', 'أدمن', 'سجلات', 'data', 'clean'],
    badges: ['حذف متسلسل', 'بيانات تجريبية'],
  },
  {
    id: 'inventory-policy',
    titleAr: 'سياسة الجرد والتكلفة',
    titleEn: 'Inventory Policy & Costing',
    category: 'business',
    descriptionAr: 'تحديد وتعديل سياسة الجرد المخزني (جرد مستمر Perpetual أو جرد دوري Periodic) وطريقة احتساب تكلفة البضاعة.',
    icon: 'fa-solid fa-boxes-stacked',
    iconColor: '#2563eb',
    iconBg: '#dbeafe',
    route: '/settings/inventory-policy',
    adminOnly: true,
    status: 'active',
    tags: ['جرد', 'مخزون', 'مستمر', 'دوري', 'تكلفة', 'inventory', 'policy'],
    badges: ['جرد مستمر', 'جرد دوري'],
  },
  {
    id: 'company-profile',
    titleAr: 'بيانات المنشأة والفروع',
    titleEn: 'Company & Branch Profile',
    category: 'company',
    descriptionAr: 'اسم المنشأة، الشعار، الرقم الضريبي، العملة الافتراضية، الفروع، وبيانات الاتصال والترويسة المعتمدة.',
    icon: 'fa-solid fa-building',
    iconColor: '#059669',
    iconBg: '#d1fae5',
    adminOnly: true,
    status: 'upcoming',
    tags: ['منشأة', 'شركة', 'شعار', 'ضريبي', 'فروع', 'عملة'],
    badges: ['قيد التجهيز'],
  },
  {
    id: 'users-permissions',
    titleAr: 'المستخدمين والأدوار',
    titleEn: 'Users & Permissions',
    category: 'security',
    descriptionAr: 'إدارة حسابات المستخدمين، توزيع الصلاحيات والأدوار الوظيفية، ومراقبة نشاط تسجيل الدخول.',
    icon: 'fa-solid fa-users-gear',
    iconColor: '#d97706',
    iconBg: '#fef3c7',
    adminOnly: true,
    status: 'upcoming',
    tags: ['مستخدمين', 'صلاحيات', 'أدوار', 'أمان', 'users', 'roles'],
    badges: ['قيد التجهيز'],
  },
  {
    id: 'print-templates',
    titleAr: 'نماذج الفواتير والطباعة',
    titleEn: 'Invoice & Print Templates',
    category: 'company',
    descriptionAr: 'تخصيص ترويسة وتذييل فواتير البيع والشراء، حجم الورق (A4 / طابعة حرارية 80mm)، والشروط والأحكام.',
    icon: 'fa-solid fa-print',
    iconColor: '#0891b2',
    iconBg: '#cffafe',
    adminOnly: false,
    status: 'upcoming',
    tags: ['طباعة', 'فواتير', 'حراري', 'a4', 'شروط', 'print'],
    badges: ['قيد التجهيز'],
  },
  {
    id: 'account-mapping',
    titleAr: 'التوجيه والربط المحاسبي',
    titleEn: 'Automatic Account Mapping',
    category: 'business',
    descriptionAr: 'تحديد الحسابات الافتراضية للربط الآلي (المبيعات، المشتريات، ضريبة القيمة المضافة، الخصم المسموح به والمكتسب).',
    icon: 'fa-solid fa-scale-balanced',
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
    adminOnly: true,
    status: 'upcoming',
    tags: ['محاسبة', 'ربط', 'توجيه', 'ضريبة', 'خصم', 'accounting'],
    badges: ['قيد التجهيز'],
  },
  {
    id: 'backup-security',
    titleAr: 'النسخ الاحتياطي والأمان',
    titleEn: 'Backup & Security',
    category: 'security',
    descriptionAr: 'توليد واستعادة النسخ الاحتياطية لقواعد البيانات دورياً، وضبط وتيرة الحفظ السحابي وسجل التدقيق.',
    icon: 'fa-solid fa-shield-halved',
    iconColor: '#e11d48',
    iconBg: '#ffe4e6',
    adminOnly: true,
    status: 'upcoming',
    tags: ['نسخ', 'احتياطي', 'أمان', 'استعادة', 'قاعدة بيانات', 'backup'],
    badges: ['قيد التجهيز'],
  },
];
