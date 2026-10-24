import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ReportFilterPanelComponent } from '../../components/report-filter-panel/report-filter-panel.component';
import { ReportToolbarComponent } from '../../components/report-toolbar/report-toolbar.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { ReportRegistryService } from '../../services/report-registry.service';
import { ReportExportService } from '../../services/report-export.service';
import { ReportsService } from '../../services/reports.service';
import {
  ExportFormat,
  ReportCategory,
  ReportCategoryDef,
  ReportDefinition,
} from '../../models/report-registry.model';
import { triggerPrint } from '../../../../shared/utils/print.util';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';

@Component({
  selector: 'app-report-center-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    ReportFilterPanelComponent,
    ReportToolbarComponent,
    PdfPreviewModalComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './report-center-page.component.html',
  styleUrls: ['./report-center-page.component.scss'],
})
export class ReportCenterPageComponent implements OnInit, OnDestroy {
  /** All categories with their reports */
  categories: ReadonlyArray<ReportCategoryDef> = [];
  categoryCounts: ReadonlyMap<ReportCategory, number> = new Map();

  /** Currently active category filter */
  activeCategory: ReportCategory | 'all' = 'all';

  /** Search term in reports list */
  searchTerm = '';

  /** Filtered reports to display */
  displayedReports: ReadonlyArray<ReportDefinition> = [];

  /** Currently selected report (for the detail / export panel) */
  selectedReport: ReportDefinition | null = null;

  /** Current filter values for the selected report */
  currentFilters: Record<string, unknown> = {};

  /** Export state */
  exporting = false;
  exportError = '';
  exportSuccess = '';

  /** On-screen data view state */
  dataLoading = false;
  dataError = '';
  reportData: any = null;
  reportDataKey = '';
  today = new Date();

  /** Table Filtering & Pagination state */
  tableFilter = '';
  currentPage = 1;
  pageSize = 25;
  readonly pageSizeOptions = [10, 25, 50, 100, 500];

