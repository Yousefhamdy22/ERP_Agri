import { PagedResult } from '../../../shared/models/paged-result.model';
import { ApiError, ApiResult } from '../../../shared/models/api-result.model';

export type { PagedResult, ApiError, ApiResult };

export enum SupplierCategory {
  RawMaterials = 1,
  Equipment = 2,
  Services = 3,
  Consumables = 4,
  Other = 5,
}

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  [SupplierCategory.RawMaterials]: 'مواد خام',
  [SupplierCategory.Equipment]: 'معدات',
  [SupplierCategory.Services]: 'خدمات',
  [SupplierCategory.Consumables]: 'مستهلكات',
  [SupplierCategory.Other]: 'أخرى',
};

export interface CountryOption {
  label: string;
  dialCode: string;
}

export const SUPPLIER_COUNTRIES: CountryOption[] = [
  { label: 'مصر', dialCode: '+20' },
  { label: 'السعودية', dialCode: '+966' },
];

export interface CreateSupplierDto {
  name?: string | null;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  countryCode?: string | null;
  responsibleName?: string | null;
  responsiblePosition?: string | null;
  category?: SupplierCategory | null;
  secondaryPhone?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  notes?: string | null;
}

// Party type discriminator used by the backend's unified /api/Parties endpoints.
export const SUPPLIER_PARTY_TYPE = 2;

// Shape returned by GET /api/Parties/{partyId} — a subset of CreateSupplierDto;
// the backend does not currently persist/return countryCode, responsibleName,
// responsiblePosition, category, secondaryPhone, city, latitude/longitude or notes.
export interface Supplier {
  id: string;
  partyType: number;
  name?: string | null;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  creditLimit?: number;
  currentBalance?: number;
  accountId?: string | null;
  isActive?: boolean;
}

// Body accepted by PUT /api/Parties/{partyId} (UpdatePartyInfoRequest) — only these
// 5 fields can be changed after creation.
export interface UpdatePartyInfoDto {
  name?: string | null;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

// Item shape returned by GET /api/Parties?type=2 (the real list endpoint —
// GET /api/Parties/suppliers is not a working list endpoint on the backend).
export interface PartyListItem {
  id: string;
  name: string;
  partyType: number;
  phone?: string;
  currentBalance: number;
  isActive: boolean;
}

