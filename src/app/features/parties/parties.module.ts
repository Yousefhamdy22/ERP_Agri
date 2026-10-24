import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PartiesRoutingModule } from './parties-routing.module';
import { SupplierAddPageComponent } from './pages/supplier-add-page/supplier-add-page.component';
import { SupplierManagePageComponent } from './pages/supplier-manage-page/supplier-manage-page.component';
import { CustomerAddPageComponent } from './pages/customer-add-page/customer-add-page.component';
import { CustomerManagePageComponent } from './pages/customer-manage-page/customer-manage-page.component';
import { PartyStatementPageComponent } from './pages/party-statement-page/party-statement-page.component';
import { PartyPaymentsPageComponent } from './pages/party-payments-page/party-payments-page.component';

@NgModule({
  imports: [
    SharedModule,
    PartiesRoutingModule,
    SupplierAddPageComponent,
    SupplierManagePageComponent,
    CustomerAddPageComponent,
    CustomerManagePageComponent,
    PartyStatementPageComponent,
    PartyPaymentsPageComponent,
  ],
})
export class PartiesModule {}