  /** PDF Preview Modal state */
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  constructor(
    private registry: ReportRegistryService,
    private exportService: ReportExportService,
    private reportsService: ReportsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.categories = this.registry.categories;
    this.categoryCounts = this.registry.getCategoryCounts();
    this.applyFilters();
  }

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
  }

  // ─── Category & Search ────────────────────────

  selectCategory(category: ReportCategory | 'all'): void {
    // Closes any open report view so that clicking another category returns to the cards grid!
    this.selectedReport = null;
    this.activeCategory = category;
    this.applyFilters();
  }

  onSearchChange(): void {
    if (this.searchTerm.trim()) {
      this.selectedReport = null;
    }
    this.applyFilters();
  }

  // ─── Report Selection ─────────────────────────

  selectReport(report: ReportDefinition): void {
    this.selectedReport = report;
    this.currentFilters = {};
    this.exportError = '';
    this.exportSuccess = '';
    this.dataError = '';
    this.reportData = null;
    this.reportDataKey = '';
    this.tableFilter = '';
    this.currentPage = 1;
  }

  closeReportPanel(): void {
    this.selectedReport = null;
    this.currentFilters = {};
    this.exportError = '';
    this.exportSuccess = '';
    this.dataError = '';
    this.reportData = null;
    this.reportDataKey = '';
    this.tableFilter = '';
    this.currentPage = 1;
  }

  openExistingReport(report: ReportDefinition): void {
    if (report.existingRoute) {
      this.router.navigate([report.existingRoute], {
        queryParams: this.cleanQueryParams(this.currentFilters),
      });
    }
  }

  // ─── Filters ──────────────────────────────────

  onFiltersChange(filters: Record<string, unknown>): void {
    this.currentFilters = filters;
  }

  // ─── Submit Report (عرض التقرير على الشاشة) ─────

  onSubmitReport(filters: Record<string, unknown>): void {
    this.currentFilters = filters;
    this.loadReportData();
  }

  loadReportData(): void {
    if (!this.selectedReport) return;
    const key = this.selectedReport.key;
    this.dataLoading = true;
    this.dataError = '';
    this.reportData = null;
    this.reportDataKey = key;
    this.tableFilter = '';
    this.currentPage = 1;

    const periodId = (this.currentFilters['periodId'] as string) || '';
    const fromDate = (this.currentFilters['fromDate'] as string) || undefined;
    const toDate = (this.currentFilters['toDate'] as string) || undefined;
    const branchId = (this.currentFilters['branchId'] as string) || undefined;
    const warehouseId = (this.currentFilters['warehouseId'] as string) || undefined;
    const categoryId = (this.currentFilters['categoryId'] as string) || undefined;
    const partyId = (this.currentFilters['partyId'] as string) || undefined;
    const customerId = (this.currentFilters['customerId'] as string) || partyId;
    const supplierId = (this.currentFilters['supplierId'] as string) || partyId;
    const accountId = (this.currentFilters['accountId'] as string) || undefined;
    const invoiceType = (this.currentFilters['invoiceType'] as string) || undefined;
    const status = (this.currentFilters['status'] as string) || undefined;
    const paymentStatus = (this.currentFilters['paymentStatus'] as string) || undefined;
    const searchTerm =
      (this.currentFilters['searchTerm'] as string) ||
      (this.currentFilters['search'] as string) ||
      undefined;
    const sortBy = (this.currentFilters['sortBy'] as string) || 'Quantity';
    const sortDirection = (this.currentFilters['sortDirection'] as string) || 'Desc';
    const topCount = Number(this.currentFilters['topCount']) || 20;
    const includeDrafts = !!this.currentFilters['includeDrafts'];
    const hideZeroBalances = !!this.currentFilters['hideZeroBalances'];
    const compareWithPeriodId = (this.currentFilters['compareWithPeriodId'] as string) || undefined;

    let req$: Observable<any> | null = null;

    if (key === 'balance-sheet') {
      if (!periodId) {
        this.dataError = 'يرجى اختيار الفترة المالية لعرض الميزانية العمومية';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getBalanceSheet(periodId);
    } else if (key === 'trial-balance') {
      if (!periodId) {
        this.dataError = 'يرجى اختيار الفترة المالية لعرض ميزان المراجعة';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getTrialBalance(periodId);
    } else if (key === 'income-statement') {
      if (!periodId) {
        this.dataError = 'يرجى اختيار الفترة المالية لعرض قائمة الدخل';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getIncomeStatement({
        periodId,
        fromDate,
        toDate,
        branchId,
        includeDrafts,
        hideZeroBalances,
        compareWithPeriodId,
      });
    } else if (key === 'detailed-revenue-expenses') {
      if (!periodId) {
        this.dataError = 'يرجى اختيار الفترة المالية لعرض تفاصيل الإيرادات والمصروفات';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getDetailedRevenueExpenses(periodId, fromDate, toDate, branchId);
    } else if (key === 'general-ledger') {
      req$ = this.reportsService.getGeneralLedger({ periodId, fromDate, toDate });
    } else if (key === 'top-selling-items') {
      req$ = this.reportsService.getTopSellingItems({
        fromDate,
        toDate,
        branchId,
        warehouseId,
        categoryId,
        partyId,
        sortBy,
        sortDirection,
        topCount,
      });
    } else if (key === 'detailed-sales') {
      req$ = this.reportsService.getDetailedSalesReport({
        fromDate,
        toDate,
        branchId,
        warehouseId,
        customerId,
        productId: (this.currentFilters['productId'] as string) || undefined,
        categoryId,
        invoiceType,
        status,
        paymentStatus,
        searchTerm,
      });
    } else if (key === 'customer-statement' || key === 'supplier-statement') {
      const pid = partyId || customerId || supplierId;
      if (!pid) {
        this.dataError = 'يرجى اختيار العميل أو المورد لعرض كشف الحساب';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getPartyStatement(pid, fromDate, toDate);
    } else if (key === 'stock-balance') {
      if (!warehouseId) {
        this.dataError = 'يرجى اختيار المخزن لعرض أرصدة المخزون';
        this.dataLoading = false;
        return;
      }
      req$ = this.reportsService.getWarehouseStock(warehouseId);
    } else if (key === 'aging-report' || key === 'customer-aging' || key === 'supplier-aging') {
      req$ = this.reportsService.getAgingReport({ accountId, asOfDate: toDate });
    }

    if (req$) {
      req$.subscribe({
        next: (data) => {
          this.reportData = data;
          this.dataLoading = false;
          this.currentPage = 1;
          this.tableFilter = '';
        },
        error: (err) => {
          this.dataLoading = false;
          this.dataError = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل بيانات التقرير');
        },
      });
    } else {
      // For any report where direct JSON is not mapped, automatically open the PDF Preview!
      this.dataLoading = false;
      this.onPreviewPdf();
    }
  }

  // ─── Table Filtering & Pagination ─────────────

  get currentRawRows(): any[] {
    if (!this.reportData) return [];
    if (Array.isArray(this.reportData)) {
      return this.reportData;
    }
    if (this.reportData.invoices && Array.isArray(this.reportData.invoices)) {
      return this.reportData.invoices;
    }
    if (this.reportData.items && Array.isArray(this.reportData.items)) {
      return this.reportData.items;
    }
    if (this.reportData.lines && Array.isArray(this.reportData.lines)) {
      return this.reportData.lines;
    }
    if (this.reportData.details && Array.isArray(this.reportData.details)) {
      return this.reportData.details;
    }
    return [];
  }

  get filteredRows(): any[] {
    const raw = this.currentRawRows;
    if (!this.tableFilter.trim()) return raw;
    const term = this.tableFilter.trim().toLowerCase();
    return raw.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }

  get paginatedRows(): any[] {
    const list = this.filteredRows;
    if (this.pageSize >= list.length) {
      return list;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRows.length / this.pageSize) || 1;
  }

  get totalFilteredCount(): number {
    return this.filteredRows.length;
  }

  get totalRawCount(): number {
    return this.currentRawRows.length;
  }

  get pageStartIndex(): number {
    if (this.totalFilteredCount === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalFilteredCount);
  }

  get isTabularReport(): boolean {
    return this.currentRawRows.length > 0;
  }

  onTableFilterChange(): void {
    this.currentPage = 1;
  }

  onPageSizeChange(size: any): void {
    this.pageSize = Number(size) || 25;
    this.currentPage = 1;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // ─── PDF Preview Modal ─────────────────────────

  onPreviewPdf(filters?: Record<string, unknown>): void {
    if (!this.selectedReport) return;
    if (filters) this.currentFilters = filters;

    this.pdfModalOpen = true;
    this.pdfLoading = true;
    this.pdfError = '';

    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
    this.pdfBlob = null;

    this.exportService
      .getReportPdf(this.selectedReport.key, this.currentFilters)
      .subscribe({
        next: (res) => {
          this.pdfLoading = false;
          this.pdfBlob = res.blob;
          this.pdfFileName = res.fileName;
          this.pdfUrl = res.url;
        },
        error: (err) => {
          this.pdfLoading = false;
          this.pdfError = friendlyErrorMessage(err, 'حدث خطأ أثناء تجهيز ملف PDF للمعاينة');
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

  downloadCurrentPdf(): void {
    if (this.pdfBlob && this.pdfFileName) {
      this.exportService.downloadBlob(this.pdfBlob, this.pdfFileName);
    } else if (this.selectedReport) {
      this.onExport('pdf');
    }
  }

  // ─── Export ───────────────────────────────────

  onExport(format: ExportFormat): void {
    if (!this.selectedReport) return;

    this.exporting = true;
    this.exportError = '';
    this.exportSuccess = '';

    this.exportService
      .export(this.selectedReport.key, format, this.currentFilters)
      .subscribe({
        next: () => {
          this.exporting = false;
          this.exportSuccess = `تم تصدير التقرير بنجاح (${this.formatLabel(format)})`;
          setTimeout(() => (this.exportSuccess = ''), 4000);
        },
        error: (err) => {
          this.exporting = false;
          this.exportError = friendlyErrorMessage(
            err,
            'حدث خطأ أثناء تصدير التقرير'
          );
        },
      });
  }

  onPrint(): void {
    if (this.selectedReport?.existingRoute) {
      this.router.navigateByUrl(this.selectedReport.existingRoute).then(() => {
        setTimeout(() => triggerPrint(), 500);
      });
    } else if (this.reportData) {
      triggerPrint();
    } else {
      this.onPreviewPdf();
    }
  }

  // ─── Helpers ──────────────────────────────────

  formatCurrency(val: number | undefined | null): string {
    if (val === null || val === undefined) return '0.00';
    return Number(val).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  private cleanQueryParams(filters: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val !== null && val !== undefined && val !== '') {
        params[key] = String(val);
      }
    }
    return params;
  }

  private applyFilters(): void {
    let reports = this.registry.reports;

    if (this.activeCategory !== 'all') {
      reports = this.registry.getByCategory(this.activeCategory);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim();
      reports = reports.filter(
        (r) =>
          r.titleAr.includes(term) ||
          r.titleEn.toLowerCase().includes(term.toLowerCase()) ||
          r.descriptionAr.includes(term)
      );
    }

    this.displayedReports = reports;
  }

  formatLabel(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'PDF';
      case 'excel':
        return 'Excel';
      case 'csv':
        return 'CSV';
      case 'print':
        return 'طباعة';
    }
  }

  getCategoryCount(id: ReportCategory): number {
    return this.categoryCounts.get(id) ?? 0;
  }

  get totalReports(): number {
    return this.registry.reports.length;
  }
}
