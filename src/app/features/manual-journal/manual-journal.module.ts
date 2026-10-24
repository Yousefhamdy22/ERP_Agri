import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ManualJournalRoutingModule } from './manual-journal-routing.module';
import { ManualJournalManagePageComponent } from './pages/manual-journal-manage-page/manual-journal-manage-page.component';
import { ManualJournalAddPageComponent } from './pages/manual-journal-add-page/manual-journal-add-page.component';

@NgModule({
  imports: [
    SharedModule,
    ManualJournalRoutingModule,
    ManualJournalManagePageComponent,
    ManualJournalAddPageComponent,
  ],
})
export class ManualJournalModule {}
