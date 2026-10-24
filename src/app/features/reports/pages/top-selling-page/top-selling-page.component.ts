import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PdfPreviewModalComponent } from '../../../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { InvoicePrintHeaderComponent } from '../../../../shared/components/invoice-print-header/invoice-print-header.component';
import { ReportsService } from '../../services/reports.service';
import { ReportExportService } from '../../services/report-export.service';
import { CategoryService } from '../../../inventory/services/category.service';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { CustomerService } from '../../../parties/services/customer.service';
import { TopSellingItemsReportDto } from '../../models/top-selling-items.model';
import { Category } from '../../../inventory/models/category.model';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-top-selling-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    PdfPreviewModalComponent,
    CustomSelectComponent,
    InvoicePrintHeaderComponent,
  ],
  templateUrl: './top-selling-page.component.html',
  styleUrls: ['./top-selling-page.component.scss'],
})
export class TopSellingPageComponent implements OnInit, OnDestroy {
  today = new Date();
  categories: Category[] = [];
  warehouses: Warehouse[] = [];
  customers: PartyListItem[] = [];

  fromDate: string = '';
  toDate: string = '';
  selectedWarehouseId: string = '';
  selectedCategoryId: string = '';
  selectedCustomerId: string = '';
  sortBy: string = 'Quantity';
  sortDirection: string = 'Desc';
  topCount: number = 20;

  report: TopSellingItemsReportDto | null = null;
  loading: boolean = false;
  error: string = '';

  // PDF Preview Modal
  pdfModalOpen = false;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfBlob: Blob | null = null;
  pdfFileName = '';
  pdfError = '';

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private exportService: ReportExportService,
    private categoryService: CategoryService,
    private warehouseService: WarehouseService,
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
    if (qp.get('partyId') || qp.get('customerId')) this.selectedCustomerId = (qp.get('partyId') || qp.get('customerId'))!;
    if (qp.get('sortBy')) this.sortBy = qp.get('sortBy')!;
    if (qp.get('sortDirection')) this.sortDirection = qp.get('sortDirection')!;
    if (qp.get('topCount')) this.topCount = Number(qp.get('topCount')) || 20;

    this.categoryService.getTree().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {},
    });

    this.warehouseService.getAll().subscribe({
      next: (whs) => (this.warehouses = whs),
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
      .getTopSellingItems({
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        warehouseId: this.selectedWarehouseId || undefined,
        categoryId: this.selectedCategoryId || undefined,
        partyId: this.selectedCustomerId || undefined,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        topCount: this.topCount,
      })
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = friendlyErrorMessage(err, 'حدث خطأ أثناء تحميل تقرير الأصناف الأكثر مبيعاً');
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
    this.sortBy = 'Quantity';
    this.sortDirection = 'Desc';
    this.topCount = 20;
    this.loadReport();
  }

  formatCurrency(val: number): string {
    return (val || 0).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatNumber(val: number): string {
    return (val || 0).toLocaleString('ar-EG');
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
      partyId: this.selectedCustomerId || undefined,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      topCount: this.topCount,
    };

    this.exportService
      .getReportPdf('top-selling-items', filters)
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
      this.exportService.export('top-selling-items', 'pdf', {
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        warehouseId: this.selectedWarehouseId || undefined,
        categoryId: this.selectedCategoryId || undefined,
        partyId: this.selectedCustomerId || undefined,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        topCount: this.topCount,
      }).subscribe();
    }
  }
}
