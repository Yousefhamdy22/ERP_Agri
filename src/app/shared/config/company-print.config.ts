/** Company branding shown on printed invoices and documents. Edit this file to customize. */
export interface CompanyPrintProfile {
  name: string;
  nameEn?: string;
  tagline?: string;
  /** Path under public/ or full URL. Example: '/company-logo.png' */
  logoUrl?: string | null;
  /** Font Awesome icon class when logoUrl is not set */
  logoIcon?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  website?: string;
}

export interface InvoicePrintOptions {
  showLogo: boolean;
  showTagline: boolean;
  showContactLine: boolean;
  showTaxId: boolean;
  showPrintDate: boolean;
  footerNote?: string;
}

export const COMPANY_PRINT_PROFILE: CompanyPrintProfile = {
  name: 'المؤسسة الزراعية التجارية',
  nameEn: 'Agricultural & Commercial Establishment',
  tagline: 'للتجارة والتوزيع والتوريدات الزراعية',
  logoUrl: '/inventoryLogo.jpeg',
  logoIcon: 'fa-solid fa-seedling',
  address: 'الفيوم',
  phone: '010 61923444 / +20 10 61923444',
  email: 'mostafa_171188@yahoo.com',
};

export const DEFAULT_INVOICE_PRINT_OPTIONS: InvoicePrintOptions = {
  showLogo: true,
  showTagline: true,
  showContactLine: true,
  showTaxId: true,
  showPrintDate: true,
};
