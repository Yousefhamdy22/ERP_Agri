import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentManagePageComponent } from './pages/payment-manage-page/payment-manage-page.component';
import { PaymentAddPageComponent } from './pages/payment-add-page/payment-add-page.component';

const routes: Routes = [
  { path: '', component: PaymentManagePageComponent },
  { path: 'add', component: PaymentAddPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PaymentsRoutingModule {}
