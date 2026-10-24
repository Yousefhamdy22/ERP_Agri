import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icon = '';
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() customClass = '';

  get classes(): string {
    const base = 'px-4 py-3 text-[14px]';
    const map = {
      primary: 'bg-primary text-white hover:bg-primary-dark',
      ghost: 'bg-white text-[#4b5563] border border-line hover:bg-[#f3f4f7]',
      danger: 'bg-white text-danger border border-[#f3d4d4] hover:bg-[#fdeaea]',
    };
    return base + ' ' + map[this.variant] + (this.fullWidth ? ' w-full' : '') + (this.customClass ? ' ' + this.customClass : '');
  }
}
