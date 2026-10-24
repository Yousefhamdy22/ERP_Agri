import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { BranchService } from '../../../inventory/services/branch.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import {
  DetailedRevenueExpensesDto,
  RevenueExpenseSectionDto,
  MonthlyTrendDto,
} from '../../models/detailed-revenue-expenses.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-revenue-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    PdfPreviewModalComponent,
    CustomSelectComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './revenue-expenses-page.component.html',
  styleUrls: ['./revenue-expenses-page.component.scss'],
})
export class RevenueExpensesPageComponent implements OnInit, OnDestroy {
  today = new Date();
  fiscalPeriods: FiscalPeriod[] = [];
  branches: BranchListItem[] = [];
  periodsLoading = true;
  branchesLoading = true;

  selectedPeriodId = '';
  selectedBranchId = '';
  fromDate = '';
  toDate = '';

  report: DetailedRevenueExpensesDto | null = null;
  loading = false;
  error = '';

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  expandedSections: Record<string, boolean> = {
    revenue: true,
    cost_of_sales: true,
    expenses: true,
  };

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
    const qp = this.route.snapshot.queryParamMap;
    const qpPeriodId = qp.get('periodId');
    const qpBranchId = qp.get('branchId');
    const qpFromDate = qp.get('fromDate');
    const qpToDate = qp.get('toDate');

    if (qpBranchId) this.selectedBranchId = qpBranchId;
    if (qpFromDate) this.fromDate = qpFromDate;
    if (qpToDate) this.toDate = qpToDate;

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
      next: (b) => {
        this.branches = b;
        this.branchesLoading = false;
      },
      error: () => (this.branchesLoading = false),
    });
  }

  loadReport(): void {
    if (!this.selectedPeriodId) return;
    this.loading = true;
    this.error = '';
    this.report = null;

    this.reportsService
      .getDetailedRevenueExpenses(
        this.selectedPeriodId,
        this.fromDate || undefined,
        this.toDate || undefined,
        this.selectedBranchId || undefined
      )
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل التقرير');
          this.loading = false;
        },
      });
  }

  toggleSection(key: string): void {
    this.expandedSections[key] = !this.expandedSections[key];
  }

  formatCurrency(val: number): string {
    return val.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getBarWidth(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.min(Math.abs(value / max) * 100, 100);
  }

  getMaxTrendValue(): number {
    if (!this.report) return 0;
    return Math.max(
      ...this.report.monthlyTrend.map((m) =>
        Math.max(m.revenue, m.costOfSales, m.expenses)
      ),
      1
    );
  }

  printReport(): void {
    window.print();
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
    };

    this.exportService
      .getReportPdf('detailed-revenue-expenses', filters)
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
      this.exportService.export('detailed-revenue-expenses', 'pdf', {
        periodId: this.selectedPeriodId,
        branchId: this.selectedBranchId || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
      }).subscribe();
    }
  }
}
