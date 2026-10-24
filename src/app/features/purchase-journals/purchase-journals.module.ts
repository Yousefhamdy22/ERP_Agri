import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PurchaseJournalsRoutingModule } from './purchase-journals-routing.module';
import { PurchaseJournalManagePageComponent } from './pages/purchase-journal-manage-page/purchase-journal-manage-page.component';

@NgModule({
  imports: [
    SharedModule,
    PurchaseJournalsRoutingModule,
    PurchaseJournalManagePageComponent,
  ],
})
export class PurchaseJournalsModule {}
