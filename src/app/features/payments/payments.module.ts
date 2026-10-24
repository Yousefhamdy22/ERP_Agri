import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PaymentsRoutingModule } from './payments-routing.module';
import { PaymentManagePageComponent } from './pages/payment-manage-page/payment-manage-page.component';
import { PaymentAddPageComponent } from './pages/payment-add-page/payment-add-page.component';

@NgModule({
  imports: [
    SharedModule,
    PaymentsRoutingModule,
    PaymentManagePageComponent,
    PaymentAddPageComponent,
  ],
})
export class PaymentsModule {}
