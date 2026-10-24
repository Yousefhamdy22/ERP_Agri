import { PagedResult } from '../../../shared/models/paged-result.model';
import { PartyListItem } from './supplier.model';

export type { PagedResult, PartyListItem };

// Party type discriminator for the backend's unified /api/Parties endpoints — mirrors
// SUPPLIER_PARTY_TYPE (see supplier.model.ts, which is confirmed = 2). Customer = 1
// confirmed live 2026-07-12 (real create response returned "partyType": 1).
export const CUSTOMER_PARTY_TYPE = 1;

// POST /api/Parties/customers — شكل مؤكَّد حياً 2026-07-12، أبسط بكثير من CreateSupplierDto
// (لا category/responsibleName/taxNumber/... — هذه الحقول خاصة بالموردين فقط).
export interface CreateCustomerDto {
  name?: string | null;
  nameAr?: string | null;
  creditLimit?: number | null;
  phone?: string | null;
  email?: string | null;
}

// شكل استجابة الإنشاء المؤكَّد — لا يعيد creditLimit رغم قبوله في الطلب (يطابق نمط
// Supplier الذي لا يعيد بعض حقول الإنشاء أيضاً).
export interface Customer {
  id: string;
  partyType: number;
  name?: string | null;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  creditLimit?: number;
  currentBalance?: number;
  isActive?: boolean;
}
