import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, map, takeUntil } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { AdminDataService, EntityTypeInfo, DeleteResponse } from '../../services/admin-data.service';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-admin-data-management-page',
  templateUrl: './admin-data-management-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CustomSelectComponent,],
})
export class AdminDataManagementPageComponent implements OnInit, OnDestroy {
  entities: EntityTypeInfo[] = [];
  selectedEntityKey = '';
  
  records: any[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 10;
  searchTerm = '';
  
  loading = false;
  entitiesLoading = false;
  error = '';
  
  // Selection
  selectedRecordIds = new Set<string>();
  
  // Delete modal
  deletingRecord: any = null;
  isBulkDelete = false;
  confirmInputText = '';
  deleteLoading = false;
  
  // Results
  deleteResult: DeleteResponse | null = null;
  showResultCard = false;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  breadcrumbs = [
    { label: 'الرئيسية', route: '/dashboard' },
    { label: 'الإعدادات', route: '/settings' },
    { label: 'إدارة البيانات' },
  ];

  // Column definitions
  columnsMap: Record<string, { key: string; label: string; labelAr: string }[]> = {
    invoice: [
      { key: 'invoiceNumber', label: 'Invoice Number', labelAr: 'رقم الفاتورة' },
      { key: 'type', label: 'Type', labelAr: 'النوع' },
      { key: 'partyName', label: 'Party Name', labelAr: 'العميل/المورد' },
      { key: 'grandTotal', label: 'Grand Total', labelAr: 'الإجمالي الكلي' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' },
      { key: 'invoiceDate', label: 'Invoice Date', labelAr: 'تاريخ الفاتورة' }
    ],
    product: [
      { key: 'sku', label: 'SKU', labelAr: 'رمز المنتج (SKU)' },
      { key: 'name', label: 'Name', labelAr: 'اسم المنتج' },
      { key: 'categoryName', label: 'Category Name', labelAr: 'المجموعة' },
      { key: 'isActive', label: 'Active', labelAr: 'نشط' }
    ],
    category: [
      { key: 'name', label: 'Name', labelAr: 'الاسم' },
      { key: 'parentCategory', label: 'Parent Category', labelAr: 'المجموعة الأب' }
    ],
    party: [
      { key: 'name', label: 'Name', labelAr: 'الاسم (EN)' },
      { key: 'nameAr', label: 'Name (Ar)', labelAr: 'الاسم (عربي)' },
      { key: 'partyType', label: 'Party Type', labelAr: 'نوع الطرف' },
      { key: 'phone', label: 'Phone', labelAr: 'الهاتف' },
      { key: 'currentBalance', label: 'Current Balance', labelAr: 'الرصيد الحالي' }
    ],
    warehouse: [
      { key: 'name', label: 'Name', labelAr: 'الاسم (EN)' },
      { key: 'nameAr', label: 'Name (Ar)', labelAr: 'الاسم (عربي)' },
      { key: 'location', label: 'Location', labelAr: 'الموقع' },
      { key: 'isActive', label: 'Active', labelAr: 'نشط' }
    ],
    'payment-voucher': [
      { key: 'voucherNumber', label: 'Voucher Number', labelAr: 'رقم السند' },
      { key: 'type', label: 'Type', labelAr: 'النوع' },
      { key: 'partyName', label: 'Party Name', labelAr: 'العميل/المورد' },
      { key: 'amount', label: 'Amount', labelAr: 'المبلغ' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' },
      { key: 'voucherDate', label: 'Voucher Date', labelAr: 'تاريخ السند' }
    ],
    'journal-entry': [
      { key: 'entryNumber', label: 'Entry Number', labelAr: 'رقم القيد' },
      { key: 'description', label: 'Description', labelAr: 'البيان' },
      { key: 'type', label: 'Type', labelAr: 'النوع' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' },
      { key: 'entryDate', label: 'Entry Date', labelAr: 'تاريخ القيد' }
    ],
    'opening-balance': [
      { key: 'accountName', label: 'Account Name', labelAr: 'اسم الحساب' },
      { key: 'amount', label: 'Amount', labelAr: 'المبلغ' },
      { key: 'itemName', label: 'Item Name', labelAr: 'اسم الصنف' },
      { key: 'warehouseName', label: 'Warehouse Name', labelAr: 'المخزن' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' }
    ],
    account: [
      { key: 'accountCode', label: 'Account Code', labelAr: 'كود الحساب' },
      { key: 'name', label: 'Name (EN)', labelAr: 'الاسم (EN)' },
      { key: 'nameAr', label: 'Name (Ar)', labelAr: 'الاسم (عربي)' },
      { key: 'type', label: 'Type', labelAr: 'النوع' },
      { key: 'isActive', label: 'Active', labelAr: 'نشط' }
    ],
    'fiscal-period': [
      { key: 'periodCode', label: 'Period Code', labelAr: 'كود الفترة' },
      { key: 'startDate', label: 'Start Date', labelAr: 'تاريخ البدء' },
      { key: 'endDate', label: 'End Date', labelAr: 'تاريخ الانتهاء' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' }
    ],
    payment: [
      { key: 'paymentNumber', label: 'Payment Number', labelAr: 'رقم الدفعة' },
      { key: 'amount', label: 'Amount', labelAr: 'المبلغ' },
      { key: 'partyName', label: 'Party Name', labelAr: 'العميل/المورد' },
      { key: 'status', label: 'Status', labelAr: 'الحالة' },
      { key: 'paymentDate', label: 'Payment Date', labelAr: 'تاريخ الدفعة' }
    ],
    branch: [
      { key: 'code', label: 'Code', labelAr: 'كود الفرع' },
      { key: 'name', label: 'Name', labelAr: 'الاسم' },
      { key: 'city', label: 'City', labelAr: 'المدينة' },
      { key: 'isActive', label: 'Active', labelAr: 'نشط' }
    ]
  };

  dependencyPreviews: Record<string, string> = {
    invoice: 'سطور الفاتورة، القيود المحاسبية، حركات المخزون، المدفوعات المخصصة',
    product: 'أسعار المنتج، أرصدة المخزون، حركات المخزون، طبقات FIFO',
    party: 'جميع الفواتير والمدفوعات وسندات الدفع',
    warehouse: 'أرصدة المخزون، حركات المخزون، الفواتير المرتبطة',
    account: 'أرصدة الحسابات، سطور القيود، الأرصدة الافتتاحية، الحسابات الفرعية',
    category: 'جميع المنتجات في هذا التصنيف وبياناتها'
  };

  entityTypeArabicNames: Record<string, string> = {
    InvoiceLine: 'سطر فاتورة',
    InvoiceRelation: 'علاقة فاتورة',
    LandedCost: 'تكلفة إضافية',
    StockTransaction: 'حركة مخزون',
    JournalEntry: 'قيد يومية',
    JournalLine: 'سطر قيد',
    PaymentAllocation: 'تخصيص دفعة',
    PaymentReconciliation: 'تسوية دفع',
    PaymentVoucher: 'سند دفع',
    ReversalVoucher: 'سند عكسي',
    WarehouseProduct: 'منتج مخزن',
    InventoryBalance: 'رصيد مخزون',
    FifoLayer: 'طبقة FIFO',
    ProductPrice: 'سعر منتج',
    AccountBalance: 'رصيد حساب',
    OpeningBalance: 'رصيد افتتاحي',
    BranchProduct: 'منتج فرع',
    BranchProductSalesQuantity: 'كمية مبيعات فرع',
    StockTransfer: 'تحويل مخزون',
    Product: 'منتج',
    Invoice: 'فاتورة',
    Category: 'تصنيف',
    Party: 'عميل/مورد',
    Warehouse: 'مخزن',
    Account: 'حساب',
    FiscalPeriod: 'فترة مالية',
    Payment: 'دفعة',
    Branch: 'فرع'
  };

  constructor(
    private adminDataService: AdminDataService,
    private notify: NotificationService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadEntities();
    this.search$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadRecords();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get columns() {
    return this.columnsMap[this.selectedEntityKey] || [];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.page > 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  loadEntities() {
    this.entitiesLoading = true;
    this.adminDataService.getEntities().subscribe({
      next: data => {
        this.entities = data;
        this.entitiesLoading = false;
      },
      error: err => {
        this.entitiesLoading = false;
        this.notify.error('تعذّر تحميل قائمة الكيانات Deletable Entities');
      }
    });
  }

  onEntityChange() {
    this.records = [];
    this.totalCount = 0;
    this.page = 1;
    this.selectedRecordIds.clear();
    this.showResultCard = false;
    this.deleteResult = null;
    
    if (this.selectedEntityKey) {
      this.loadRecords();
    }
  }

  loadRecords() {
    if (!this.selectedEntityKey) return;
    this.loading = true;
    this.error = '';
    
    this.adminDataService.browseRecords(this.selectedEntityKey, this.page, this.pageSize, this.searchTerm).subscribe({
      next: res => {
        this.records = res.items;
        this.totalCount = res.totalCount;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.error = 'تعذّر تحميل البيانات للكيان المحدد';
        this.notify.error('تعذّر تحميل السجلات');
      }
    });
  }

  onSearchChange(val: string) {
    this.searchTerm = val;
    this.search$.next(val);
  }

  clearSearch() {
    this.searchTerm = '';
    this.page = 1;
    this.loadRecords();
  }

  nextPage() {
    if (this.hasNextPage && !this.loading) {
      this.page++;
      this.loadRecords();
    }
  }

  prevPage() {
    if (this.hasPreviousPage && !this.loading) {
      this.page--;
      this.loadRecords();
    }
  }

  // Row selection
  toggleSelectRecord(id: string) {
    if (this.selectedRecordIds.has(id)) {
      this.selectedRecordIds.delete(id);
    } else {
      this.selectedRecordIds.add(id);
    }
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.records.forEach(r => this.selectedRecordIds.delete(this.getRecordId(r)));
    } else {
      this.records.forEach(r => {
        const id = this.getRecordId(r);
        if (id) this.selectedRecordIds.add(id);
      });
    }
  }

  isAllSelected(): boolean {
    if (this.records.length === 0) return false;
    return this.records.every(r => this.selectedRecordIds.has(this.getRecordId(r)));
  }

  // مفتاح صريح لكل كيان بدل سلسلة OR غامضة — record.id يغطي أغلب الكيانات (invoice/party/
  // payment-voucher/journal-entry/opening-balance/account/fiscal-period/payment/branch،
  // كلها مؤكَّدة تحمل id حقيقي) لكن product (productId) وwarehouse (warehouseId) لا تحمل id
  // إطلاقاً — كانت تُرسِل معرِّفاً فارغاً لِـ DELETE /admin/data/{key}/{id}?userId= فيصل
  // المسار بلا entityId (مؤكَّد حياً 2026-08-05: 404 لِـ product تحديداً بهذا السبب بالضبط).
  // category تُستخدَم عبر id المُشتَق أصلاً من categoryId في flattenCategories.
  getRecordId(record: any): string {
    switch (this.selectedEntityKey) {
      case 'product': return record.productId || record.id || '';
      case 'warehouse': return record.warehouseId || record.id || '';
      default: return record.id || record.categoryId || '';
    }
  }

  getRecordIdentifier(record: any): string {
    if (!record) return '';
    const key = this.selectedEntityKey;
    switch (key) {
      case 'invoice': return record.invoiceNumber || record.InvoiceNumber || '';
      case 'product': return record.sku || record.SKU || record.name || record.Name || '';
      case 'category': return record.name || record.Name || '';
      case 'party': return record.nameAr || record.NameAr || record.name || record.Name || '';
      case 'warehouse': return record.nameAr || record.NameAr || record.name || record.Name || '';
      case 'payment-voucher': return record.voucherNumber || record.VoucherNumber || '';
      case 'journal-entry': return record.entryNumber || record.EntryNumber || '';
      case 'opening-balance': return record.accountName || record.AccountName || '';
      case 'account': return record.accountCode || record.nameAr || record.NameAr || '';
      case 'fiscal-period': return record.periodCode || record.PeriodCode || '';
      case 'payment': return record.paymentNumber || record.PaymentNumber || '';
      case 'branch': return record.code || record.Code || record.name || record.Name || '';
      default: return record.id || '';
    }
  }

  getBulkConfirmText(): string {
    return `حذف ${this.selectedRecordIds.size} سجلات`;
  }

  openSingleDelete(record: any) {
    this.deletingRecord = record;
    this.isBulkDelete = false;
    this.confirmInputText = '';
  }

  openBulkDelete() {
    if (this.selectedRecordIds.size === 0) return;
    this.isBulkDelete = true;
    this.deletingRecord = null;
    this.confirmInputText = '';
  }

  closeDeleteModal() {
    this.deletingRecord = null;
    this.isBulkDelete = false;
    this.confirmInputText = '';
  }

  isConfirmDisabled(): boolean {
    if (this.deleteLoading) return true;
    const cleanConfirm = this.confirmInputText.trim();
    if (this.isBulkDelete) {
      return cleanConfirm !== this.getBulkConfirmText() && cleanConfirm !== 'حذف الكل' && cleanConfirm !== 'DELETE';
    } else {
      const expected = this.getRecordIdentifier(this.deletingRecord);
      return cleanConfirm !== expected;
    }
  }

  confirmDelete() {
    if (this.isConfirmDisabled()) return;
    
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('خطأ: لم يتم ربط مستخدم حالي');
      return;
    }

    console.log(`Starting delete operation for ${this.selectedEntityKey} by user: ${userId}`);

    if (this.isBulkDelete) {
      const ids = Array.from(this.selectedRecordIds);
      const observables = ids.map(id =>
        this.adminDataService.deleteRecord(this.selectedEntityKey, id, userId).pipe(
          map(res => ({ success: true as const, res })),
          catchError(err => of({ success: false as const, err, id }))
        )
      );

      this.deleteLoading = true;
      forkJoin(observables).subscribe({
        next: results => {
          this.deleteLoading = false;
          let successCount = 0;
          let failCount = 0;
          let aggregatedTotalDeleted = 0;
          const aggregatedEntitiesMap: Record<string, number> = {};

          for (const r of results) {
            if (r.success) {
              successCount++;
              const res = r.res;
              aggregatedTotalDeleted += res.totalDeleted || 0;
              if (res.deletedEntities) {
                res.deletedEntities.forEach(ent => {
                  aggregatedEntitiesMap[ent.entityType] = (aggregatedEntitiesMap[ent.entityType] || 0) + ent.count;
                });
              }
            } else {
              failCount++;
              console.error(`Failed to delete record ${r.id}:`, r.err);
            }
          }

          if (failCount > 0) {
            this.notify.error(`تم حذف ${successCount} بنجاح، وفشل حذف ${failCount} سجلات`);
          } else {
            this.notify.success(`تم حذف ${successCount} سجلات بنجاح مع كافة ملحقاتها`);
          }

          this.deleteResult = {
            totalDeleted: aggregatedTotalDeleted,
            deletedEntities: Object.entries(aggregatedEntitiesMap).map(([entityType, count]) => ({
              entityType,
              count,
            })),
          };
          this.showResultCard = true;
          this.selectedRecordIds.clear();
          this.closeDeleteModal();
          this.loadRecords();
        },
        error: err => {
          this.deleteLoading = false;
          this.notify.error('حدث خطأ أثناء تنفيذ عملية الحذف المتعدد');
          console.error(err);
        }
      });
    } else {
      // Single delete
      const recordId = this.getRecordId(this.deletingRecord);
      this.deleteLoading = true;
      this.adminDataService.deleteRecord(this.selectedEntityKey, recordId, userId).subscribe({
        next: res => {
          this.deleteLoading = false;
          this.deleteResult = res;
          this.showResultCard = true;
          this.notify.success('تم حذف السجل بنجاح مع كافة ملحقاته');
          this.selectedRecordIds.delete(recordId);
          this.closeDeleteModal();
          this.loadRecords();
        },
        error: err => {
          this.deleteLoading = false;
          this.notify.error('فشلت عملية حذف السجل. يرجى مراجعة تفاصيل الخطأ');
          console.error(err);
        }
      });
    }
  }

  getArabicEntityName(type: string): string {
    return this.entityTypeArabicNames[type] || type;
  }

  getCellValue(record: any, columnKey: string): string {
    const val = record[columnKey];
    if (val === undefined || val === null) return '—';
    if (typeof val === 'boolean') {
      return val ? 'نعم / Yes' : 'لا / No';
    }
    return String(val);
  }
}
