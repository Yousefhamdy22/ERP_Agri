import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesHubPageComponent } from './pages/sales-hub-page/sales-hub-page.component';

const routes: Routes = [{ path: '', component: SalesHubPageComponent }];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class SalesRoutingModule {}
