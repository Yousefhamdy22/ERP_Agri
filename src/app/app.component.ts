import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { NavMenuComponent } from './shared/components/nav-menu/nav-menu.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, NavMenuComponent, ToastComponent],
})
export class AppComponent {
  hideChrome = false;

  constructor(private router: Router) {
    this.hideChrome = this.router.url.startsWith('/login');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.hideChrome = this.router.url.startsWith('/login');
    });
  }
}
