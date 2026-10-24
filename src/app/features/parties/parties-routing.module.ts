import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';
import { SupplierAddPageComponent } from './pages/supplier-add-page/supplier-add-page.component';
import { SupplierManagePageComponent } from './pages/supplier-manage-page/supplier-manage-page.component';
import { CustomerAddPageComponent } from './pages/customer-add-page/customer-add-page.component';
import { CustomerManagePageComponent } from './pages/customer-manage-page/customer-manage-page.component';
import { PartyStatementPageComponent } from './pages/party-statement-page/party-statement-page.component';
import { PartyPaymentsPageComponent } from './pages/party-payments-page/party-payments-page.component';

const routes: Routes = [
  { path: 'suppliers/add', component: SupplierAddPageComponent },
  { path: 'suppliers/add/:id', component: SupplierAddPageComponent },
  { path: 'suppliers/manage', component: SupplierManagePageComponent },
  { path: 'customers/add', component: CustomerAddPageComponent },
  { path: 'customers/add/:id', component: CustomerAddPageComponent },
  { path: 'customers/manage', component: CustomerManagePageComponent },
  { path: 'statement', canActivate: [adminGuard], component: PartyStatementPageComponent },
  { path: 'payments', canActivate: [adminGuard], component: PartyPaymentsPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PartiesRoutingModule {}
