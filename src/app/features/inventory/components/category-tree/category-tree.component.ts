import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/category.model';

interface TreeNode {
  category: Category;
  level: number;
  hasChildren: boolean;
}

@Component({
  selector: 'app-category-tree',
  templateUrl: './category-tree.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class CategoryTreeComponent {
  private _categories: Category[] = [];
  nodes: TreeNode[] = [];
  collapsed = new Set<string>();

  @Input() set categories(value: Category[]) {
    this._categories = value;
    this.nodes = this.flatten(value, 0);
  }

  @Output() edit = new EventEmitter<Category>();
  @Output() deleteCategory = new EventEmitter<Category>();

  private flatten(cats: Category[], level: number): TreeNode[] {
    const result: TreeNode[] = [];
    for (const cat of cats) {
      const hasChildren = (cat.children?.length ?? 0) > 0;
      result.push({ category: cat, level, hasChildren });
      if (hasChildren && !this.collapsed.has(cat.categoryId)) {
        result.push(...this.flatten(cat.children!, level + 1));
      }
    }
    return result;
  }

  toggle(id: string) {
    if (this.collapsed.has(id)) {
      this.collapsed.delete(id);
    } else {
      this.collapsed.add(id);
    }
    this.nodes = this.flatten(this._categories, 0);
  }

  isCollapsed(id: string): boolean {
    return this.collapsed.has(id);
  }

  indent(level: number): number {
    return level * 24;
  }
}
