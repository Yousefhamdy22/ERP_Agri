import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  debitBalance: number;
  creditBalance: number;
  accountType: string;
  isLeaf: boolean;
  level: number;
}

interface TrialBalanceDto {
  periodId: string;
  periodCode: string;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  lines: TrialBalanceLine[];
}

@Component({
  selector: 'app-trial-balance-page',
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
  templateUrl: './trial-balance-page.component.html',
  styleUrls: ['./trial-balance-page.component.scss']
})
export class TrialBalancePageComponent implements OnInit, OnDestroy {
  today = new Date();
  fiscalPeriods: FiscalPeriod[] = [];
  periodsLoading = true;
  selectedPeriodId = '';
  
  report: TrialBalanceDto | null = null;
  loading = false;
  error = '';

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  constructor(
    private fiscalPeriodService: FiscalPeriodService,
    private reportsService: ReportsService,
    private exportService: ReportExportService,
    private route: ActivatedRoute
  ) {}

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
  }

  ngOnInit(): void {
    const qpPeriodId = this.route.snapshot.queryParamMap.get('periodId');
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
  }

  loadReport(): void {
    if (!this.selectedPeriodId) return;
    this.loading = true;
    this.error = '';
    this.report = null;

    this.reportsService.getTrialBalance(this.selectedPeriodId).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل ميزان المراجعة');
        this.loading = false;
      },
    });
  }

  formatCurrency(val: number): string {
    return val.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

    this.exportService
      .getReportPdf('trial-balance', { periodId: this.selectedPeriodId })
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
      this.exportService.export('trial-balance', 'pdf', { periodId: this.selectedPeriodId }).subscribe();
    }
  }
}
