import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AccountingRoutingModule } from './accounting-routing.module';
import { FiscalPeriodAddPageComponent } from './pages/fiscal-period-add-page/fiscal-period-add-page.component';
import { FiscalPeriodManagePageComponent } from './pages/fiscal-period-manage-page/fiscal-period-manage-page.component';
import { AccountAddPageComponent } from './pages/account-add-page/account-add-page.component';
import { AccountManagePageComponent } from './pages/account-manage-page/account-manage-page.component';
import { CashSafeManagePageComponent } from './pages/cash-safe-manage-page/cash-safe-manage-page.component';
import { BankAccountManagePageComponent } from './pages/bank-account-manage-page/bank-account-manage-page.component';

@NgModule({
  imports: [
    SharedModule,
    AccountingRoutingModule,
    FiscalPeriodAddPageComponent,
    FiscalPeriodManagePageComponent,
    AccountAddPageComponent,
    AccountManagePageComponent,
    CashSafeManagePageComponent,
    BankAccountManagePageComponent,
  ],
})
export class AccountingModule {}
