import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpeningBalanceAddPageComponent } from './pages/opening-balance-add-page/opening-balance-add-page.component';
import { OpeningBalanceManagePageComponent } from './pages/opening-balance-manage-page/opening-balance-manage-page.component';

const routes: Routes = [
  { path: 'add', component: OpeningBalanceAddPageComponent },
  { path: 'manage', component: OpeningBalanceManagePageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class OpeningBalanceRoutingModule {}
