import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import { IncomeStatementDto, IncomeStatementSectionDto } from '../../models/income-statement.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import * as Workbook from 'exceljs';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-income-statement-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    PdfPreviewModalComponent,
    CustomSelectComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './income-statement-page.component.html',
  styleUrls: ['./income-statement-page.component.scss']
})
export class IncomeStatementPageComponent implements OnInit, OnDestroy {
  today = new Date();
  fiscalPeriods: FiscalPeriod[] = [];
  branches: BranchListItem[] = [];
  periodsLoading = true;
  
  // Filters
  selectedPeriodId = '';
  selectedBranchId = '';
  fromDate = '';
  toDate = '';
  includeDrafts = false;
  hideZeroBalances = false;
  compareWithPeriodId = '';

  report: IncomeStatementDto | null = null;
  loading = false;
  error = '';

  collapsedSections = new Set<string>();

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  constructor(
    private route: ActivatedRoute,
    private fiscalPeriodService: FiscalPeriodService,
    private branchService: BranchService,
    private reportsService: ReportsService,
    private exportService: ReportExportService
  ) {}

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    // Read any query parameters passed from other pages (e.g., Report Center)
    const qp = this.route.snapshot.queryParamMap;
    const qpPeriodId = qp.get('periodId');
    const qpBranchId = qp.get('branchId');
    const qpFromDate = qp.get('fromDate');
    const qpToDate = qp.get('toDate');
    const qpIncludeDrafts = qp.get('includeDrafts');
    const qpHideZeroBalances = qp.get('hideZeroBalances');

    if (qpBranchId) this.selectedBranchId = qpBranchId;
    if (qpFromDate) this.fromDate = qpFromDate;
    if (qpToDate) this.toDate = qpToDate;
    if (qpIncludeDrafts !== null) this.includeDrafts = qpIncludeDrafts === 'true';
    if (qpHideZeroBalances !== null) this.hideZeroBalances = qpHideZeroBalances === 'true';

    this.periodsLoading = true;
    this.fiscalPeriodService.getAll().subscribe({
      next: (periods) => {
        this.fiscalPeriods = periods;
        this.periodsLoading = false;
        if (periods.length > 0) {
          if (qpPeriodId && periods.some((p) => p.id === qpPeriodId)) {
            this.selectedPeriodId = qpPeriodId;
          } else {
            const open = periods.find((p) => p.status === 'Open');
            this.selectedPeriodId = (open || periods[0]).id;
          }
          this.loadReport();
        }
      },
      error: () => (this.periodsLoading = false),
    });

