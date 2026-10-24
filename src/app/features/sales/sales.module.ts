import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SalesRoutingModule } from './sales-routing.module';
import { SalesHubPageComponent } from './pages/sales-hub-page/sales-hub-page.component';

@NgModule({
  imports: [SharedModule, SalesRoutingModule, SalesHubPageComponent],
})
export class SalesModule {}
