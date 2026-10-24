import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceiptManagePageComponent } from './pages/receipt-manage-page/receipt-manage-page.component';
import { ReceivePaymentAddPageComponent } from './pages/receive-payment-add-page/receive-payment-add-page.component';

const routes: Routes = [
  { path: '', component: ReceiptManagePageComponent },
  { path: 'add', component: ReceivePaymentAddPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ReceivePaymentRoutingModule {}
