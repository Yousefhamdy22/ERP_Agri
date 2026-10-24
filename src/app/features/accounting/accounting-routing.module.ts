import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FiscalPeriodAddPageComponent } from './pages/fiscal-period-add-page/fiscal-period-add-page.component';
import { FiscalPeriodManagePageComponent } from './pages/fiscal-period-manage-page/fiscal-period-manage-page.component';
import { AccountAddPageComponent } from './pages/account-add-page/account-add-page.component';
import { AccountManagePageComponent } from './pages/account-manage-page/account-manage-page.component';
import { CashSafeManagePageComponent } from './pages/cash-safe-manage-page/cash-safe-manage-page.component';
import { BankAccountManagePageComponent } from './pages/bank-account-manage-page/bank-account-manage-page.component';

const routes: Routes = [
  { path: 'fiscal-periods/add', component: FiscalPeriodAddPageComponent },
  { path: 'fiscal-periods/manage', component: FiscalPeriodManagePageComponent },
  { path: 'accounts/add', component: AccountAddPageComponent },
  { path: 'accounts/manage', component: AccountManagePageComponent },
  { path: 'cash-safes/manage', component: CashSafeManagePageComponent },
  { path: 'bank-accounts/manage', component: BankAccountManagePageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AccountingRoutingModule {}
