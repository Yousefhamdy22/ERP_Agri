import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseInvoiceAddPageComponent } from './pages/purchase-invoice-add-page/purchase-invoice-add-page.component';
import { PurchaseInvoiceManagePageComponent } from './pages/purchase-invoice-manage-page/purchase-invoice-manage-page.component';
import { SalesInvoiceAddPageComponent } from './pages/sales-invoice-add-page/sales-invoice-add-page.component';
import { SalesInvoiceManagePageComponent } from './pages/sales-invoice-manage-page/sales-invoice-manage-page.component';

const routes: Routes = [
  { path: 'purchase/add', component: PurchaseInvoiceAddPageComponent },
  { path: 'purchase/manage', component: PurchaseInvoiceManagePageComponent },
  { path: 'sales/add', component: SalesInvoiceAddPageComponent },
  { path: 'sales/manage', component: SalesInvoiceManagePageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class InvoicesRoutingModule {}
