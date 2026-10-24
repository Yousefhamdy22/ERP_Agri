export interface IncomeStatementLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  balance: number;
  priorBalance?: number;
  variance?: number;
  variancePercentage?: number;
  level: number;
  isLeaf: boolean;
  categoryName?: string;
}

export interface IncomeStatementSectionDto {
  sectionKey: string; // "OperatingRevenue", "COGS", "SellingExpenses", "AdminExpenses", "NonOperatingRevenue", "NonOperatingExpense"
  sectionName: string;
  sectionNameAr: string;
  sectionTotal: number;
  priorSectionTotal?: number;
  lines: IncomeStatementLineDto[];
}

export interface IncomeStatementComparativeDto {
  periodId: string;
  periodCode: string;
  netSales: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  netIncomeVariance: number;
  netIncomeVariancePercentage: number;
}

export interface IncomeStatementDto {
  periodId: string;
  periodCode: string;
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  branchName?: string;
  grossRevenue: number;
  salesDiscountsAndReturns: number;
  netSales: number;
  totalCostOfSales: number;
  grossProfit: number;
  grossMarginPercentage: number;
  operatingExpensesTotal: number;
  operatingIncome: number;
  nonOperatingRevenueTotal: number;
  nonOperatingExpensesTotal: number;
  nonOperatingNet: number;
  netIncome: number;
  netMarginPercentage: number;
  isComparative: boolean;
  comparison?: IncomeStatementComparativeDto;
  sections: IncomeStatementSectionDto[];
}

export interface IncomeStatementFilterParams {
  periodId: string;
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  includeDrafts?: boolean;
  hideZeroBalances?: boolean;
  compareWithPeriodId?: string;
}
