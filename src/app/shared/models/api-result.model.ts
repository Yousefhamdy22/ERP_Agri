export interface ApiError {
  code?: string;
  description?: string;
  type?: number;
}

// Shape returned by this backend's CQRS command endpoints (Parties, Invoices draft/confirm, ...).
// Different from AuthResult (see auth.model.ts), which uses its own {succeeded, errors: string[]} shape.
export interface ApiResult {
  isSuccess: boolean;
  isError?: boolean;
  errors?: ApiError[];
  topError?: ApiError;
}
