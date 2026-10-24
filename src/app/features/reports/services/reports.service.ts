import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DetailedRevenueExpensesDto } from '../models/detailed-revenue-expenses.model';
import { IncomeStatementDto } from '../models/income-statement.model';
import { TopSellingItemsReportDto } from '../models/top-selling-items.model';
import { DetailedSalesReportDto } from '../models/detailed-sales-report.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private base = `${environment.apiUrl}/Reports`;

  constructor(private http: HttpClient) {}

  getDetailedRevenueExpenses(
    periodId: string,
    fromDate?: string,
    toDate?: string,
    branchId?: string
  ): Observable<DetailedRevenueExpensesDto> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (branchId) params = params.set('branchId', branchId);

    return this.http.get<DetailedRevenueExpensesDto>(
      `${this.base}/detailed-revenue-expenses/${periodId}`,
      { params }
    );
  }

  getIncomeStatement(
    params: {
      periodId: string;
      fromDate?: string;
      toDate?: string;
      branchId?: string;
      includeDrafts?: boolean;
      hideZeroBalances?: boolean;
      compareWithPeriodId?: string;
    }
  ): Observable<IncomeStatementDto> {
    let httpParams = new HttpParams();
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.includeDrafts !== undefined) httpParams = httpParams.set('includeDrafts', params.includeDrafts.toString());
    if (params.hideZeroBalances !== undefined) httpParams = httpParams.set('hideZeroBalances', params.hideZeroBalances.toString());
    if (params.compareWithPeriodId) httpParams = httpParams.set('compareWithPeriodId', params.compareWithPeriodId);

    return this.http.get<IncomeStatementDto>(
      `${this.base}/income-statement/${params.periodId}`,
      { params: httpParams }
    );
  }

  getTrialBalance(periodId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/trial-balance/${periodId}`);
  }

  getAccountLedger(
    accountId: string,
    params: {
      periodId?: string;
      fromDate?: string;
      toDate?: string;
      referenceType?: string;
      search?: string;
      branchId?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Observable<any> {
    let httpParams = new HttpParams();
    if (params.periodId) httpParams = httpParams.set('periodId', params.periodId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.referenceType) httpParams = httpParams.set('referenceType', params.referenceType);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<any>(`${environment.apiUrl}/AccountLedger/${accountId}`, { params: httpParams });
  }

  getTopSellingItems(params: {
    fromDate?: string;
    toDate?: string;
    branchId?: string;
    warehouseId?: string;
    categoryId?: string;
    partyId?: string;
    sortBy?: string;
    sortDirection?: string;
    topCount?: number;
  }): Observable<TopSellingItemsReportDto> {
    let httpParams = new HttpParams();
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.partyId) httpParams = httpParams.set('partyId', params.partyId);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    if (params.topCount) httpParams = httpParams.set('topCount', params.topCount.toString());

    return this.http.get<TopSellingItemsReportDto>(`${this.base}/top-selling-items`, { params: httpParams });
  }

  getDetailedSalesReport(params: {
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
  }): Observable<DetailedSalesReportDto> {
    let httpParams = new HttpParams();
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.branchId) httpParams = httpParams.set('branchId', params.branchId);
    if (params.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params.customerId) httpParams = httpParams.set('customerId', params.customerId);
    if (params.productId) httpParams = httpParams.set('productId', params.productId);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.invoiceType) httpParams = httpParams.set('invoiceType', params.invoiceType);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.paymentStatus) httpParams = httpParams.set('paymentStatus', params.paymentStatus);
    if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);

    return this.http.get<DetailedSalesReportDto>(`${this.base}/detailed-sales`, { params: httpParams });
  }

  getBalanceSheet(periodId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/balance-sheet/${periodId}`);
  }

  getGeneralLedger(params: {
    periodId?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Observable<any> {
    let httpParams = new HttpParams();
    if (params.periodId) httpParams = httpParams.set('periodId', params.periodId);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    return this.http.get<any>(`${this.base}/general-ledger`, { params: httpParams });
  }

  getPartyStatement(
    partyId: string,
    fromDate?: string,
    toDate?: string
  ): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${environment.apiUrl}/Parties/${partyId}/statement`, { params });
  }

  getWarehouseStock(warehouseId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/StockTransactions/warehouse/${warehouseId}`);
  }

  getAgingReport(params: {
    accountId?: string;
    asOfDate?: string;
  } = {}): Observable<any> {
    let httpParams = new HttpParams();
    if (params.accountId) httpParams = httpParams.set('accountId', params.accountId);
    if (params.asOfDate) httpParams = httpParams.set('asOfDate', params.asOfDate);
    return this.http.get<any>(`${environment.apiUrl}/AccountLedger/aging`, { params: httpParams });
  }
}
