import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { PaymentVouchersRoutingModule } from './payment-vouchers-routing.module';
import { PaymentVoucherManagePageComponent } from './pages/payment-voucher-manage-page/payment-voucher-manage-page.component';
import { PaymentVoucherAddPageComponent } from './pages/payment-voucher-add-page/payment-voucher-add-page.component';

@NgModule({
  imports: [
    SharedModule,
    PaymentVouchersRoutingModule,
    PaymentVoucherManagePageComponent,
    PaymentVoucherAddPageComponent,
  ],
})
export class PaymentVouchersModule {}
