import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { AccountService } from '../../../../shared/services/account.service';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { Account } from '../../../../shared/models/account.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { SearchableComboBoxComponent, ComboBoxItem } from '../../../../shared/components/searchable-combo-box/searchable-combo-box.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

interface LedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  entryType: string;
  referenceType: string;
  referenceId: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  createdByName: string;
  createdAt: string;
}

interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactionCount: number;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
}

interface LedgerDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountArabicName: string;
  accountType: string;
  accountNature: string;
  periodName: string;
  summary: LedgerSummary;
  entries: LedgerEntry[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Translations for document types
const DOC_TYPE_LABELS: Record<string, string> = {
  SalesInvoice: 'فاتورة مبيعات',
  PurchaseInvoice: 'فاتورة مشتريات',
  Payment: 'سند صرف / قبض',
  Adjustment: 'قيد تسوية',
  OpeningBalance: 'رصيد افتتاحي',
  SalesReturn: 'مرتجع مبيعات',
  PurchaseReturn: 'مرتجع مشتريات'
};

@Component({
  selector: 'app-account-ledger-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    SearchableComboBoxComponent,
    PdfPreviewModalComponent,
    CustomSelectComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './account-ledger-page.component.html',
  styleUrls: ['./account-ledger-page.component.scss']
})
export class AccountLedgerPageComponent implements OnInit, OnDestroy {
  today = new Date();
  fiscalPeriods: FiscalPeriod[] = [];
  accounts: Account[] = [];
  branches: BranchListItem[] = [];

  /** Accounts mapped to ComboBoxItem for the SearchableComboBox */
  accountComboItems: ComboBoxItem[] = [];

  periodsLoading = true;
  accountsLoading = true;

  selectedPeriodId = '';
  selectedAccountId = '';
  selectedBranchId = '';
  fromDate = '';
  toDate = '';
  searchQuery = '';
  referenceType = '';

  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [10, 25, 50, 100];

  report: LedgerDto | null = null;
  loading = false;
  error = '';

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  get startItemIndex(): number {
    if (!this.report?.totalCount) return 0;
    return (this.report.pageNumber - 1) * this.report.pageSize + 1;
  }

  get endItemIndex(): number {
    if (!this.report?.totalCount) return 0;
    return Math.min(this.report.pageNumber * this.report.pageSize, this.report.totalCount);
  }

  onPageSizeChange(newSize: number | string): void {
    this.pageSize = Number(newSize) || 50;
    this.loadReport(1);
  }

  constructor(
    private route: ActivatedRoute,
    private fiscalPeriodService: FiscalPeriodService,
    private accountService: AccountService,
    private reportsService: ReportsService,
    private exportService: ReportExportService,
    private branchService: BranchService
  ) {}

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
  }

  ngOnInit(): void {
    // 1. Fetch Fiscal Periods
    this.fiscalPeriodService.getAll().subscribe({
      next: (periods) => {
        this.fiscalPeriods = periods;
        this.periodsLoading = false;

        // Try to pre-select an open period
        if (periods.length > 0) {
          const open = periods.find((p) => p.status === 'Open');
          this.selectedPeriodId = (open || periods[0]).id;
        }

        // Trigger loading if account is already selected from query/params
        this.checkRouteParams();
      },
      error: () => (this.periodsLoading = false),
    });

    // 2. Fetch Accounts
    this.accountService.getSelectable().subscribe({
      next: (accs) => {
        this.accounts = accs;
        this.accountsLoading = false;
        // Map accounts → ComboBoxItem for SearchableComboBox
        this.accountComboItems = accs.map((a): ComboBoxItem => ({
          id: a.id,
          label: a.nameAr || a.name,
          code: a.accountCode,
        }));
        this.checkRouteParams();
      },
      error: () => (this.accountsLoading = false),
    });

    // 3. Fetch Branches (for branch filter)
    this.branchService.getAll().subscribe({
      next: (branches) => (this.branches = branches),
      error: () => {/* silent — branch filter optional */},
    });
  }

  private checkRouteParams(): void {
    if (this.periodsLoading || this.accountsLoading) return;

    // Check route parameter accountId or query parameter accountId
    const qp = this.route.snapshot.queryParamMap;
    const queryAccountId = qp.get('accountId');
    const queryPeriodId = qp.get('periodId');
    const queryFromDate = qp.get('fromDate');
    const queryToDate = qp.get('toDate');

    if (queryFromDate) this.fromDate = queryFromDate;
    if (queryToDate) this.toDate = queryToDate;
    if (queryPeriodId) this.selectedPeriodId = queryPeriodId;

    this.route.paramMap.subscribe(params => {
      const accountId = params.get('accountId') || queryAccountId;
      if (accountId) {
        this.selectedAccountId = accountId;
        this.loadReport();
      }
    });
  }

  loadReport(page: number = 1): void {
    if (!this.selectedAccountId) return;
    this.currentPage = page;
    this.loading = true;
    this.error = '';
    this.report = null;

    const params: any = {
      periodId: this.selectedPeriodId || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      referenceType: this.referenceType || undefined,
      search: this.searchQuery || undefined,
      branchId: this.selectedBranchId || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.reportsService.getAccountLedger(this.selectedAccountId, params).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل كشف الحساب التفصيلي');
        this.loading = false;
      },
    });
  }

  onAccountChanged(): void {
    this.currentPage = 1;
    this.loadReport();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadReport();
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.searchQuery = '';
    this.referenceType = '';
    this.selectedBranchId = '';
    this.currentPage = 1;
    this.loadReport();
  }

  getDocTypeLabel(type: string): string {
    return DOC_TYPE_LABELS[type] || type;
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
    this.pdfModalOpen = true;
    this.pdfLoading = true;
    this.pdfError = '';

    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
    this.pdfBlob = null;

    const filters: Record<string, unknown> = {
      periodId: this.selectedPeriodId || undefined,
      accountId: this.selectedAccountId || undefined,
      branchId: this.selectedBranchId || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
    };

    this.exportService
      .getReportPdf('general-ledger', filters)
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
    } else {
      this.exportService.export('general-ledger', 'pdf', {
        periodId: this.selectedPeriodId || undefined,
        accountId: this.selectedAccountId || undefined,
        branchId: this.selectedBranchId || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
      }).subscribe();
    }
  }
}
