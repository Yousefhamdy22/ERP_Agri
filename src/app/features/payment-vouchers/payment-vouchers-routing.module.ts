import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentVoucherManagePageComponent } from './pages/payment-voucher-manage-page/payment-voucher-manage-page.component';
import { PaymentVoucherAddPageComponent } from './pages/payment-voucher-add-page/payment-voucher-add-page.component';

const routes: Routes = [
  { path: '', component: PaymentVoucherManagePageComponent },
  { path: 'add', component: PaymentVoucherAddPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PaymentVouchersRoutingModule {}
