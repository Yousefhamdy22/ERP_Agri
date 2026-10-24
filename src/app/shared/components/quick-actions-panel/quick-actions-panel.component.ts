import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { splitRouteQuery } from '../../utils/route-link.util';

export interface QuickAction {
  label: string;
  icon?: string;
  route?: string;
}

export interface TopActionButton {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-quick-actions-panel',
  templateUrl: './quick-actions-panel.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class QuickActionsPanelComponent {
  @Input() topButton?: TopActionButton;
  @Input() actions: QuickAction[] = [];
  @Input() tips: string[] = [];

  // للصفحات التي تريد ربط إجراء بدون route بسلوك مخصص (مثل فتح modal استيراد) بدل
  // التلميح الافتراضي فقط. إن استمع أحد لهذا الـ output تتوقف رسالة notify.info الافتراضية
  // (عبر Subject.observed) حتى لا تظهر مع الإجراء المخصَّص معاً.
  @Output() actionClick = new EventEmitter<QuickAction>();

  constructor(private notify: NotificationService) {}

  run(action: QuickAction) {
    if (action.route) return;
    this.actionClick.emit(action);
    if (!this.actionClick.observed) this.notify.info(action.label);
  }

  routePath(route: string): string { return splitRouteQuery(route).path; }
  routeQueryParams(route: string): Record<string, string> { return splitRouteQuery(route).queryParams; }
}
