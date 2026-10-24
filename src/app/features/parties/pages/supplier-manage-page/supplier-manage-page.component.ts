import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { SupplierService } from '../../services/supplier.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PartyListItem } from '../../models/supplier.model';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';

@Component({
  selector: 'app-supplier-manage-page',
  templateUrl: './supplier-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent],
})
export class SupplierManagePageComponent implements OnInit {
  suppliers: PartyListItem[] = [];
  loading = false;
  search = '';

  showDeleteModal = false;
  deleting = false;
  deleteTarget: PartyListItem | null = null;

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'اضافة مورد جديد', icon: 'fa-solid fa-plus', route: '/parties/suppliers/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'الموردين', route: '/sales?module=purchases&tab=def' },
    { label: 'ادارة الموردين' },
  ];

  constructor(
    private supplierService: SupplierService,
    private notify: NotificationService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.supplierService.getAll().subscribe({
      next: result => { this.suppliers = result.items; this.loading = false; },
      error: () => { this.notify.error('تعذّر تحميل قائمة الموردين'); this.loading = false; },
    });
  }

  get filtered(): PartyListItem[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.suppliers;
    return this.suppliers.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      (s.phone ?? '').toLowerCase().includes(q)
    );
  }

  confirmDelete(s: PartyListItem) {
    this.deleteTarget = s;
    this.showDeleteModal = true;
  }

  closeDelete() {
    if (this.deleting) return;
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  executeDelete() {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.supplierService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.notify.success('تم حذف المورد بنجاح');
        this.load();
      },
      error: err => {
        this.deleting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف المورد'));
      },
    });
  }
}