    this.branchService.getAll().subscribe({
      next: (res: any) => {
        this.branches = Array.isArray(res) ? res : (res?.items || []);
      },
      error: () => {}
    });
  }

  loadReport(): void {
    if (!this.selectedPeriodId) return;
    this.loading = true;
    this.error = '';

    const params = {
      periodId: this.selectedPeriodId,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      branchId: this.selectedBranchId || undefined,
      includeDrafts: this.includeDrafts,
      hideZeroBalances: this.hideZeroBalances,
      compareWithPeriodId: this.compareWithPeriodId || undefined
    };

    this.reportsService.getIncomeStatement(params).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل قائمة الدخل');
        this.loading = false;
      },
    });
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.selectedBranchId = '';
    this.includeDrafts = false;
    this.hideZeroBalances = false;
    this.compareWithPeriodId = '';
    this.loadReport();
  }

  toggleSection(sectionKey: string): void {
    if (this.collapsedSections.has(sectionKey)) {
      this.collapsedSections.delete(sectionKey);
    } else {
      this.collapsedSections.add(sectionKey);
    }
  }

  isSectionCollapsed(sectionKey: string): boolean {
    return this.collapsedSections.has(sectionKey);
  }

  toggleAllSections(): void {
    if (!this.report) return;
    if (this.collapsedSections.size === 0) {
      this.report.sections.forEach(s => this.collapsedSections.add(s.sectionKey));
    } else {
      this.collapsedSections.clear();
    }
  }

  formatCurrency(val: number | undefined | null): string {
    if (val === undefined || val === null) return '0.00';
    return val.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  printReport(): void {
    window.print();
  }

  async exportToExcel(): Promise<void> {
    if (!this.report) return;

    const workbook = new Workbook.Workbook();
    const sheet = workbook.addWorksheet('قائمة الدخل', { views: [{ rightToLeft: true }] });

    // Title Row
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `قائمة الدخل - الفترة ${this.report.periodCode}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Metadata Row
    sheet.mergeCells('A2:E2');
    const metaCell = sheet.getCell('A2');
    metaCell.value = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} | الفرع: ${this.report.branchName || 'كافة الفروع'}`;
    metaCell.font = { name: 'Arial', size: 10, italic: true };
    metaCell.alignment = { horizontal: 'center' };

    sheet.addRow([]); // Empty spacing row

    // KPI Summary Section
    sheet.addRow(['المؤشرات المالية الرئيسية', '', '', '']);
    const kpiHeader = sheet.getRow(4);
    kpiHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    kpiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    sheet.addRow(['صافي المبيعات / الإيرادات', this.report.netSales]);
    sheet.addRow(['تكلفة البضاعة المباعة', this.report.totalCostOfSales]);
    sheet.addRow(['مجمل الربح / الخسارة', this.report.grossProfit, `هامش الربح: ${this.report.grossMarginPercentage}%`]);
    sheet.addRow(['إجمالي المصاريف التشغيلية', this.report.operatingExpensesTotal]);
    sheet.addRow(['الربح التشغيلي (EBIT)', this.report.operatingIncome]);
    sheet.addRow(['صافي الربح / الخسارة النهائي', this.report.netIncome, `صافي الهامش: ${this.report.netMarginPercentage}%`]);

    sheet.addRow([]);

    // Table Header
    const tableHeaderRow = sheet.addRow(['كود الحساب', 'اسم الحساب', 'الرصيد الحالية (ر.س)', 'الرصيد السابقة', 'نسبة التغير %']);
    tableHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    tableHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };

    // Sections & Lines
    for (const sec of this.report.sections) {
      const secRow = sheet.addRow([sec.sectionNameAr, '', sec.sectionTotal, '', '']);
      secRow.font = { bold: true, size: 11 };
      secRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

      for (const line of sec.lines) {
        const indent = ' '.repeat(line.level * 3);
        sheet.addRow([
          line.accountCode,
          indent + line.accountNameAr,
          line.balance,
          line.priorBalance ?? '-',
          line.variancePercentage !== undefined ? `${line.variancePercentage.toFixed(2)}%` : '-'
        ]);
      }
    }

    // Auto-fit Column Widths
    sheet.columns.forEach((col) => {
      col.width = 24;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Income_Statement_${this.report.periodCode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  previewPdf(): void {
    if (!this.selectedPeriodId) return;
    this.pdfModalOpen = true;
    this.pdfLoading = true;
    this.pdfError = '';

    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
    this.pdfBlob = null;

    const filters: Record<string, unknown> = {
      periodId: this.selectedPeriodId,
      branchId: this.selectedBranchId || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      includeDrafts: this.includeDrafts,
      hideZeroBalances: this.hideZeroBalances,
      compareWithPeriodId: this.compareWithPeriodId || undefined,
    };

    this.exportService
      .getReportPdf('income-statement', filters)
      .subscribe({
        next: (res) => {
          this.pdfLoading = false;
          this.pdfBlob = res.blob;
          this.pdfFileName = res.fileName;
          this.pdfUrl = res.url;
        },
        error: (err) => {
          this.pdfLoading = false;
          this.pdfError = friendlyErrorMessage(err, 'حدث خطأ أثناء إنشاء ملف PDF');
        },
      });
  }

  closePdfModal(): void {
    this.pdfModalOpen = false;
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
    this.pdfBlob = null;
    this.pdfError = '';
  }

  downloadPdf(): void {
    if (this.pdfBlob && this.pdfFileName) {
      this.exportService.downloadBlob(this.pdfBlob, this.pdfFileName);
    } else if (this.selectedPeriodId) {
      this.exportService.export('income-statement', 'pdf', {
        periodId: this.selectedPeriodId,
        branchId: this.selectedBranchId || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        includeDrafts: this.includeDrafts,
        hideZeroBalances: this.hideZeroBalances,
        compareWithPeriodId: this.compareWithPeriodId || undefined,
      }).subscribe();
    }
  }
}
