import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent, QuickAction } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { ImportProductsModalComponent } from '../../components/import-products-modal/import-products-modal.component';
import { BulkUpdateStockModalComponent } from '../../components/bulk-update-stock-modal/bulk-update-stock-modal.component';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ProductDetail, ProductListItem } from '../../models/product.model';
import { FlatCategory } from '../../models/category.model';
import { ITEMS_QUICK_ACTIONS } from '../../../../shared/data/items-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-product-manage-page',
  templateUrl: './product-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, ImportProductsModalComponent, BulkUpdateStockModalComponent, CustomSelectComponent,],
})
export class ProductManagePageComponent implements OnInit, OnDestroy {
  products: ProductListItem[] = [];
  loading = false;
  flatCategories: FlatCategory[] = [];
  showImportModal = false;
  showBulkUpdateStockModal = false;
  selectedProduct: ProductDetail | null = null;
  detailLoading = false;

  search = '';
  categoryId = '';
  activeFilter: ActiveFilter = 'all';

  selectedIds = new Set<string>();
  deleting = false;

  showForceDeleteModal = false;
  pendingForceDeleteIds: string[] = [];
  forceDeleteReasons: string[] = [];

  // GET /Products/{id} يُرجع stockByWarehouse بـ warehouseId فقط بلا اسم — يُحل الاسم هنا
  // من قائمة المخازن المُخزَّنة مسبقاً (WarehouseService.getAll() مُخزَّنة shareReplay بالفعل).
  private warehouseNames = new Map<string, string>();

  page = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 1;
  hasNextPage = false;
  hasPreviousPage = false;

  quickActions = ITEMS_QUICK_ACTIONS;
  topButton = { label: 'اضافة صنف جديد', icon: 'fa-solid fa-plus', route: '/inventory/products/add' };

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'ادارة الأصناف' },
  ];

  private search$ = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private warehouseService: WarehouseService,
    private notify: NotificationService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.categoryService.getTree().subscribe({
      next: tree => { this.flatCategories = CategoryService.flattenTree(tree); },
    });
    this.warehouseService.getAll().subscribe({
      next: warehouses => {
        this.warehouseNames = new Map(warehouses.map(w => [w.warehouseId, w.nameAr || w.name || w.warehouseId]));
      },
      error: () => {},
    });
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  load() {
    this.loading = true;
    // التحديد يخص صفوف الصفحة المعروضة حالياً فقط — يُفرَّغ عند أي تحميل جديد (تغيير صفحة/فلتر)
    // حتى لا يبقى معرِّف صنف من صفحة سابقة غير مرئية محدَّداً بصمت لحذف لاحق.
    this.selectedIds.clear();
    this.productService.getList({
      page: this.page,
      pageSize: this.pageSize,
      search: this.search || undefined,
      categoryId: this.categoryId || undefined,
      isActive: this.activeFilter === 'all' ? undefined : this.activeFilter === 'active',
    }).subscribe({
      next: r => {
        this.products = r.items;
        this.totalCount = r.totalCount;
        this.totalPages = r.totalPages;
        this.hasNextPage = r.hasNextPage;
        this.hasPreviousPage = r.hasPreviousPage;
        this.loading = false;
      },
      error: () => { this.notify.error('تعذّر تحميل الأصناف'); this.loading = false; },
    });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  clearSearch() {
    this.search = '';
    this.page = 1;
    this.load();
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage) { this.page--; this.load(); } }

  isSelected(productId: string): boolean {
    return this.selectedIds.has(productId);
  }

  toggleSelect(productId: string) {
    if (this.selectedIds.has(productId)) this.selectedIds.delete(productId);
    else this.selectedIds.add(productId);
  }

  get allOnPageSelected(): boolean {
    return this.products.length > 0 && this.products.every(p => this.selectedIds.has(p.productId));
  }

  toggleSelectAllOnPage() {
    if (this.allOnPageSelected) {
      this.products.forEach(p => this.selectedIds.delete(p.productId));
    } else {
      this.products.forEach(p => this.selectedIds.add(p.productId));
    }
  }

  showDeleteModal = false;
  pendingDeleteIds: string[] = [];
  forceDeleteCheckbox = true;
  deleteErrorReasons: string[] = [];

  deleteOne(productId: string) {
    this.openDeleteConfirmation([productId]);
  }

  deleteSelected() {
    if (!this.selectedIds.size) return;
    this.openDeleteConfirmation([...this.selectedIds]);
  }

  openDeleteConfirmation(ids: string[]) {
    this.pendingDeleteIds = ids;
    this.forceDeleteCheckbox = true;
    this.deleteErrorReasons = [];
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.pendingDeleteIds = [];
    this.deleteErrorReasons = [];
  }

  confirmDelete() {
    if (!this.pendingDeleteIds.length) return;
    this.deleting = true;
    this.productService.bulkDelete(this.pendingDeleteIds, this.forceDeleteCheckbox).subscribe({
      next: (res) => {
        this.deleting = false;
        if (res && res.failures && res.failures.length > 0 && res.deletedCount === 0 && !this.forceDeleteCheckbox) {
          this.deleteErrorReasons = res.failures.map(f => f.reason);
          this.forceDeleteCheckbox = true;
          return;
        }

        const count = res?.deletedCount || this.pendingDeleteIds.length;
        this.notify.success(count > 1 ? `تم حذف ${count} صنف بنجاح` : 'تم حذف الصنف بنجاح');
        const removed = new Set(this.pendingDeleteIds);
        this.products = this.products.filter(p => !removed.has(p.productId));
        this.totalCount = Math.max(0, this.totalCount - count);
        this.pendingDeleteIds.forEach(id => this.selectedIds.delete(id));
        this.closeDeleteModal();
      },
      error: () => {
        this.deleting = false;
        this.notify.error('تعذّر حذف الصنف/الأصناف المحدَّدة');
      },
    });
  }

  onQuickAction(action: QuickAction) {
    if (action.label === 'استيراد من اكسيل الاصناف') this.showImportModal = true;
    if (action.label === 'تحديث الكميات من اكسيل') this.showBulkUpdateStockModal = true;
  }

  // الـ modal يعرض ملخص النتيجة بنفسه في خطوته الثالثة ولا يُغلق تلقائياً — هذا فقط
  // يُحدِّث قائمة الأصناف في الخلفية فور نجاح الاستيراد حتى تكون جاهزة عند إغلاقه.
  onImported() {
    this.page = 1;
    this.load();
  }

  onStockUpdated() {
    this.page = 1;
    this.load();
  }

  indent(level: number): string {
    return '—'.repeat(level) + (level ? ' ' : '');
  }

  openDetail(productId: string) {
    this.detailLoading = true;
    this.selectedProduct = null;
    this.productService.getById(productId).subscribe({
      next: p => { this.selectedProduct = p; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل الصنف'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedProduct = null; }

  warehouseName(warehouseId: string): string {
    return this.warehouseNames.get(warehouseId) || warehouseId;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }
}
