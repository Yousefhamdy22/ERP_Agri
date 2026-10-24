import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  COMPANY_PRINT_PROFILE,
  DEFAULT_INVOICE_PRINT_OPTIONS,
  CompanyPrintProfile,
  InvoicePrintOptions,
} from '../../config/company-print.config';

@Component({
  selector: 'app-invoice-print-header',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './invoice-print-header.component.html',
})
export class InvoicePrintHeaderComponent {
  @Input() documentTitle = 'فاتورة';
  @Input() documentSubtitle = '';
  @Input() printedAt = new Date();
  @Input() company: CompanyPrintProfile = COMPANY_PRINT_PROFILE;
  @Input() options: InvoicePrintOptions = DEFAULT_INVOICE_PRINT_OPTIONS;

  get contactLine(): string {
    const parts = [
      this.options.showContactLine ? this.company.address : '',
      this.options.showContactLine ? this.company.phone : '',
      this.options.showContactLine ? this.company.email : '',
    ].filter(Boolean);
    return parts.join(' — ');
  }
}
