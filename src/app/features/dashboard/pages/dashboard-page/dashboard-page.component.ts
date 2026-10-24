import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductService } from '../../../inventory/services/product.service';
import { SalesInvoiceService } from '../../../invoices/services/sales-invoice.service';
import { SalesReturnService } from '../../../sales-returns/services/sales-return.service';
import { StockTransactionService } from '../../../inventory/services/stock-transaction.service';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class DashboardPageComponent implements OnInit {
  kpis: any[] = [];
  inventoryKpis: any[] = [];
  loading = true;

  quickActions = [
    { label: 'فاتورة بيع جديدة', icon: 'fa-solid fa-file-invoice-dollar', route: '/invoices/sales/add' },
    { label: 'إضافة صنف جديد', icon: 'fa-solid fa-box-open', route: '/inventory/products/add' },
    { label: 'فاتورة توريد جديدة', icon: 'fa-solid fa-truck-ramp-box', route: '/invoices/purchase/add' },
    { label: 'إضافة عميل جديد', icon: 'fa-solid fa-user-plus', route: '/parties/customers/add' },
    { label: 'تحويل بين المستودعات', icon: 'fa-solid fa-dolly', route: '/inventory?module=warehouses&tab=main' },
    { label: 'تقرير الأرباح والخسائر', icon: 'fa-solid fa-chart-line', route: '/reports' },
  ];

  recent: any[] = [];
  lowStock: any[] = [];

  constructor(
    public nav: NavigationService,
    private router: Router,
    public notify: NotificationService,
    private productService: ProductService,
    private salesInvoiceService: SalesInvoiceService,
    private salesReturnService: SalesReturnService,
    private stockTxService: StockTransactionService,
    public auth: AuthService,
  ) {}

  get visibleQuickActions() {
    if (this.auth.isAdmin) return this.quickActions;
    return this.quickActions.filter(a => !a.route.startsWith('/reports') && !a.route.startsWith('/accounting'));
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    const todayStr = new Date().toISOString().slice(0, 10);

    forkJoin({
      invoices: this.salesInvoiceService.getAll().pipe(catchError(() => of([]))),
      returns: this.salesReturnService.getAll().pipe(catchError(() => of({ count: 0, data: [] }))),
      lowStockProducts: this.productService.getLowStock().pipe(catchError(() => of([]))),
      valuation: this.stockTxService.getValuation().pipe(catchError(() => of([]))),
      allProducts: this.productService.getList({ page: 1, pageSize: 1 }).pipe(catchError(() => of({ totalCount: 0 })))
    }).subscribe({
      next: (res: any) => {
        // 1. Process Sales Invoices
        const invoices = res.invoices || [];
        
        // Receivables: sum of outstanding amounts
        const customerReceivables = invoices.reduce((sum: number, inv: any) => sum + (inv.amountOutstanding || 0), 0);

        // Today's invoices
        const todayInvoices = invoices.filter((inv: any) => inv.invoiceDate && inv.invoiceDate.startsWith(todayStr));
        const todayInvoicesCount = todayInvoices.length;
        
        // Today's sales value (confirmed or paid)
        const todaySalesValue = todayInvoices
          .filter((inv: any) => inv.status === 'Confirmed' || inv.status === 'Paid')
          .reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);

        // Recent Invoices: top 5
        this.recent = invoices.slice(0, 5).map((inv: any) => ({
          no: inv.invoiceNumber,
          customer: inv.customerName,
          amount: inv.grandTotal,
          status: this.getStatusLabel(inv.status),
          cls: this.getStatusClass(inv.status),
          date: inv.invoiceDate
        }));

        // 2. Process Returns
        const returnsList = res.returns?.data || [];
        const totalReturnsValue = returnsList.reduce((sum: number, ret: any) => sum + (ret.returnAmount || 0), 0);

        // 3. Process Low Stock Products
        const lowStockList = res.lowStockProducts || [];
        const lowStockCount = lowStockList.length;
        this.lowStock = lowStockList.slice(0, 5).map((p: any) => ({
          name: p.name,
          sku: p.sku,
          qty: p.totalStock,
          limit: p.reorderLevel,
          deficit: p.deficit
        }));

        // 4. Process Inventory Valuation
        const valuationList = res.valuation || [];
        const totalInventoryValue = valuationList.reduce((sum: number, v: any) => sum + (v.totalValue || 0), 0);

        // 5. Process Products count
        const totalProductsCount = res.allProducts?.totalCount || valuationList.length || 0;

        // Populate KPIs
        if (this.auth.isAdmin) {
          this.kpis = [
            {
              label: 'مبيعات اليوم',
              value: todaySalesValue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }),
              sub: 'الفواتير المؤكدة والمدفوعة',
              color: 'text-emerald-600',
              icon: 'fa-solid fa-sack-dollar',
              iconBg: 'bg-[#eaf7f1]',
              iconColor: 'text-[#0e9f6e]'
            },
            {
              label: 'فواتير اليوم',
              value: `${todayInvoicesCount} فاتورة`,
              sub: 'إجمالي فواتير مبيعات اليوم',
              color: 'text-indigo-600',
              icon: 'fa-solid fa-file-invoice',
              iconBg: 'bg-[#eef0fb]',
              iconColor: 'text-[#5156be]'
            },
            {
              label: 'إجمالي مرتجعات المبيعات',
              value: totalReturnsValue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }),
              sub: 'إرجاع بضائع مباعة',
              color: 'text-amber-600',
              icon: 'fa-solid fa-rotate-left',
              iconBg: 'bg-[#fdf0e6]',
              iconColor: 'text-[#d4830a]'
            },
            {
              label: 'مديونية العملاء المستحقة',
              value: customerReceivables.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }),
              sub: 'مستحقات آجل العملاء المدينين',
              color: 'text-rose-600',
              icon: 'fa-solid fa-hand-holding-dollar',
              iconBg: 'bg-[#fdeaea]',
              iconColor: 'text-[#dc2626]'
            }
          ];
        } else {
          this.kpis = [
            {
              label: 'فواتير اليوم',
              value: `${todayInvoicesCount} فاتورة`,
              sub: 'إجمالي فواتير مبيعات اليوم',
              color: 'text-indigo-600',
              icon: 'fa-solid fa-file-invoice',
              iconBg: 'bg-[#eef0fb]',
              iconColor: 'text-[#5156be]'
            },
            {
              label: 'أصناف تحت حد الطلب',
              value: `${lowStockCount} صنف`,
              sub: 'الكمية المتاحة أقل من حد الطلب',
              color: 'text-amber-600',
              icon: 'fa-solid fa-triangle-exclamation',
              iconBg: 'bg-[#fffbeb]',
              iconColor: 'text-[#d97706]'
            },
            {
              label: 'إجمالي الأصناف',
              value: `${totalProductsCount} صنف`,
              sub: 'عدد المنتجات المعرفة بالنظام',
              color: 'text-emerald-600',
              icon: 'fa-solid fa-boxes-stacked',
              iconBg: 'bg-[#eaf7f1]',
              iconColor: 'text-[#0e9f6e]'
            }
          ];
        }

        // Populate Inventory KPIs
        if (this.auth.isAdmin) {
          this.inventoryKpis = [
            {
              label: 'إجمالي قيمة المخزون',
              value: totalInventoryValue.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }),
              sub: 'التقييم الفعلي لجميع المخازن بالتكلفة',
              icon: 'fa-solid fa-warehouse',
              iconBg: 'bg-[#ecfeff]',
              iconColor: 'text-[#0891b2]'
            },
            {
              label: 'أصناف تحت حد الطلب',
              value: `${lowStockCount} صنف`,
              sub: 'الكمية المتاحة أقل من حد إعادة الطلب',
              icon: 'fa-solid fa-triangle-exclamation',
              iconBg: 'bg-[#fffbeb]',
              iconColor: 'text-[#d97706]'
            },
            {
              label: 'إجمالي الأصناف بالملف',
              value: `${totalProductsCount} صنف`,
              sub: 'عدد المنتجات المعرفة بالنظام',
              icon: 'fa-solid fa-boxes-stacked',
              iconBg: 'bg-[#f0fdf4]',
              iconColor: 'text-[#16a34a]'
            }
          ];
        } else {
          this.inventoryKpis = [
            {
              label: 'أصناف تحت حد الطلب',
              value: `${lowStockCount} صنف`,
              sub: 'الكمية المتاحة أقل من حد إعادة الطلب',
              icon: 'fa-solid fa-triangle-exclamation',
              iconBg: 'bg-[#fffbeb]',
              iconColor: 'text-[#d97706]'
            },
            {
              label: 'إجمالي الأصناف بالملف',
              value: `${totalProductsCount} صنف`,
              sub: 'عدد المنتجات المعرفة بالنظام',
              icon: 'fa-solid fa-boxes-stacked',
              iconBg: 'bg-[#f0fdf4]',
              iconColor: 'text-[#16a34a]'
            }
          ];
        }

        this.loading = false;
      },
      error: () => {
        this.notify.error('حدث خطأ أثناء تحميل بيانات لوحة العمليات');
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      Draft: 'مسودة',
      Confirmed: 'مؤكدة',
      Paid: 'مدفوعة',
      Cancelled: 'ملغاة',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const badges: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-800',
      Confirmed: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-[#4b5563]';
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  run(a: { label: string; route?: string }) {
    if (a.route) this.router.navigateByUrl(a.route);
    else this.notify.info(a.label);
  }
}
