import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ReceivePaymentRoutingModule } from './receive-payment-routing.module';
import { ReceiptManagePageComponent } from './pages/receipt-manage-page/receipt-manage-page.component';
import { ReceivePaymentAddPageComponent } from './pages/receive-payment-add-page/receive-payment-add-page.component';

@NgModule({
  imports: [
    SharedModule,
    ReceivePaymentRoutingModule,
    ReceiptManagePageComponent,
    ReceivePaymentAddPageComponent,
  ],
})
export class ReceivePaymentModule {}
