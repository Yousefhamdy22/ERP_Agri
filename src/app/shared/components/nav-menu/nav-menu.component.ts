import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { AuthService } from '../../services/auth.service';
import { ModuleDef, NavGroup, NavItem, Operation, OperationGroup, isNavGroup } from '../../models/navigation.model';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class NavMenuComponent {
  navItems: NavItem[];
  tabs;
  openMenu = '';
  expandedMobileGroup: string | null = null;

  readonly isNavGroup = isNavGroup;

  constructor(
    public nav: NavigationService,
    public auth: AuthService,
    private router: Router
  ) {
    this.navItems = nav.navItems;
    this.tabs = nav.tabs;
  }

  get visibleNavItems(): NavItem[] {
    if (this.auth.isAdmin) {
      return this.navItems;
    }

    // Filter navigation for Staff / Non-Admin
    return this.navItems
      .filter(item => item.id !== 'accounts-group' && item.id !== 'settings-group')
      .map(item => {
        if (!isNavGroup(item)) {
          return this.filterModuleForStaff(item);
        }
        return {
          ...item,
          subModules: item.subModules
            .filter(sub => sub.id !== 'accounts' && sub.id !== 'opening-balance' && sub.id !== 'settings' && sub.id !== 'inventory-policy')
            .map(sub => this.filterModuleForStaff(sub))
        };
      });
  }

  private filterModuleForStaff(m: ModuleDef): ModuleDef {
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

    const filterOps = (ops: Operation[]) => ops.filter(op => {
      if (!op.route) return true;
      return !blockedRoutes.some(blocked => op.route?.startsWith(blocked));
    });

    const filterGroups = (groups: OperationGroup[]) =>
      (groups || [])
        .map(g => ({
          ...g,
          ops: filterOps(g.ops)
        }))
        .filter(g => g.ops.length > 0);

    return {
      ...m,
      kpis: (m.kpis || []).filter(k =>
        !k.label.includes('مديونية') &&
        !k.label.includes('رصيد') &&
        !k.label.includes('قيمة المخزون')
      ),
      tabs: {
        def: filterGroups(m.tabs?.def || []),
        main: filterGroups(m.tabs?.main || []),
        sub: filterGroups(m.tabs?.sub || []),
        reports: [] // Staff should not see accounting/financial reports
      }
    };
  }

  toggle(id: string, ev: MouseEvent) {
    ev.stopPropagation();
    this.openMenu = this.openMenu === id ? '' : id;
  }

  toggleMobileGroup(id: string) {
    this.expandedMobileGroup = this.expandedMobileGroup === id ? null : id;
  }

  closeMobile() {
    this.nav.closeMobileNav();
  }

  logout() {
    this.closeMobile();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  goModule(m: ModuleDef, tabId?: string) {
    this.openMenu = '';
    this.closeMobile();
    this.router.navigate([m.route], { queryParams: { module: m.id, tab: tabId || 'def' } });
  }

  goSubModule(sub: ModuleDef) {
    this.openMenu = '';
    this.closeMobile();
    this.router.navigate([sub.route], { queryParams: { module: sub.id, tab: 'def' } });
  }

  asModule(item: NavItem): ModuleDef { return item as ModuleDef; }
  asGroup(item: NavItem): NavGroup { return item as NavGroup; }

  goOp(op: Operation) {
    this.openMenu = '';
    this.closeMobile();
    if (op.route) this.router.navigateByUrl(op.route);
  }

  shortcuts(id: string): Operation[] {
    const visibleMods = this.visibleNavItems.flatMap(item => isNavGroup(item) ? item.subModules : [item]);
    const m = visibleMods.find(mod => mod.id === id) || this.nav.getModule(id);
    if (!m) return [];
    return [...(m.tabs.def || []), ...(m.tabs.main || [])]
      .flatMap(g => g.ops)
      .filter(o => o.primary)
      .slice(0, 6);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  isGroupActive(group: NavGroup): boolean {
    return group.subModules.some(m => this.router.url.startsWith(m.route));
  }

  @HostListener('document:click')
  onDocClick() {
    this.openMenu = '';
  }
}
