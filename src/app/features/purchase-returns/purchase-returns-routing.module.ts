import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseReturnAddPageComponent } from './pages/purchase-return-add-page/purchase-return-add-page.component';
import { PurchaseReturnManagePageComponent } from './pages/purchase-return-manage-page/purchase-return-manage-page.component';

const routes: Routes = [
  { path: 'add', component: PurchaseReturnAddPageComponent },
  { path: 'manage', component: PurchaseReturnManagePageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PurchaseReturnsRoutingModule {}
