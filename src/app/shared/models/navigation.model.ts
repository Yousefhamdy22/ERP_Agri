export interface Operation {
  label: string;
  icon: string;
  count?: number;
  primary?: boolean;
  route?: string;
}

export interface OperationGroup {
  title: string;
  ops: Operation[];
}

export type TabId = 'def' | 'main' | 'sub' | 'reports';

export interface ModuleDef {
  id: string;
  name: string;
  icon: string;
  route: string;
  kpis: Kpi[];
  tabs: Record<TabId, OperationGroup[]>;
}

export interface NavGroup {
  id: string;
  name: string;
  icon: string;
  subModules: ModuleDef[];
}

export type NavItem = ModuleDef | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'subModules' in item;
}

export interface Kpi {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}
