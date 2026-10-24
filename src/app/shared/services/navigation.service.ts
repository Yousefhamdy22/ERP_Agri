import { Injectable } from '@angular/core';
import { MODULES, NAV_ITEMS, TABS } from '../data/modules.config';
import { ModuleDef, NavItem, TabId } from '../models/navigation.model';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly modules = MODULES;
  readonly tabs = TABS;
  readonly navItems: NavItem[] = NAV_ITEMS;

  mobileNavOpen = false;

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  openMobileNav() {
    this.mobileNavOpen = true;
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }

  getModule(id: string): ModuleDef | undefined {
    return this.modules.find(m => m.id === id);
  }
  shortcuts(id: string) {
    const m = this.getModule(id);
    if (!m) return [];
    return [...m.tabs.def, ...m.tabs.main]
      .flatMap(g => g.ops)
      .filter(o => o.primary)
      .slice(0, 6);
  }
}
