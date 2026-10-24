import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TreeSelectComponent, type TreeSelectOption } from '../../../../shared/components/tree-select/tree-select.component';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { BranchService } from '../../services/branch.service';
import { BranchListItem } from '../../models/branch.model';
import { SupplierService } from '../../../parties/services/supplier.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FlatCategory } from '../../models/category.model';
import { MeasureUnit, ProductColor, ProductDetail } from '../../models/product.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-product-edit-page',
  templateUrl: './product-edit-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, TreeSelectComponent, CustomSelectComponent,],
})
export class ProductEditPageComponent implements OnInit {
  private fb = inject(FormBuilder);

  productId = '';
  loading = true;
  saving = false;
  flatCategories: FlatCategory[] = [];
  measureUnits: MeasureUnit[] = [];
  colors: ProductColor[] = [];
  branches: BranchListItem[] = [];
  suppliers: PartyListItem[] = [];
  product: ProductDetail | null = null;
  currentTotalQty = 0;

  get categoryOptions(): TreeSelectOption[] {
    return this.flatCategories.map(c => ({ value: c.categoryId, label: c.nameAr, level: c.level }));
  }

  get selectedColorHex(): string | null {
    const id = this.productForm.value.colorId;
    if (!id) return null;
    const c = this.colors.find(x => x.id === id);
    return c ? `#${c.hexCode.replace(/^#/, '')}` : null;
  }

  productForm = this.fb.group({
    name:                ['', [Validators.required, Validators.minLength(2)]],
    categoryId:          ['', [Validators.required]],
    branchId:            ['', [Validators.required]],
    unitId:              [''],
    preferredSupplierId: [''],
    minimumStock:        [null as number | null, [Validators.min(0)]],
    colorId:             [''],
    barcode:             [''],
    taxRatePct:          [null as number | null, [Validators.min(0), Validators.max(100)]],
    reorderLevel:        [null as number | null, [Validators.min(0)]],
    weightKg:            [null as number | null, [Validators.min(0)]],
    costPrice:           [null as number | null, [Validators.min(0)]],
    sellPrice:           [null as number | null, [Validators.min(0)]],
    quantity:            [null as number | null, [Validators.min(0)]],
  });

  breadcrumbs = [
    { label: 'الأصناف والمخازن' },
    { label: 'الأصناف', route: '/inventory?module=items&tab=def' },
    { label: 'تعديل صنف' },
  ];

  constructor(
    private categoryService: CategoryService,
    private productService:  ProductService,
    private branchService:   BranchService,
    private supplierService: SupplierService,
    private notify:          NotificationService,
    private router:          Router,
    private route:           ActivatedRoute,
  ) {}

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id')!;

    this.categoryService.getTree().subscribe({
      next: tree => { this.flatCategories = CategoryService.flattenTree(tree); },
    });
    this.productService.getMeasureUnits().subscribe({
      next: u => { this.measureUnits = u; },
      error: () => {},
    });
    this.productService.getColors().subscribe({
      next: c => { this.colors = c; },
      error: () => {},
    });
    this.branchService.getAll().subscribe({
      next: b => { this.branches = b; if (b.length && !this.productForm.value.branchId) this.productForm.patchValue({ branchId: b[0].id }); },
      error: () => { this.notify.error('تعذّر تحميل قائمة الفروع'); },
    });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });

    this.productService.getById(this.productId).subscribe({
      next: p => {
        this.product = p;
        this.currentTotalQty = p.stockByWarehouse.reduce((sum, s) => sum + s.availableQty + s.reservedQty, 0);
        this.productForm.patchValue({
          name: p.name,
          categoryId: p.categoryId,
          unitId: p.unitOfMeasure || '',
          barcode: p.barcode || '',
          taxRatePct: p.taxRatePct,
          reorderLevel: p.reorderLevel,
          weightKg: p.weightKg,
          minimumStock: null,
          costPrice: p.priceDetail?.currentCostPrice ?? null,
          sellPrice: p.priceDetail?.currentSellPrice ?? null,
          quantity: this.currentTotalQty,
        });
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل بيانات الصنف');
        this.loading = false;
      },
    });
  }

  invalidP(ctrl: string): boolean {
    const c = this.productForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  saveProduct() {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.productForm.value;

    this.productService.update(this.productId, {
      productId:           this.productId,
      name:                v.name!,
      categoryId:          v.categoryId!,
      branchId:            v.branchId!,
      colorId:             v.colorId || null,
      unitId:              v.unitId || '',
      preferredSupplierId: v.preferredSupplierId || null,
      minimumStock:        v.minimumStock ?? 0,
      barcode:             v.barcode || null,
      taxRatePct:          v.taxRatePct ?? 0,
      reorderLevel:        v.reorderLevel ?? 0,
      weightKg:            v.weightKg ?? 0,
      costPrice:           v.costPrice ?? undefined,
      sellPrice:           v.sellPrice ?? undefined,
      newQuantity:         v.quantity ?? undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.notify.success('تم تحديث بيانات الصنف بنجاح');
        this.router.navigate(['/inventory/products/manage']);
      },
      error: () => {
        this.notify.error('تعذّر تحديث بيانات الصنف');
        this.saving = false;
      },
    });
  }
}
