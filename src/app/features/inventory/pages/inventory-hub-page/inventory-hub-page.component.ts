import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ModuleDef, Operation, TabId } from '../../../../shared/models/navigation.model';
import { ImportProductsModalComponent } from '../../components/import-products-modal/import-products-modal.component';
import { BulkUpdateStockModalComponent } from '../../components/bulk-update-stock-modal/bulk-update-stock-modal.component';

@Component({
  selector: 'app-inventory-hub-page',
  templateUrl: './inventory-hub-page.component.html',
  standalone: true,
  imports: [CommonModule, ImportProductsModalComponent, BulkUpdateStockModalComponent],
})
export class InventoryHubPageComponent implements OnInit {
  module!: ModuleDef;
  activeTab: TabId = 'def';
  statsOpen = false;
  showImportModal = false;
  importSucceeded = false;
  showBulkUpdateStockModal = false;
  stockUpdateSucceeded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public nav: NavigationService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      this.module = this.nav.getModule(p['module']) ?? this.nav.getModule('items')!;
      this.activeTab = (p['tab'] as TabId) ?? 'def';
    });
  }

  get tabs() {
    return this.nav.tabs.filter(t => (this.module.tabs[t.id as TabId] ?? []).length > 0);
  }
  get groups() { return this.module.tabs[this.activeTab] ?? []; }
  get shortcuts() { return this.nav.shortcuts(this.module.id); }

  setTab(t: TabId) { this.activeTab = t; }
  toggleStats() { this.statsOpen = !this.statsOpen; }

  runOp(op: Operation) {
    if (op.label === 'استيراد من اكسيل الاصناف') { this.importSucceeded = false; this.showImportModal = true; return; }
    if (op.label === 'تحديث كميات المخزون من إكسيل') { this.stockUpdateSucceeded = false; this.showBulkUpdateStockModal = true; return; }
    if (op.route) this.router.navigateByUrl(op.route);
    else this.notify.info(op.label);
  }

  // لا توجد قائمة أصناف في هذه الصفحة (هي شاشة عمليات/اختصارات فقط) — بعد استيراد ناجح
  // فعلياً، يُنقَل المستخدم لصفحة إدارة الأصناف ليرى النتيجة، بدل البقاء هنا بلا تأثير ظاهر.
  onImportModalClosed() {
    this.showImportModal = false;
    if (this.importSucceeded) this.router.navigateByUrl('/inventory/products/manage');
  }

  onBulkUpdateStockModalClosed() {
    this.showBulkUpdateStockModal = false;
    if (this.stockUpdateSucceeded) this.router.navigateByUrl('/inventory/products/manage');
  }
}
