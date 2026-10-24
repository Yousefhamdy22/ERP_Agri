import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryHubPageComponent } from './pages/inventory-hub-page/inventory-hub-page.component';
import { CategoryAddPageComponent } from './pages/category-add-page/category-add-page.component';
import { CategoryManagePageComponent } from './pages/category-manage-page/category-manage-page.component';
import { ProductAddPageComponent } from './pages/product-add-page/product-add-page.component';
import { ProductManagePageComponent } from './pages/product-manage-page/product-manage-page.component';
import { ProductEditPageComponent } from './pages/product-edit-page/product-edit-page.component';
import { ProductPriceUpdatePageComponent } from './pages/product-price-update-page/product-price-update-page.component';
import { BranchAddPageComponent } from './pages/branch-add-page/branch-add-page.component';
import { BranchManagePageComponent } from './pages/branch-manage-page/branch-manage-page.component';
import { WarehouseAddPageComponent } from './pages/warehouse-add-page/warehouse-add-page.component';
import { WarehouseManagePageComponent } from './pages/warehouse-manage-page/warehouse-manage-page.component';
import { WarehouseProductsPageComponent } from './pages/warehouse-products-page/warehouse-products-page.component';

const routes: Routes = [
  { path: '', component: InventoryHubPageComponent },
  { path: 'categories/add', component: CategoryAddPageComponent },
  { path: 'categories/manage', component: CategoryManagePageComponent },
  { path: 'products/add', component: ProductAddPageComponent },
  { path: 'products/manage', component: ProductManagePageComponent },
  { path: 'products/edit/:id', component: ProductEditPageComponent },
  { path: 'products/prices', component: ProductPriceUpdatePageComponent },
  { path: 'branches/add', component: BranchAddPageComponent },
  { path: 'branches/manage', component: BranchManagePageComponent },
  { path: 'warehouses/add', component: WarehouseAddPageComponent },
  { path: 'warehouses/manage', component: WarehouseManagePageComponent },
  { path: 'warehouses/products', component: WarehouseProductsPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class InventoryRoutingModule {}
