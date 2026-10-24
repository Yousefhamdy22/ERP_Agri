export type FiscalPeriodStatus = 'Open' | 'Closed';

// GET /api/FiscalPeriod و GET /api/FiscalPeriod/{id}
export interface FiscalPeriod {
  id: string;
  periodCode: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  branchId?: string | null;
  status: FiscalPeriodStatus;
  createdByUserId?: string | null;
  closedByUserId?: string | null;
  closedAt?: string | null;
  closeNote?: string | null;
  reopenedByUserId?: string | null;
  reopenedAt?: string | null;
  reopenNote?: string | null;
}

// POST /api/FiscalPeriod
export interface CreateFiscalPeriodDto {
  periodCode: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  branchId?: string | null;
  createdByUserId: string;
}
