import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) },
  { path: 'sales', canActivate: [authGuard], loadChildren: () => import('./features/sales/sales.module').then(m => m.SalesModule) },
  { path: 'parties', canActivate: [authGuard], loadChildren: () => import('./features/parties/parties.module').then(m => m.PartiesModule) },
  { path: 'invoices', canActivate: [authGuard], loadChildren: () => import('./features/invoices/invoices.module').then(m => m.InvoicesModule) },
  { path: 'dashboard', canActivate: [authGuard], loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'payment-vouchers', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/payment-vouchers/payment-vouchers.module').then(m => m.PaymentVouchersModule) },
  { path: 'accounting', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/accounting/accounting.module').then(m => m.AccountingModule) },
  { path: 'manual-journal', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/manual-journal/manual-journal.module').then(m => m.ManualJournalModule) },
  { path: 'receive-payment', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/receive-payment/receive-payment.module').then(m => m.ReceivePaymentModule) },
  { path: 'purchase-journals', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/purchase-journals/purchase-journals.module').then(m => m.PurchaseJournalsModule) },
  { path: 'purchase-returns', canActivate: [authGuard], loadChildren: () => import('./features/purchase-returns/purchase-returns.module').then(m => m.PurchaseReturnsModule) },
  { path: 'sales-returns', canActivate: [authGuard], loadChildren: () => import('./features/sales-returns/sales-returns.module').then(m => m.SalesReturnsModule) },
  { path: 'payments', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/payments/payments.module').then(m => m.PaymentsModule) },
  { path: 'opening-balance', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/opening-balance/opening-balance.module').then(m => m.OpeningBalanceModule) },
  { path: 'reports', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/reports/reports.module').then(m => m.ReportsModule) },
  { path: 'report/center', redirectTo: 'reports/center', pathMatch: 'full' },
  { path: 'report', redirectTo: 'reports', pathMatch: 'prefix' },
  { path: 'inventory', canActivate: [authGuard], loadChildren: () => import('./features/inventory/inventory.module').then(m => m.InventoryModule) },
  { path: 'access-denied', loadComponent: () => import('./shared/components/access-denied/access-denied.component').then(m => m.AccessDeniedComponent) },
  { path: 'settings', canActivate: [authGuard, adminGuard], loadChildren: () => import('./features/settings/settings.module').then(m => m.SettingsModule) },
  { path: '**', redirectTo: 'dashboard' },
];
