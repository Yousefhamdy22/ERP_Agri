import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { CategoryTreeComponent } from '../../components/category-tree/category-tree.component';
import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Category, FlatCategory } from '../../models/category.model';
import { ITEMS_QUICK_ACTIONS } from '../../../../shared/data/items-quick-actions';

@Component({
  selector: 'app-category-manage-page',
  templateUrl: './category-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CategoryTreeComponent, TreeSelectComponent],
})
export class CategoryManagePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  loading = false;
  saving = false;
  categories: Category[] = [];
  flatCategories: FlatCategory[] = [];

  quickActions = ITEMS_QUICK_ACTIONS;
  topButton = { label: 'اضافة مجموعة أصناف', icon: 'fa-solid fa-folder-plus', route: '/inventory/categories/add' };

  get categoryOptions(): TreeSelectOption[] {
    return this.flatCategories
      .filter(c => c.categoryId !== this.editingCategory?.categoryId)
      .map(c => ({ value: c.categoryId, label: c.nameAr, level: c.level }));
  }
  editingCategory: Category | null = null;

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    parentCategoryId: [null as string | null],
    description: [''],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'ادارة مجموعات الأصناف' },
  ];

  constructor(
    private categoryService: CategoryService,
    private notify: NotificationService,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.categoryService.getTree().subscribe({
      next: tree => {
        this.categories = tree;
        this.flatCategories = CategoryService.flattenTree(tree);
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل المجموعات');
        this.loading = false;
      },
    });
  }

  startEdit(cat: Category) {
    this.editingCategory = cat;
    this.editForm.setValue({
      name: cat.nameAr || cat.name,
      parentCategoryId: cat.parentCategoryId ?? null,
      description: cat.description ?? '',
    });
  }

  cancelEdit() {
    this.editingCategory = null;
    this.editForm.reset();
  }

  saveEdit() {
    if (this.editForm.invalid || !this.editingCategory) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.editForm.value;
    this.categoryService.update(this.editingCategory.categoryId, {
      name: v.name!,
      parentCategoryId: v.parentCategoryId || null,
      description: v.description || undefined,
    }).subscribe({
      next: () => {
        this.notify.success('تم تحديث المجموعة بنجاح');
        this.editingCategory = null;
        this.saving = false;
        this.load();
      },
      error: () => {
        this.notify.error('تعذّر تحديث المجموعة');
        this.saving = false;
      },
    });
  }

  deleteCategory(cat: Category) {
    if (!confirm(`حذف مجموعة "${cat.nameAr || cat.name}"؟ سيُحذف جميع الفروع التابعة لها أيضاً.`)) return;
    this.categoryService.delete(cat.categoryId).subscribe({
      next: () => {
        this.notify.success('تم حذف المجموعة');
        this.load();
      },
      error: () => this.notify.error('تعذّر حذف المجموعة'),
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.editForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  indent(level: number): string {
    return '—'.repeat(level) + (level ? ' ' : '');
  }

  get totalCount(): number {
    return this.flatCategories.length;
  }
}
