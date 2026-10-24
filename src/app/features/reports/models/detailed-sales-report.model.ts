export interface SalesReportInvoiceLineDto {
  lineId: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  measurementUnit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  lineTotal: number;
  unitCost: number;
  totalCost: number;
  lineProfit: number;
}

export interface SalesReportInvoiceDto {
  invoiceId: string;
  invoiceNumber: string;
  paperReference?: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceType: string;
  status: string;
  paymentStatus: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  subtotal: number;
  totalLineDiscounts: number;
  invoiceDiscountAmount: number;
  vatAmount: number;
  commercialTaxAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountOutstanding: number;
  totalCOGS: number;
  netProfit: number;
  createdByUserName?: string;
  lines: SalesReportInvoiceLineDto[];
}

export interface DetailedSalesSummaryDto {
  totalSalesInvoicesCount: number;
  totalReturnInvoicesCount: number;
  totalGrossSales: number;
  totalReturnsAmount: number;
  totalNetSales: number;
  totalVatTax: number;
  totalCOGS: number;
  totalNetProfit: number;
  totalAmountPaid: number;
  totalAmountOutstanding: number;
}

export interface DetailedSalesReportDto {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  warehouseId?: string;
  customerId?: string;
  productId?: string;
  categoryId?: string;
  invoiceType?: string;
  status?: string;
  paymentStatus?: string;
  searchTerm?: string;
  summary: DetailedSalesSummaryDto;
  invoices: SalesReportInvoiceDto[];
}
