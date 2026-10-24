import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workbook } from 'exceljs';
import { ProductService } from '../../services/product.service';
import { BranchService } from '../../services/branch.service';
import { BranchListItem } from '../../models/branch.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ImportProductsResult } from '../../models/import.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

const SETTINGS_KEY = 'import-products-settings';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];

@Component({
  selector: 'app-import-products-modal',
  templateUrl: './import-products-modal.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent,],
})
export class ImportProductsModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  step: 1 | 2 | 3 = 1;

  branches: BranchListItem[] = [];
  branchId = '';
  createSalePriceAutomatically = true;
  defaultMarkupPercentage = 100;
  overwriteExisting = false;
  createIfNotExist = true;

  selectedFile: File | null = null;
  dragging = false;
  uploading = false;
  uploadPercent = 0;
  result: ImportProductsResult | null = null;

  constructor(
    private productService: ProductService,
    private branchService: BranchService,
    private notify: NotificationService,
  ) {
    this.loadSettings();
  }

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.branchId) this.branchId = b[0].id; },
      error: () => { this.notify.error('تعذّر تحميل قائمة الفروع'); },
    });
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.createSalePriceAutomatically === 'boolean') this.createSalePriceAutomatically = s.createSalePriceAutomatically;
      if (typeof s.defaultMarkupPercentage === 'number') this.defaultMarkupPercentage = s.defaultMarkupPercentage;
    } catch { /* إعدادات محفوظة تالفة — تُتجاهَل وتُستخدم القيم الافتراضية */ }
  }

  private saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      createSalePriceAutomatically: this.createSalePriceAutomatically,
      defaultMarkupPercentage: this.defaultMarkupPercentage,
    }));
  }

  close() { this.closed.emit(); }

  // لا يوجد endpoint حقيقي لتحميل قالب فارغ (كان GET /Products/template تخميناً غير
  // مؤكَّد) — القالب هنا ملف ثابت لا يحتاج أي استدعاء شبكة أصلاً، فيُبنى محلياً كملف
  // Excel حقيقي (.xlsx) بنفس ترتيب الأعمدة المطلوب من الباك ايند، برؤوس عربية وتنسيق واضح.
  async downloadTemplate() {
    const columns = [
      { header: 'رمز الصنف (SKU)', key: 'sku', width: 18 },
      { header: 'اسم الصنف', key: 'name', width: 26 },
      { header: 'الوصف', key: 'description', width: 30 },
      { header: 'المجموعة', key: 'category', width: 18 },
      { header: 'الوحدة', key: 'unit', width: 12 },
      { header: 'اللون', key: 'color', width: 12 },
      { header: 'الحد الأدنى للكمية', key: 'minQty', width: 16 },
      { header: 'كمية إعادة الطلب', key: 'reorderQty', width: 16 },
      { header: 'سعر البيع 1', key: 'sellPrice1', width: 14 },
      { header: 'سعر البيع 2', key: 'sellPrice2', width: 14 },
      { header: 'المورد', key: 'supplier', width: 18 },
      { header: 'الكمية الافتتاحية (اتركها 0 للربط المحاسبي)', key: 'initialQty', width: 32 },
    ];

    const workbook = new Workbook();
    workbook.creator = 'نظام الفواتير والمخزون';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('الأصناف', {
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

    const EMPTY_ROWS = 40;
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
    a.download = `قالب_استيراد_الأصناف_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goToUpload() {
    if (!this.branchId) { this.notify.error('اختر الفرع أولاً'); return; }
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

  // يميّز بين نجاح كامل/جزئي/فشل كامل بدل عرض علامة صح خضراء ثابتة دائماً — حالة
  // فشل كل صفوف الملف (created=updated=0 وكل الصفوف بها أخطاء) كانت تُعرض بنفس
  // رسالة "اكتمل الاستيراد" المضلِّلة.
  get importOutcome(): 'success' | 'partial' | 'failure' {
    const r = this.result;
    if (!r) return 'success';
    if (r.total > 0 && r.created === 0 && r.updated === 0 && r.errors.length >= r.total) return 'failure';
    if (r.errors.length > 0) return 'partial';
    return 'success';
  }

  // عند فشل معظم الصفوف بنفس السبب (مثال: عمود مفقود، فرع غير صالح)، عرض هذا السبب
  // مرة واحدة أوضح بكثير من سرد نفس الرسالة عشرات المرات في جدول أخطاء طويل.
  get commonErrorMessage(): string | null {
    const errors = this.result?.errors;
    if (!errors?.length) return null;
    const counts = new Map<string, number>();
    for (const e of errors) {
      const key = e.error || 'خطأ غير معروف';
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
    this.uploading = true;
    this.uploadPercent = 0;
    this.productService.importExcel({
      file: this.selectedFile,
      branchId: this.branchId,
      overwriteExisting: this.overwriteExisting,
      createIfNotExist: this.createIfNotExist,
      defaultMarkupPercentage: this.defaultMarkupPercentage,
      createSalePriceAutomatically: this.createSalePriceAutomatically,
    }).subscribe({
      next: event => {
        if (event.kind === 'progress') { this.uploadPercent = event.percent; return; }
        this.result = event.result;
        this.step = 3;
        this.uploading = false;
        this.imported.emit();
      },
      error: () => { this.notify.error('تعذّر استيراد الملف'); this.uploading = false; },
    });
  }

  // يُنزَّل كملف CSV منفصل يحتوي فقط على الصفوف الفاشلة (SKU/الاسم/الخطأ) — يسمح بإصلاحها
  // في إكسيل وإعادة رفعها فقط بدل الملف الكامل مرة أخرى.
  downloadErrorsReport() {
    if (!this.result?.errors.length) return;
    const header = ['SKU', 'Name', 'Error'];
    const rows = this.result.errors.map(e => [e.sku, e.name || '', e.error]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
