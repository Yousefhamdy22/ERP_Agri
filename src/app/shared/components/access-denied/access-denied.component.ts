import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  templateUrl: './access-denied.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class AccessDeniedComponent {}
