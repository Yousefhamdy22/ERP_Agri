import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PurchaseReturnsRoutingModule } from './purchase-returns-routing.module';
import { PurchaseReturnAddPageComponent } from './pages/purchase-return-add-page/purchase-return-add-page.component';
import { PurchaseReturnManagePageComponent } from './pages/purchase-return-manage-page/purchase-return-manage-page.component';

@NgModule({
  imports: [
    SharedModule,
    PurchaseReturnsRoutingModule,
    PurchaseReturnAddPageComponent,
    PurchaseReturnManagePageComponent,
  ],
})
export class PurchaseReturnsModule {}
