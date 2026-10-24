import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductOption } from '../../../inventory/models/product.model';
import { InvoiceLineInput } from '../../models/invoice.model';
import { ImportedInvoiceItemRow } from '../../models/import-invoice-items.model';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-import-invoice-items-modal',
  templateUrl: './import-invoice-items-modal.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ImportInvoiceItemsModalComponent {
  @Input() products: ProductOption[] = [];
  @Input() existingProductIds: string[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() itemsImported = new EventEmitter<Array<Omit<InvoiceLineInput, 'warehouseId'>>>();

  step: 1 | 2 = 1;
  dragging = false;
  parsing = false;
  rows: ImportedInvoiceItemRow[] = [];

  constructor(private notify: NotificationService) {}

  close() { this.closed.emit(); }

  get validRows(): ImportedInvoiceItemRow[] { return this.rows.filter(r => !r.error); }

  get totalAmount(): number {
    return this.validRows.reduce((sum, r) => {
      const subtotal = r.quantity * r.unitPrice;
      const afterDiscount = subtotal * (1 - r.discountPct / 100);
      return sum + afterDiscount * (1 + r.taxPct / 100);
    }, 0);
  }

  downloadTemplate() {
    const header = ['SKU', 'Quantity', 'UnitPrice', 'Discount%', 'Tax%'];
    const csv = header.join(',');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_items_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.notify.error('صيغة الملف غير مدعومة — استخدم القالب المُحمَّل من هنا (csv.) فقط');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.notify.error('حجم الملف أكبر من الحد المسموح (5 ميجابايت)');
      return;
    }
    this.parseFile(file);
  }

  private parseFile(file: File) {
    this.parsing = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.rows = this.parseCsv(String(reader.result ?? ''));
      this.parsing = false;
      this.step = 2;
    };
    reader.onerror = () => {
      this.notify.error('تعذّر قراءة الملف');
      this.parsing = false;
    };
    reader.readAsText(file, 'utf-8');
  }

  private parseCsv(text: string): ImportedInvoiceItemRow[] {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    // إكسيل يحفظ CSV بفاصلة القائمة المضبوطة في إعدادات النظام الإقليمية — فاصلة (,) في
    // بعض الأنظمة، فاصلة منقوطة (;) في أنظمة أخرى (شائع جداً مع اللغة العربية)، حتى لو
    // كان القالب الأصلي المُحمَّل من هنا يستخدم الفاصلة. بدون اكتشاف تلقائي هنا، يُقرأ
    // السطر بالكامل كخلية واحدة (كل الأعمدة ملتصقة) — هذا بالضبط ما حدث فعلياً.
    const delimiter = this.detectDelimiter(lines[0]);
    const seenProductIds = new Set<string>(this.existingProductIds);
    const result: ImportedInvoiceItemRow[] = [];

    for (const line of lines.slice(1)) {
      const cells = this.splitCsvLine(line, delimiter);
      const sku = (cells[0] ?? '').trim();
      if (!sku) continue;

      const quantity = Number(cells[1] ?? 0);
      const fileUnitPrice = Number(cells[2] ?? 0);
      const discountPct = Number(cells[3] ?? 0) || 0;
      const taxPct = Number(cells[4] ?? 0) || 0;

      const product = this.products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
      const unitPrice = fileUnitPrice > 0 ? fileUnitPrice : (product?.price ?? 0);

      let error: string | null = null;
      if (!product) error = 'SKU غير موجود';
      else if (!quantity || quantity <= 0) error = 'كمية غير صالحة';
      else if (unitPrice <= 0) error = 'سعر غير صالح';

      const duplicate = !!product && seenProductIds.has(product.id);
      if (product) seenProductIds.add(product.id);

      result.push({
        sku, quantity, unitPrice, discountPct, taxPct,
        productId: product?.id ?? null,
        productLabel: product ? product.displayName : sku,
        duplicate,
        error,
      });
    }
    return result;
  }

  private detectDelimiter(headerLine: string): string {
    const candidates = [',', ';', '\t'];
    let best = ',';
    let bestCount = 0;
    for (const d of candidates) {
      const count = headerLine.split(d).length - 1;
      if (count > bestCount) { bestCount = count; best = d; }
    }
    return best;
  }

  private splitCsvLine(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delimiter && !inQuotes) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  }

  removeRow(row: ImportedInvoiceItemRow) {
    this.rows = this.rows.filter(r => r !== row);
  }

  back() {
    this.step = 1;
    this.rows = [];
  }

  confirm() {
    if (!this.validRows.length) { this.notify.error('لا توجد أصناف صالحة للإضافة'); return; }
    this.itemsImported.emit(this.validRows.map(r => ({
      productId: r.productId!,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      discountPct: r.discountPct,
      taxPct: r.taxPct,
      description: null,
    })));
    this.closed.emit();
  }
}
