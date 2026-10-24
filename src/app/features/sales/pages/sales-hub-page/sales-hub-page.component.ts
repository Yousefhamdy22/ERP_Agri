import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ModuleDef, Operation, TabId } from '../../../../shared/models/navigation.model';

@Component({
  selector: 'app-sales-hub-page',
  templateUrl: './sales-hub-page.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class SalesHubPageComponent implements OnInit {
  module!: ModuleDef;
  activeTab: TabId = 'main';
  statsOpen = false;
  tabs!: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public nav: NavigationService,
    private notify: NotificationService,
    public auth: AuthService,
  ) {
    this.tabs = this.nav.tabs;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      const modId = p['module'] || 'sales';
      if (!this.auth.isAdmin && (modId === 'accounts' || modId === 'opening-balance' || modId === 'settings' || modId === 'inventory-policy')) {
        this.router.navigate(['/sales'], { queryParams: { module: 'sales', tab: 'main' } });
        return;
      }
      this.module = this.nav.getModule(modId) || this.nav.modules[0];
      this.activeTab = (p['tab'] as TabId) || 'main';
      if (!this.auth.isAdmin && this.activeTab === 'reports') {
        this.activeTab = 'def';
      }
    });
  }

  get visibleTabs() {
    if (this.auth.isAdmin) return this.tabs;
    return this.tabs.filter((t: any) => t.id !== 'reports');
  }

  get visibleKpis() {
    const kpis = this.module?.kpis || [];
    if (this.auth.isAdmin) return kpis;
    return kpis.filter(k =>
      !k.label.includes('مديونية') &&
      !k.label.includes('رصيد') &&
      !k.label.includes('قيمة المخزون')
    );
  }

  get groups() {
    const rawGroups = this.module?.tabs?.[this.activeTab] || [];
    if (this.auth.isAdmin) return rawGroups;

    const blockedRoutes = [
      '/parties/statement',
      '/parties/payments',
      '/accounting',
      '/manual-journal',
      '/payment-vouchers',
      '/payments',
      '/receive-payment',
      '/purchase-journals',
      '/opening-balance',
      '/reports',
      '/settings'
    ];

    return rawGroups.map(g => ({
      ...g,
      ops: g.ops.filter(op => !op.route || !blockedRoutes.some(b => op.route?.startsWith(b)))
    })).filter(g => g.ops.length > 0);
  }

  get shortcuts() {
    const rawShortcuts = this.nav.shortcuts(this.module.id);
    if (this.auth.isAdmin) return rawShortcuts;
    const blockedRoutes = ['/parties/statement', '/parties/payments', '/accounting', '/manual-journal', '/payment-vouchers', '/payments', '/reports', '/settings'];
    return rawShortcuts.filter(op => !op.route || !blockedRoutes.some(b => op.route?.startsWith(b)));
  }

  setTab(t: TabId) { this.activeTab = t; }
  toggleStats() { this.statsOpen = !this.statsOpen; }

  runOp(op: Operation) {
    if (op.route) this.router.navigateByUrl(op.route);
    else this.notify.info(op.label);
  }
}
