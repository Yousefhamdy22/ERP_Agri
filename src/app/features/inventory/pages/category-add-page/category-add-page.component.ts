import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FlatCategory } from '../../models/category.model';
import { ITEMS_QUICK_ACTIONS } from '../../../../shared/data/items-quick-actions';

@Component({
  selector: 'app-category-add-page',
  templateUrl: './category-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, TreeSelectComponent],
})
export class CategoryAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  saving = false;
  flatCategories: FlatCategory[] = [];

  quickActions = ITEMS_QUICK_ACTIONS;
  topButton = { label: 'ادارة مجموعات الأصناف', icon: 'fa-solid fa-table-list', route: '/inventory/categories/manage' };

  get categoryOptions(): TreeSelectOption[] {
    return this.flatCategories.map(c => ({ value: c.categoryId, label: c.nameAr, level: c.level }));
  }

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    parentCategoryId: [null as string | null],
    description: [''],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'اضافة مجموعة أصناف' },
  ];

  constructor(
    private categoryService: CategoryService,
    private notify: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.categoryService.getTree().subscribe({
      next: tree => { this.flatCategories = CategoryService.flattenTree(tree); },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  indent(level: number): string {
    return '—'.repeat(level) + (level ? ' ' : '');
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;
    this.categoryService.create({
      name: v.name!,
      parentCategoryId: v.parentCategoryId || null,
      description: v.description || undefined,
    }).subscribe({
      next: () => {
        this.notify.success('تم إضافة مجموعة الأصناف بنجاح');
        this.router.navigate(['/inventory/categories/manage']);
      },
      error: () => {
        this.notify.error('تعذّر إضافة المجموعة');
        this.saving = false;
      },
    });
  }
}
