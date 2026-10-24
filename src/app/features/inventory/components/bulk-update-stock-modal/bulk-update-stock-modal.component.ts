import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workbook } from 'exceljs';
import { ProductService, StockBulkUpdateResult, StockBulkUpdateError } from '../../services/product.service';
import { BranchService } from '../../services/branch.service';
import { BranchListItem, BranchWarehouseOption } from '../../models/branch.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

const SETTINGS_KEY = 'bulk-update-stock-settings';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];

@Component({
  selector: 'app-bulk-update-stock-modal',
  templateUrl: './bulk-update-stock-modal.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent,],
})
export class BulkUpdateStockModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  step: 1 | 2 | 3 = 1;

  branches: BranchListItem[] = [];
  warehouses: BranchWarehouseOption[] = [];
  branchId = '';
  warehouseId = '';

  selectedFile: File | null = null;
  dragging = false;
  uploading = false;
  uploadPercent = 0;
  result: StockBulkUpdateResult | null = null;

  constructor(
    private productService: ProductService,
    private branchService: BranchService,
    private notify: NotificationService,
  ) {
    this.loadSettings();
  }

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length && !this.branchId) {
          this.branchId = b[0].id;
          this.onBranchChange();
        } else if (this.branchId) {
          this.onBranchChange();
        }
      },
      error: () => { this.notify.error('تعذّر تحميل قائمة الفروع'); },
    });
  }

  onBranchChange() {
    if (!this.branchId) {
      this.warehouses = [];
      this.warehouseId = '';
      return;
    }
    this.branchService.getBranchWithWarehouses(this.branchId).subscribe({
      next: res => {
        this.warehouses = res.warehouses || [];
        if (this.warehouses.length) {
          const defaultWh = this.warehouses.find(w => w.isDefault);
          this.warehouseId = defaultWh ? defaultWh.warehouseId : this.warehouses[0].warehouseId;
        } else {
          this.warehouseId = '';
        }
      },
      error: () => { this.notify.error('تعذّر تحميل مخازن الفرع'); }
    });
  }

  getBranchName(id: string): string {
    const branch = this.branches.find(b => b.id === id);
    return branch ? (branch.nameAr || branch.name) : '';
  }

  getWarehouseName(id: string): string {
    const wh = this.warehouses.find(w => w.warehouseId === id);
    return wh ? wh.name : '';
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.branchId) this.branchId = s.branchId;
      if (s.warehouseId) this.warehouseId = s.warehouseId;
    } catch { /* إعدادات محفوظة تالفة — تُتجاهَل */ }
  }

  private saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      branchId: this.branchId,
      warehouseId: this.warehouseId,
    }));
  }

  close() { this.closed.emit(); }

  async downloadTemplate() {
    const columns = [
      { header: 'رمز الصنف (SKU)', key: 'sku', width: 25 },
      { header: 'الكمية الفعلية (Quantity)', key: 'quantity', width: 25 },
    ];

    const workbook = new Workbook();
    workbook.creator = 'نظام الفواتير والمخزون';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('تحديث الكميات', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
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

    const EMPTY_ROWS = 10;
    const rowBorder = { style: 'thin' as const, color: { argb: 'FFE7ECF2' } };
    for (let i = 0; i < EMPTY_ROWS; i++) {
      const row = sheet.addRow({});
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
    a.download = `قالب_تحديث_الكميات_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goToUpload() {
    if (!this.branchId) { this.notify.error('اختر الفرع أولاً'); return; }
    if (!this.warehouseId) { this.notify.error('اختر المخزن أولاً'); return; }
    this.saveSettings();
    this.step = 2;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.dragging = true; }
  onDragLeave() { this.dragging = false; }

  private setFile(file: File | null) {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.notify.error('صيغة الملف غير مدعومة — استخدم xlsx. أو csv.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.notify.error('حجم الملف أكبر من الحد المسموح (5 ميجابايت)');
      return;
    }
    this.selectedFile = file;
  }

  removeFile() { this.selectedFile = null; }

  get outcome(): 'success' | 'partial' | 'failure' {
    const r = this.result;
    if (!r) return 'success';
    if (r.total > 0 && r.updated === 0 && r.errors.length >= r.total) return 'failure';
    if (r.errors.length > 0) return 'partial';
    return 'success';
  }

  get commonErrorMessage(): string | null {
    const errors = this.result?.errors;
    if (!errors?.length) return null;
    const counts = new Map<string, number>();
    for (const e of errors) {
      const key = e.errorMessage || 'خطأ غير معروف';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let top: [string, number] | null = null;
    for (const entry of counts) if (!top || entry[1] > top[1]) top = entry;
    if (top && top[1] / errors.length >= 0.6) return top[0];
    return null;
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  submit() {
    if (!this.selectedFile) return;
    if (!this.branchId) { this.notify.error('اختر الفرع أولاً'); this.step = 1; return; }
    if (!this.warehouseId) { this.notify.error('اختر المخزن أولاً'); this.step = 1; return; }
    this.uploading = true;
    this.uploadPercent = 0;
    this.productService.bulkUpdateStockExcel(
      this.selectedFile,
      this.branchId,
      this.warehouseId
    ).subscribe({
      next: event => {
        if (event.kind === 'progress') { this.uploadPercent = event.percent; return; }
        this.result = event.result;
        this.step = 3;
        this.uploading = false;
        this.updated.emit();
      },
      error: () => { this.notify.error('تعذّر رفع الملف وتحديث الكميات'); this.uploading = false; },
    });
  }

  downloadErrorsReport() {
    if (!this.result?.errors.length) return;
    const header = ['Row Number', 'SKU', 'Error Message'];
    const rows = this.result.errors.map(e => [e.rowNumber, e.sku, e.errorMessage]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_update_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
