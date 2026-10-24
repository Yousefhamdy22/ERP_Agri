import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportFormat } from '../../models/report-registry.model';

/**
 * Toolbar for export actions: PDF, Excel, CSV, Print.
 * Displayed above the report data table.
 */
@Component({
  selector: 'app-report-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="report-toolbar" *ngIf="visible">
      <div class="toolbar-title">
        <i [class]="icon"></i>
        <span>{{ titleAr }}</span>
      </div>
      <div class="toolbar-actions">
        <button
          *ngIf="supports('pdf')"
          class="toolbar-btn toolbar-btn--preview"
          (click)="onPreviewPdf()"
          [disabled]="exporting"
          title="معاينة PDF قبل التنزيل"
        >
          <i class="fa-solid fa-eye"></i>
          معاينة PDF
        </button>
        <button
          *ngIf="supports('pdf')"
          class="toolbar-btn toolbar-btn--pdf"
          (click)="onExport('pdf')"
          [disabled]="exporting"
          title="تصدير وتحميل PDF"
        >
          <i class="fa-solid fa-file-pdf"></i>
          تحميل PDF
        </button>
        <button
          *ngIf="supports('excel')"
          class="toolbar-btn toolbar-btn--excel"
          (click)="onExport('excel')"
          [disabled]="exporting"
          title="تصدير Excel"
        >
          <i class="fa-solid fa-file-excel"></i>
          Excel
        </button>
        <button
          *ngIf="supports('csv')"
          class="toolbar-btn toolbar-btn--csv"
          (click)="onExport('csv')"
          [disabled]="exporting"
          title="تصدير CSV"
        >
          <i class="fa-solid fa-file-csv"></i>
          CSV
        </button>
        <button
          *ngIf="supports('print')"
          class="toolbar-btn toolbar-btn--print"
          (click)="onPrint()"
          [disabled]="exporting"
          title="طباعة"
        >
          <i class="fa-solid fa-print"></i>
          طباعة
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./report-toolbar.component.scss'],
})
export class ReportToolbarComponent {
  @Input() titleAr = '';
  @Input() icon = '';
  @Input() visible = false;
  @Input() exporting = false;
  @Input() supportedFormats: ReadonlyArray<ExportFormat> = [];

  @Output() exportRequested = new EventEmitter<ExportFormat>();
  @Output() previewPdfRequested = new EventEmitter<void>();
  @Output() printRequested = new EventEmitter<void>();

  supports(format: ExportFormat): boolean {
    return this.supportedFormats.includes(format);
  }

  onPreviewPdf(): void {
    this.previewPdfRequested.emit();
  }

  onExport(format: ExportFormat): void {
    this.exportRequested.emit(format);
  }

  onPrint(): void {
    this.printRequested.emit();
  }
}
