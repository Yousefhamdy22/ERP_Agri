import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { OpeningBalanceRoutingModule } from './opening-balance-routing.module';
import { OpeningBalanceAddPageComponent } from './pages/opening-balance-add-page/opening-balance-add-page.component';
import { OpeningBalanceManagePageComponent } from './pages/opening-balance-manage-page/opening-balance-manage-page.component';

@NgModule({
  imports: [
    SharedModule,
    OpeningBalanceRoutingModule,
    OpeningBalanceAddPageComponent,
    OpeningBalanceManagePageComponent,
  ],
})
export class OpeningBalanceModule {}
