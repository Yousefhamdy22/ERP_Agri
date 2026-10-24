export interface TopSellingItemDto {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  measurementUnit: string;
  totalQuantitySold: number;
  totalQuantityReturned: number;
  netQuantitySold: number;
  totalGrossSales: number;
  totalDiscount: number;
  netSalesAmount: number;
  totalCOGS: number;
  netProfit: number;
  profitMarginPct: number;
  contributionPct: number;
  invoiceCount: number;
  avgSellingPrice: number;
}

export interface TopSellingSummaryDto {
  totalQuantitySold: number;
  totalNetSalesRevenue: number;
  totalCOGS: number;
  totalNetProfit: number;
  overallProfitMarginPct: number;
  totalInvoicesCount: number;
  topSellingProductName: string;
}

export interface TopSellingItemsReportDto {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  warehouseId?: string;
  categoryId?: string;
  partyId?: string;
  sortBy: string;
  sortDirection: string;
  summary: TopSellingSummaryDto;
  items: TopSellingItemDto[];
}
