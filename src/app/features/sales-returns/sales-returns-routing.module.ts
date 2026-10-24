import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'add',
    loadComponent: () =>
      import('./pages/sales-return-add-page/sales-return-add-page.component').then(
        m => m.SalesReturnAddPageComponent,
      ),
  },
  {
    path: 'manage',
    loadComponent: () =>
      import('./pages/sales-return-manage-page/sales-return-manage-page.component').then(
        m => m.SalesReturnManagePageComponent,
      ),
  },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class SalesReturnsRoutingModule {}
