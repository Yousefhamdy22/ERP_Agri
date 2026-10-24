import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseJournalManagePageComponent } from './pages/purchase-journal-manage-page/purchase-journal-manage-page.component';

const routes: Routes = [
  { path: '', component: PurchaseJournalManagePageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PurchaseJournalsRoutingModule {}
