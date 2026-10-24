import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RevenueExpensesPageComponent } from './pages/revenue-expenses-page/revenue-expenses-page.component';
import { TrialBalancePageComponent } from './pages/trial-balance-page/trial-balance-page.component';
import { AccountLedgerPageComponent } from './pages/account-ledger-page/account-ledger-page.component';
import { IncomeStatementPageComponent } from './pages/income-statement-page/income-statement-page.component';
import { TopSellingPageComponent } from './pages/top-selling-page/top-selling-page.component';
import { SalesDetailedPageComponent } from './pages/sales-detailed-page/sales-detailed-page.component';
import { ReportCenterPageComponent } from './pages/report-center-page/report-center-page.component';

const routes: Routes = [
  { path: 'center', component: ReportCenterPageComponent },
  { path: 'income-statement', component: IncomeStatementPageComponent },
  { path: 'revenue-expenses', component: RevenueExpensesPageComponent },
  { path: 'trial-balance', component: TrialBalancePageComponent },
  { path: 'account-ledger', component: AccountLedgerPageComponent },
  { path: 'account-ledger/:accountId', component: AccountLedgerPageComponent },
  { path: 'top-selling', component: TopSellingPageComponent },
  { path: 'sales-detailed', component: SalesDetailedPageComponent },
  { path: '', redirectTo: 'center', pathMatch: 'full' },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ReportsRoutingModule {}
