import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { CustomerService } from '../../services/customer.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PartyListItem } from '../../models/supplier.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';

@Component({
  selector: 'app-customer-manage-page',
  templateUrl: './customer-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent],
})
export class CustomerManagePageComponent implements OnInit {
  customers: PartyListItem[] = [];
  loading = false;
  search = '';

  showDeleteModal = false;
  deleting = false;
  deleteTarget: PartyListItem | null = null;

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'اضافة عميل جديد', icon: 'fa-solid fa-plus', route: '/parties/customers/add' };

  breadcrumbs = [
    { label: 'التوريدات والمبيعات' },
    { label: 'العملاء', route: '/sales?module=sales&tab=def' },
    { label: 'ادارة العملاء' },
  ];

  constructor(
    private customerService: CustomerService,
    private notify: NotificationService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.customerService.getAll().subscribe({
      next: result => { this.customers = result.items; this.loading = false; },
      error: () => { this.notify.error('تعذّر تحميل قائمة العملاء'); this.loading = false; },
    });
  }

  get filtered(): PartyListItem[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  }

  confirmDelete(c: PartyListItem) {
    this.deleteTarget = c;
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
    this.customerService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.notify.success('تم حذف العميل بنجاح');
        this.load();
      },
      error: err => {
        this.deleting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف العميل'));
      },
    });
  }
}
