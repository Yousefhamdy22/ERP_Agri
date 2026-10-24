import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { RevenueExpensesPageComponent } from './pages/revenue-expenses-page/revenue-expenses-page.component';
import { TrialBalancePageComponent } from './pages/trial-balance-page/trial-balance-page.component';
import { AccountLedgerPageComponent } from './pages/account-ledger-page/account-ledger-page.component';
import { ReportCenterPageComponent } from './pages/report-center-page/report-center-page.component';

@NgModule({
  imports: [
    SharedModule,
    ReportsRoutingModule,
    RevenueExpensesPageComponent,
    TrialBalancePageComponent,
    AccountLedgerPageComponent,
    ReportCenterPageComponent,
  ],
})
export class ReportsModule {}
