import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsHubComponent } from './pages/settings-hub/settings-hub.component';
import { AdminDataManagementPageComponent } from './pages/admin-data-management-page/admin-data-management-page.component';
import { InventoryPolicySettingsComponent } from './pages/inventory-policy-settings/inventory-policy-settings.component';
import { adminGuard } from '../../core/guards/admin.guard';

const routes: Routes = [
  { path: '', component: SettingsHubComponent },
  { path: 'admin-data', canActivate: [adminGuard], component: AdminDataManagementPageComponent },
  { path: 'inventory-policy', canActivate: [adminGuard], component: InventoryPolicySettingsComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class SettingsRoutingModule {}
