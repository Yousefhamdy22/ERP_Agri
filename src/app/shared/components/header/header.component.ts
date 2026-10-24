import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';
import { GlobalSearchComponent } from '../global-search/global-search.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, GlobalSearchComponent],
})
export class HeaderComponent {
  constructor(
    public auth: AuthService,
    public nav: NavigationService,
    private router: Router,
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
