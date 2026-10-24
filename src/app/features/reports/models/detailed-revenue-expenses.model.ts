export interface DetailedRevenueExpensesDto {
  periodId: string;
  periodCode: string;
  fromDate: string;
  toDate: string;
  branchId: string | null;
  branchName: string | null;
  summary: SummaryTotalsDto;
  sections: RevenueExpenseSectionDto[];
  monthlyTrend: MonthlyTrendDto[];
}

export interface SummaryTotalsDto {
  totalRevenue: number;
  totalCostOfSales: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  operatingIncome: number;
  netIncome: number;
}

export interface RevenueExpenseSectionDto {
  sectionKey: string;
  sectionNameAr: string;
  sectionNameEn: string;
  sectionTotal: number;
  accounts: RevenueExpenseAccountDto[];
}

export interface RevenueExpenseAccountDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  balance: number;
  percentOfSection: number;
  level: number;
  isLeaf: boolean;
  monthlyBreakdown: MonthlyAmountDto[];
}

export interface MonthlyAmountDto {
  year: number;
  month: number;
  amount: number;
}

export interface MonthlyTrendDto {
  year: number;
  month: number;
  monthNameAr: string;
  revenue: number;
  costOfSales: number;
  expenses: number;
  grossProfit: number;
  netIncome: number;
}
