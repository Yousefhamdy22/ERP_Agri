import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HeaderComponent } from './components/header/header.component';
import { NavMenuComponent } from './components/nav-menu/nav-menu.component';
import { ToastComponent } from './components/toast/toast.component';
import { ButtonComponent } from './components/buttons/button.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { QuickActionsPanelComponent } from './components/quick-actions-panel/quick-actions-panel.component';

@NgModule({
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    HeaderComponent, NavMenuComponent, ToastComponent, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent,
  ],
  exports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    HeaderComponent, NavMenuComponent, ToastComponent, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent,
  ],
})
export class SharedModule {}
