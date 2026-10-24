import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Workbook } from 'exceljs';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { ProductService } from '../../services/product.service';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { ProductByWarehouseItem } from '../../models/product.model';
import { WAREHOUSES_QUICK_ACTIONS } from '../../../../shared/data/warehouses-quick-actions';
import { StockTransactionService } from '../../services/stock-transaction.service';
import { StockMovementDto } from '../../models/stock-transaction.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-warehouse-products-page',
  templateUrl: './warehouse-products-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QuickActionsPanelComponent, InvoicePrintHeaderComponent, CustomSelectComponent,],
})
export class WarehouseProductsPageComponent implements OnInit {
  warehouses: Warehouse[] = [];
  warehouseId = '';
  search = '';

  products: ProductByWarehouseItem[] = [];
  loading = false;
  loadError = false;

  page = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 1;
  hasNextPage = false;
  hasPreviousPage = false;

  exportingExcel = false;
  // تُملأ فقط أثناء تصدير PDF (كل الصفوف المطابقة للبحث الحالي عبر كل الصفحات، وليس فقط
  // الصفحة المعروضة) — تُعرض في جدول مخفي على الشاشة (.print-only-layout) ويظهر أثناء
  // الطباعة فقط عبر .print-root (انظر triggerPrint وstyles.scss).
  exportingPdf = false;
  printRows: ProductByWarehouseItem[] | null = null;

