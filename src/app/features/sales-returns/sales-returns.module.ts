import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SalesReturnsRoutingModule } from './sales-returns-routing.module';

@NgModule({
  imports: [
    SharedModule,
    SalesReturnsRoutingModule,
  ],
})
export class SalesReturnsModule {}
