import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryHubPageComponent } from './pages/inventory-hub-page/inventory-hub-page.component';
import { CategoryAddPageComponent } from './pages/category-add-page/category-add-page.component';
import { CategoryManagePageComponent } from './pages/category-manage-page/category-manage-page.component';
import { ProductAddPageComponent } from './pages/product-add-page/product-add-page.component';
import { ProductManagePageComponent } from './pages/product-manage-page/product-manage-page.component';
import { ProductPriceUpdatePageComponent } from './pages/product-price-update-page/product-price-update-page.component';
import { BranchAddPageComponent } from './pages/branch-add-page/branch-add-page.component';
import { BranchManagePageComponent } from './pages/branch-manage-page/branch-manage-page.component';
import { WarehouseAddPageComponent } from './pages/warehouse-add-page/warehouse-add-page.component';
import { WarehouseManagePageComponent } from './pages/warehouse-manage-page/warehouse-manage-page.component';
import { WarehouseProductsPageComponent } from './pages/warehouse-products-page/warehouse-products-page.component';
import { CategoryTreeComponent } from './components/category-tree/category-tree.component';

@NgModule({
  imports: [
    SharedModule,
    InventoryRoutingModule,
    InventoryHubPageComponent,
    CategoryAddPageComponent,
    CategoryManagePageComponent,
    ProductAddPageComponent,
    ProductManagePageComponent,
    ProductPriceUpdatePageComponent,
    BranchAddPageComponent,
    BranchManagePageComponent,
    WarehouseAddPageComponent,
    WarehouseManagePageComponent,
    WarehouseProductsPageComponent,
    CategoryTreeComponent,
  ],
})
export class InventoryModule {}
