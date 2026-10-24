import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { CategoryService } from '../../../inventory/services/category.service';
import { CustomerService } from '../../../parties/services/customer.service';
import { DetailedSalesReportDto, SalesReportInvoiceDto } from '../../models/detailed-sales-report.model';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { Category } from '../../../inventory/models/category.model';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-sales-detailed-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    PdfPreviewModalComponent,
    CustomSelectComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './sales-detailed-page.component.html',
  styleUrls: ['./sales-detailed-page.component.scss'],
})
export class SalesDetailedPageComponent implements OnInit, OnDestroy {
  today = new Date();
  warehouses: Warehouse[] = [];
  categories: Category[] = [];
  customers: PartyListItem[] = [];

  fromDate: string = '';
  toDate: string = '';
  selectedWarehouseId: string = '';
  selectedCategoryId: string = '';
  selectedCustomerId: string = '';
  invoiceType: string = 'All';
  status: string = '';
  paymentStatus: string = 'All';
  searchTerm: string = '';

  report: DetailedSalesReportDto | null = null;
  loading: boolean = false;
  error: string = '';

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  expandedInvoiceIds: Record<string, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private exportService: ReportExportService,
    private warehouseService: WarehouseService,
    private categoryService: CategoryService,
    private customerService: CustomerService
  ) {}

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = null;
    }
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('fromDate')) this.fromDate = qp.get('fromDate')!;
    if (qp.get('toDate')) this.toDate = qp.get('toDate')!;
    if (qp.get('warehouseId')) this.selectedWarehouseId = qp.get('warehouseId')!;
    if (qp.get('categoryId')) this.selectedCategoryId = qp.get('categoryId')!;
    if (qp.get('customerId')) this.selectedCustomerId = qp.get('customerId')!;
    if (qp.get('invoiceType')) this.invoiceType = qp.get('invoiceType')!;
    if (qp.get('status')) this.status = qp.get('status')!;
    if (qp.get('paymentStatus')) this.paymentStatus = qp.get('paymentStatus')!;
    if (qp.get('searchTerm')) this.searchTerm = qp.get('searchTerm')!;

    this.warehouseService.getAll().subscribe({
      next: (whs) => (this.warehouses = whs),
      error: () => {},
    });

    this.categoryService.getTree().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {},
    });

    this.customerService.getAll('', 1, 200).subscribe({
      next: (res) => (this.customers = res.items),
      error: () => {},
    });

    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.error = '';

    this.reportsService
      .getDetailedSalesReport({
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        warehouseId: this.selectedWarehouseId || undefined,
        categoryId: this.selectedCategoryId || undefined,
        customerId: this.selectedCustomerId || undefined,
        invoiceType: this.invoiceType || undefined,
        status: this.status || undefined,
        paymentStatus: this.paymentStatus || undefined,
        searchTerm: this.searchTerm || undefined,
      })
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل تقرير المبيعات التفصيلي');
          this.loading = false;
        },
      });
  }

  resetFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.selectedWarehouseId = '';
    this.selectedCategoryId = '';
    this.selectedCustomerId = '';
    this.invoiceType = 'All';
    this.status = '';
    this.paymentStatus = 'All';
    this.searchTerm = '';
    this.loadReport();
  }

  toggleInvoice(id: string): void {
    this.expandedInvoiceIds[id] = !this.expandedInvoiceIds[id];
  }

  expandAll(): void {
    if (!this.report) return;
    this.report.invoices.forEach((inv) => (this.expandedInvoiceIds[inv.invoiceId] = true));
  }

  collapseAll(): void {
    this.expandedInvoiceIds = {};
  }

  formatCurrency(val: number): string {
    return (val || 0).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(dStr: string): string {
    if (!dStr) return '';
    return new Date(dStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Confirmed':
      case 'Posted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Draft':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled':
      case 'Reversed':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getStatusAr(status: string): string {
    switch (status) {
      case 'Confirmed':
        return 'مؤكدة';
      case 'Posted':
        return 'مرحلة';
      case 'Draft':
        return 'مسودة';
      case 'Cancelled':
        return 'ملغاة';
      case 'Reversed':
        return 'معكوسة';
      default:
        return status;
    }
  }

  getPaymentStatusAr(status: string): string {
    switch (status) {
      case 'Paid':
        return 'مدفوع';
      case 'PartiallyPaid':
        return 'مدفوع جزئياً';
      case 'Unpaid':
        return 'غير مدفوع';
      default:
        return status;
    }
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
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      warehouseId: this.selectedWarehouseId || undefined,
      categoryId: this.selectedCategoryId || undefined,
      customerId: this.selectedCustomerId || undefined,
      invoiceType: this.invoiceType !== 'All' ? this.invoiceType : undefined,
      status: this.status || undefined,
      paymentStatus: this.paymentStatus !== 'All' ? this.paymentStatus : undefined,
      searchTerm: this.searchTerm || undefined,
    };

    this.exportService
      .getReportPdf('detailed-sales', filters)
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
      this.exportService.export('detailed-sales', 'pdf', {
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        warehouseId: this.selectedWarehouseId || undefined,
        categoryId: this.selectedCategoryId || undefined,
        customerId: this.selectedCustomerId || undefined,
        invoiceType: this.invoiceType !== 'All' ? this.invoiceType : undefined,
        status: this.status || undefined,
        paymentStatus: this.paymentStatus !== 'All' ? this.paymentStatus : undefined,
        searchTerm: this.searchTerm || undefined,
      }).subscribe();
    }
  }
}
