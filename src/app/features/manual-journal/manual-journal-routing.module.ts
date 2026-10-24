import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManualJournalManagePageComponent } from './pages/manual-journal-manage-page/manual-journal-manage-page.component';
import { ManualJournalAddPageComponent } from './pages/manual-journal-add-page/manual-journal-add-page.component';

const routes: Routes = [
  { path: '', component: ManualJournalManagePageComponent },
  { path: 'add', component: ManualJournalAddPageComponent },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class ManualJournalRoutingModule {}
