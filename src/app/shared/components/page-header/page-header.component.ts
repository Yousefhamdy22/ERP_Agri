import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { splitRouteQuery } from '../../utils/route-link.util';

export interface Breadcrumb {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class PageHeaderComponent {
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() title = '';
  @Input() icon = '';
  @Input() subtitle = '';
  @Input() showBreadcrumb = true;
  @Input() showTitle = true;

  routePath(route: string): string { return splitRouteQuery(route).path; }
  routeQueryParams(route: string): Record<string, string> { return splitRouteQuery(route).queryParams; }
}
