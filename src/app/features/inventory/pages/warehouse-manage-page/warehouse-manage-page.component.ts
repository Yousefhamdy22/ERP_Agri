import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { Warehouse, WarehouseDetail } from '../../../invoices/models/warehouse.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { WAREHOUSES_QUICK_ACTIONS } from '../../../../shared/data/warehouses-quick-actions';

@Component({
  selector: 'app-warehouse-manage-page',
  templateUrl: './warehouse-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent],
})
export class WarehouseManagePageComponent implements OnInit {
  warehouses: Warehouse[] = [];
  loading = false;
  search = '';

  selectedWarehouse: WarehouseDetail | null = null;
  detailLoading = false;

  quickActions = WAREHOUSES_QUICK_ACTIONS;
  topButton = { label: 'اضافة مخزن جديد', icon: 'fa-solid fa-plus', route: '/inventory/warehouses/add' };

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'المخازن', route: '/inventory?module=warehouses&tab=def' },
    { label: 'ادارة المخازن' },
  ];

  constructor(
    private warehouseService: WarehouseService,
    private notify: NotificationService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.warehouseService.getAll().subscribe({
      next: w => { this.warehouses = w; this.loading = false; },
      error: () => { this.notify.error('تعذّر تحميل قائمة المخازن'); this.loading = false; },
    });
  }

  get filtered(): Warehouse[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.warehouses;
    return this.warehouses.filter(w =>
      (w.nameAr ?? '').toLowerCase().includes(q) || (w.name ?? '').toLowerCase().includes(q));
  }

  openDetail(id: string) {
    this.detailLoading = true;
    this.selectedWarehouse = null;
    this.warehouseService.getById(id).subscribe({
      next: w => { this.selectedWarehouse = w; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل المخزن'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedWarehouse = null; }
}
