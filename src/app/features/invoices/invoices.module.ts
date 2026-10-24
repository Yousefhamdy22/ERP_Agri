import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { InvoicesRoutingModule } from './invoices-routing.module';
import { PurchaseInvoiceAddPageComponent } from './pages/purchase-invoice-add-page/purchase-invoice-add-page.component';
import { PurchaseInvoiceManagePageComponent } from './pages/purchase-invoice-manage-page/purchase-invoice-manage-page.component';
import { SalesInvoiceAddPageComponent } from './pages/sales-invoice-add-page/sales-invoice-add-page.component';
import { SalesInvoiceManagePageComponent } from './pages/sales-invoice-manage-page/sales-invoice-manage-page.component';

@NgModule({
  imports: [
    SharedModule,
    InvoicesRoutingModule,
    PurchaseInvoiceAddPageComponent,
    PurchaseInvoiceManagePageComponent,
    SalesInvoiceAddPageComponent,
    SalesInvoiceManagePageComponent,
  ],
})
export class InvoicesModule {}
