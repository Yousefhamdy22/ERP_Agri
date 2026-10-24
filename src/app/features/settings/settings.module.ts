import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsHubComponent } from './pages/settings-hub/settings-hub.component';
import { AdminDataManagementPageComponent } from './pages/admin-data-management-page/admin-data-management-page.component';
import { InventoryPolicySettingsComponent } from './pages/inventory-policy-settings/inventory-policy-settings.component';

@NgModule({
  imports: [
    SharedModule,
    SettingsRoutingModule,
    SettingsHubComponent,
    AdminDataManagementPageComponent,
    InventoryPolicySettingsComponent,
  ],
})
export class SettingsModule {}