  quickActions = WAREHOUSES_QUICK_ACTIONS;
  topButton = { label: 'ادارة المخازن', icon: 'fa-solid fa-table-list', route: '/inventory/warehouses/manage' };

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'المخازن', route: '/inventory?module=warehouses&tab=def' },
    { label: 'أصناف المخزن' },
  ];

  // Tab state
  activeTab: 'products' | 'transactions' = 'products';

  // Warehouse movements log tab state & pagination
  warehouseMovements: StockMovementDto[] = [];
  loadingMovements = false;
  loadMovementsError = false;
  txPage = 1;
  txPageSize = 20;

  // Filters for warehouse movements log
  movementSearch = '';
  movementTypeFilter = '';
  movementDateFrom = '';
  movementDateTo = '';

  // Specific product transaction history modal state & pagination
  selectedProductForMovements: ProductByWarehouseItem | null = null;
  productMovements: StockMovementDto[] = [];
  loadingProductMovements = false;
  loadProductMovementsError = false;
  modalTxPage = 1;
  modalTxPageSize = 10;

  // Excel export for movements
  exportingTxExcel = false;

  private search$ = new Subject<string>();
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private productService: ProductService,
    private warehouseService: WarehouseService,
    private notify: NotificationService,
    private stockTxService: StockTransactionService,
  ) {}

  ngOnInit() {
    this.warehouseService.getAll().subscribe({
      next: w => {
        this.warehouses = w;
        if (w.length && !this.warehouseId) {
          this.warehouseId = w[0].warehouseId;
          this.load();
        }
      },
      error: () => this.notify.error('تعذّر تحميل قائمة المخازن'),
    });
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
  }

  onWarehouseChange() {
    this.page = 1;
    this.txPage = 1;
    this.products = [];
    this.warehouseMovements = [];
    if (this.warehouseId) {
      if (this.activeTab === 'products') {
        this.load();
      } else {
        this.loadMovements();
      }
    }
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  setTab(tab: 'products' | 'transactions') {
    this.activeTab = tab;
    if (tab === 'products' && this.products.length === 0) {
      this.load();
    } else if (tab === 'transactions' && this.warehouseMovements.length === 0) {
      this.loadMovements();
    }
  }

  loadMovements() {
    if (!this.warehouseId) return;
    this.loadingMovements = true;
    this.loadMovementsError = false;
    this.txPage = 1;
    this.stockTxService.getMovements({
      warehouseId: this.warehouseId,
      from: this.movementDateFrom || undefined,
      to: this.movementDateTo || undefined
    }).subscribe({
      next: data => {
        this.warehouseMovements = data;
        this.loadingMovements = false;
      },
      error: () => {
        this.loadMovementsError = true;
        this.loadingMovements = false;
        this.notify.error('تعذّر تحميل حركات هذا المخزن');
      }
    });
  }

  get filteredMovements(): StockMovementDto[] {
    return this.warehouseMovements.filter(m => {
      const matchSearch = !this.movementSearch ||
        (m.productName && m.productName.toLowerCase().includes(this.movementSearch.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(this.movementSearch.toLowerCase()));
      const matchType = !this.movementTypeFilter || String(m.type) === this.movementTypeFilter;
      return matchSearch && matchType;
    });
  }

  get paginatedMovements(): StockMovementDto[] {
    const start = (this.txPage - 1) * this.txPageSize;
    return this.filteredMovements.slice(start, start + this.txPageSize);
  }

  get txTotalCount(): number {
    return this.filteredMovements.length;
  }

  get txTotalPages(): number {
    return Math.ceil(this.txTotalCount / this.txPageSize) || 1;
  }

  get txHasNextPage(): boolean {
    return this.txPage < this.txTotalPages;
  }

  get txHasPreviousPage(): boolean {
    return this.txPage > 1;
  }

  txNextPage() {
    if (this.txHasNextPage) {
      this.txPage++;
    }
  }

  txPrevPage() {
    if (this.txHasPreviousPage) {
      this.txPage--;
    }
  }

  openProductMovements(product: ProductByWarehouseItem) {
    this.selectedProductForMovements = product;
    this.productMovements = [];
    this.modalTxPage = 1;
    this.loadingProductMovements = true;
    this.loadProductMovementsError = false;
    this.stockTxService.getMovements({
      productId: product.productId,
      warehouseId: this.warehouseId
    }).subscribe({
      next: data => {
        this.productMovements = data;
        this.loadingProductMovements = false;
      },
      error: () => {
        this.loadProductMovementsError = true;
        this.loadingProductMovements = false;
        this.notify.error('تعذّر تحميل حركة الصنف المحدّد');
      }
    });
  }

  get paginatedProductMovements(): StockMovementDto[] {
    const start = (this.modalTxPage - 1) * this.modalTxPageSize;
    return this.productMovements.slice(start, start + this.modalTxPageSize);
  }

  get modalTxTotalCount(): number {
    return this.productMovements.length;
  }

  get modalTxTotalPages(): number {
    return Math.ceil(this.modalTxTotalCount / this.modalTxPageSize) || 1;
  }

  get modalTxHasNext(): boolean {
    return this.modalTxPage < this.modalTxTotalPages;
  }

  get modalTxHasPrev(): boolean {
    return this.modalTxPage > 1;
  }

  modalTxNext() {
    if (this.modalTxHasNext) {
      this.modalTxPage++;
    }
  }

  modalTxPrev() {
    if (this.modalTxHasPrev) {
      this.modalTxPage--;
    }
  }

  closeProductMovements() {
    this.selectedProductForMovements = null;
    this.productMovements = [];
  }

  getTransactionTypeName(type: number | string): string {
    const t = typeof type === 'string' ? type : String(type);
    switch (t) {
      case '1': case 'IN': return 'شراء (وارد)';
      case '2': case 'RETURN': return 'مرتجع مبيعات (وارد)';
      case '3': case 'TRANSFER_IN': return 'تحويل وارد';
      case '4': case 'ADJUSTMENT_IN': return 'تسوية بالزيادة (وارد)';
      case '5': case 'PRODUCTION_IN': return 'إنتاج (وارد)';
      case '10': case 'OUT': return 'بيع (صادر)';
      case '11': case 'PURCHASE_RETURN': return 'مرتجع مشتريات (صادر)';
      case '12': case 'TRANSFER_OUT': return 'تحويل صادر';
      case '13': case 'ADJUSTMENT_OUT': return 'تسوية بالنقص (صادر)';
      case '14': case 'DAMAGED': return 'تالف / هالك (صادر)';
      case '15': case 'EXPIRED': return 'منتهي الصلاحية (صادر)';
      case '16': case 'SAMPLE': return 'عينة (صادر)';
      case '20': case 'RESERVE': return 'حجز مخزني';
      case '21': case 'RELEASE': return 'فك حجز مخزني';
      case '22': case 'CONSUME': return 'استهلاك مخزني';
      default: return `حركة أخرى (${type})`;
    }
  }

  getTransactionTypeClass(type: number | string): string {
    const t = typeof type === 'string' ? type : String(type);
    switch (t) {
      case '1': case 'IN':
      case '2': case 'RETURN':
      case '4': case 'ADJUSTMENT_IN':
      case '5': case 'PRODUCTION_IN':
        return 'bg-[#eaf7f1] text-[#0e9f6e]';
      case '10': case 'OUT':
      case '11': case 'PURCHASE_RETURN':
      case '13': case 'ADJUSTMENT_OUT':
      case '14': case 'DAMAGED':
      case '15': case 'EXPIRED':
      case '16': case 'SAMPLE':
        return 'bg-[#fdeaea] text-danger';
      case '3': case 'TRANSFER_IN':
      case '12': case 'TRANSFER_OUT':
        return 'bg-[#eef2f6] text-[#2b6cb0]';
      default:
        return 'bg-[#f3f4f6] text-[#4b5563]';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  async exportTransactionsExcel() {
    if (!this.warehouseId || this.exportingTxExcel) return;
    this.exportingTxExcel = true;
    try {
      const columns = [
        { header: 'التاريخ', key: 'date', width: 22 },
        { header: 'الصنف', key: 'product', width: 26 },
        { header: 'نوع الحركة', key: 'type', width: 18 },
        { header: 'الكمية', key: 'qty', width: 12 },
        { header: 'سعر الوحدة', key: 'cost', width: 14 },
        { header: 'القيمة الإجمالية', key: 'total', width: 14 },
        { header: 'ملاحظات', key: 'notes', width: 26 },
      ];

      const workbook = new Workbook();
      workbook.creator = 'نظام الفواتير والمخزون';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('سجل حركات المخزن', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
      sheet.columns = columns;

      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEFB' } };
        cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF1F4E78' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB8D9F0' } },
          bottom: { style: 'thin', color: { argb: 'FFB8D9F0' } },
          left: { style: 'thin', color: { argb: 'FFB8D9F0' } },
          right: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        };
      });

      const rowBorder = { style: 'thin' as const, color: { argb: 'FFE7ECF2' } };
      for (const m of this.filteredMovements) {
        const row = sheet.addRow({
          date: this.formatDate(m.date),
          product: m.productName,
          type: this.getTransactionTypeName(m.type),
          qty: m.quantity,
          cost: m.unitCost,
          total: m.totalValue,
          notes: m.notes || '',
        });
        row.eachCell({ includeEmpty: true }, cell => {
          cell.border = { top: rowBorder, bottom: rowBorder, left: rowBorder, right: rowBorder };
          cell.font = { name: 'Arial', size: 11 };
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `حركات_${this.selectedWarehouseName || 'المخزن'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.notify.error('تعذّر تصدير حركات المخزن');
    } finally {
      this.exportingTxExcel = false;
    }
  }

  load() {
    if (!this.warehouseId) return;
    this.loading = true;
    this.loadError = false;
    this.productService.getByWarehouse(this.warehouseId, {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search || undefined,
    }).subscribe({
      next: r => {
        this.products = r.items;
        this.totalCount = r.totalCount;
        this.totalPages = r.totalPages;
        this.hasNextPage = r.hasNextPage;
        this.hasPreviousPage = r.hasPreviousPage;
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
        this.notify.error('تعذّر تحميل أصناف هذا المخزن');
      },
    });
  }

  nextPage() { if (this.hasNextPage) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage) { this.page--; this.load(); } }

  get today(): Date { return new Date(); }

  get selectedWarehouseName(): string {
    return this.warehouses.find(w => w.warehouseId === this.warehouseId)?.nameAr
      || this.warehouses.find(w => w.warehouseId === this.warehouseId)?.name || '';
  }

  async exportExcel() {
    if (!this.warehouseId || this.exportingExcel) return;
    this.exportingExcel = true;
    this.productService.getAllByWarehouse(this.warehouseId, { search: this.search || undefined }).subscribe({
      next: async rows => {
        this.exportingExcel = false;
        await this.buildExcel(rows);
      },
      error: err => {
        this.exportingExcel = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تصدير الأصناف'));
      },
    });
  }

  private async buildExcel(rows: ProductByWarehouseItem[]) {
    const columns = [
      { header: 'الاسم', key: 'name', width: 26 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'الفئة', key: 'category', width: 18 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'سعر التكلفة', key: 'cost', width: 14 },
      { header: 'سعر البيع', key: 'sell', width: 14 },
      { header: 'الكمية المتاحة', key: 'qty', width: 14 },
    ];

    const workbook = new Workbook();
    workbook.creator = 'نظام الفواتير والمخزون';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('أصناف المخزن', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEFB' } };
      cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF1F4E78' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        bottom: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        left: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        right: { style: 'thin', color: { argb: 'FFB8D9F0' } },
      };
    });

    const rowBorder = { style: 'thin' as const, color: { argb: 'FFE7ECF2' } };
    for (const p of rows) {
      const row = sheet.addRow({
        name: p.name, sku: p.sku, category: p.categoryName, unit: p.unit,
        cost: p.costPrice ?? null, sell: p.sellPrice ?? null, qty: p.availableQuantity,
      });
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = { top: rowBorder, bottom: rowBorder, left: rowBorder, right: rowBorder };
        cell.font = { name: 'Arial', size: 11 };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `أصناف_${this.selectedWarehouseName || 'المخزن'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf() {
    if (!this.warehouseId || this.exportingPdf) return;
    this.exportingPdf = true;
    this.printRows = null;
    this.cdr.detectChanges();
    this.productService.getAllByWarehouse(this.warehouseId, { search: this.search || undefined }).subscribe({
      next: rows => {
        this.printRows = rows;
        // نفس نمط printRow في sales-invoice-manage-page: detectChanges() فوراً (بدل الاعتماد
        // فقط على tick العام المؤجَّل من http-error.interceptor) لضمان دخول الصفوف إلى الـ DOM،
        // ثم تأخير triggerPrint() بمهلة (150ms، ليست 0) حتى يُتيح للمتصفح وقتاً فعلياً لعمل
        // layout/paint للعناصر الجديدة قبل التقاطها في معاينة الطباعة — تأخير صفري غير كافٍ
        // (مؤكَّد من فشل حقيقي: الجدول يظهر فارغاً/لا يظهر نافذة الطباعة أصلاً).
        this.cdr.detectChanges();
        window.setTimeout(() => {
          triggerPrint(() => { this.printRows = null; this.exportingPdf = false; this.cdr.detectChanges(); });
        }, 150);
      },
      error: err => {
        this.exportingPdf = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر تجهيز الأصناف للطباعة'));
      },
    });
  }
}
