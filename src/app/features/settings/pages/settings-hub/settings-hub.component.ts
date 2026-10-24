import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../../shared/services/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SETTING_CATEGORIES, SETTINGS_ITEMS, SettingCategory, SettingItem } from '../../models/settings-registry.model';

@Component({
  selector: 'app-settings-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  templateUrl: './settings-hub.component.html',
  styleUrls: ['./settings-hub.component.scss'],
})
export class SettingsHubComponent implements OnInit {
  searchTerm = '';
  selectedCategory = 'all';

  readonly categories: SettingCategory[] = SETTING_CATEGORIES;
  readonly allSettings: SettingItem[] = SETTINGS_ITEMS;

  breadcrumbs = [
    { label: 'الرئيسية', route: '/dashboard' },
    { label: 'الإعدادات' },
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {}

  get activeCount(): number {
    return this.allSettings.filter(s => s.status === 'active').length;
  }

  get totalCount(): number {
    return this.allSettings.length;
  }

  get filteredSettings(): SettingItem[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    return this.allSettings.filter(item => {
      // Category filter
      if (this.selectedCategory !== 'all' && item.category !== this.selectedCategory) {
        return false;
      }

      // Search filter
      if (!term) return true;

      const inTitleAr = item.titleAr.toLowerCase().includes(term);
      const inTitleEn = item.titleEn.toLowerCase().includes(term);
      const inDesc = item.descriptionAr.toLowerCase().includes(term);
      const inTags = item.tags.some(t => t.toLowerCase().includes(term));

      return inTitleAr || inTitleEn || inDesc || inTags;
    });
  }

  getCategoryCount(catId: string): number {
    if (catId === 'all') return this.allSettings.length;
    return this.allSettings.filter(s => s.category === catId).length;
  }

  selectCategory(id: string) {
    this.selectedCategory = id;
  }

  openSetting(item: SettingItem) {
    if (item.status === 'active' && item.route) {
      if (item.adminOnly && !this.auth.isAdmin) {
        this.notify.error('هذا الإعداد يتطلب صلاحيات مدير النظام (Admin)');
        return;
      }
      this.router.navigateByUrl(item.route);
    } else {
      this.notify.info(`قسم "${item.titleAr}" قيد التجهيز وسيتم تفعيله في التحديثات القادمة`);
    }
  }
}
