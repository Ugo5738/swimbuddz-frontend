import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// ─── Enums ──────────────────────────────────────────────────────────────

export type PartnershipStatus =
  | "prospect"
  | "evaluating"
  | "active_partner"
  | "inactive"
  | "rejected";

export type PoolContactRole =
  | "owner"
  | "manager"
  | "front_desk"
  | "accountant"
  | "operations"
  | "marketing"
  | "other";

export type PoolVisitType =
  | "scouting"
  | "evaluation"
  | "partnership_meeting"
  | "session_check"
  | "incident"
  | "other";

export type PoolAgreementStatus = "draft" | "active" | "expired" | "terminated";

export type PoolAssetType = "photo" | "document" | "video" | "certificate" | "other";

// ─── Contacts ───────────────────────────────────────────────────────────

export interface PoolContact {
  id: string;
  pool_id: string;
  name: string;
  role: PoolContactRole;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoolContactCreate {
  name: string;
  role?: PoolContactRole;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  is_primary?: boolean;
}

export type PoolContactUpdate = Partial<PoolContactCreate>;

// ─── Visits ─────────────────────────────────────────────────────────────

export interface PoolVisit {
  id: string;
  pool_id: string;
  visit_date: string; // YYYY-MM-DD
  visit_type: PoolVisitType;
  visitor_auth_id: string | null;
  visitor_display_name: string | null;
  summary: string;
  notes: string | null;
  follow_up_action: string | null;
  follow_up_due_at: string | null;
  follow_up_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoolVisitCreate {
  visit_date: string;
  visit_type?: PoolVisitType;
  summary: string;
  notes?: string | null;
  follow_up_action?: string | null;
  follow_up_due_at?: string | null;
  follow_up_completed?: boolean;
}

export type PoolVisitUpdate = Partial<PoolVisitCreate>;

// ─── Status Changes (read-only) ─────────────────────────────────────────

export interface PoolStatusChange {
  id: string;
  pool_id: string;
  from_status: PartnershipStatus | null;
  to_status: PartnershipStatus;
  changed_by_auth_id: string | null;
  reason: string | null;
  created_at: string;
}

// ─── Agreements ─────────────────────────────────────────────────────────

export interface PoolAgreement {
  id: string;
  pool_id: string;
  title: string;
  status: PoolAgreementStatus;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  commission_percentage: string | null; // Decimal serialized as string
  flat_session_rate_ngn: string | null;
  min_sessions_per_month: number | null;
  is_exclusive: boolean;
  signed_doc_media_id: string | null;
  signed_doc_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoolAgreementCreate {
  title: string;
  status?: PoolAgreementStatus;
  start_date?: string | null;
  end_date?: string | null;
  signed_at?: string | null;
  commission_percentage?: number | null;
  flat_session_rate_ngn?: number | null;
  min_sessions_per_month?: number | null;
  is_exclusive?: boolean;
  signed_doc_url?: string | null;
  notes?: string | null;
}

export type PoolAgreementUpdate = Partial<PoolAgreementCreate>;

// ─── Assets ─────────────────────────────────────────────────────────────

export interface PoolAsset {
  id: string;
  pool_id: string;
  asset_type: PoolAssetType;
  media_id: string | null;
  url: string | null;
  title: string | null;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  uploaded_by_auth_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoolAssetCreate {
  asset_type?: PoolAssetType;
  url?: string | null;
  media_id?: string | null;
  title?: string | null;
  caption?: string | null;
  display_order?: number | null;
  is_primary?: boolean;
}

export type PoolAssetUpdate = Partial<PoolAssetCreate>;

// ─── API client ─────────────────────────────────────────────────────────

const base = (poolId: string) => `/api/v1/admin/pools/${poolId}`;

export const PoolsApi = {
  // Contacts
  listContacts: (poolId: string) =>
    apiGet<PoolContact[]>(`${base(poolId)}/contacts`, { auth: true }),
  createContact: (poolId: string, data: PoolContactCreate) =>
    apiPost<PoolContact>(`${base(poolId)}/contacts`, data, { auth: true }),
  updateContact: (poolId: string, contactId: string, data: PoolContactUpdate) =>
    apiPatch<PoolContact>(`${base(poolId)}/contacts/${contactId}`, data, { auth: true }),
  deleteContact: (poolId: string, contactId: string) =>
    apiDelete<void>(`${base(poolId)}/contacts/${contactId}`, { auth: true }),

  // Visits
  listVisits: (poolId: string) =>
    apiGet<PoolVisit[]>(`${base(poolId)}/visits`, { auth: true }),
  createVisit: (poolId: string, data: PoolVisitCreate) =>
    apiPost<PoolVisit>(`${base(poolId)}/visits`, data, { auth: true }),
  updateVisit: (poolId: string, visitId: string, data: PoolVisitUpdate) =>
    apiPatch<PoolVisit>(`${base(poolId)}/visits/${visitId}`, data, { auth: true }),
  deleteVisit: (poolId: string, visitId: string) =>
    apiDelete<void>(`${base(poolId)}/visits/${visitId}`, { auth: true }),

  // Status history
  listStatusHistory: (poolId: string) =>
    apiGet<PoolStatusChange[]>(`${base(poolId)}/status-history`, { auth: true }),

  // Agreements
  listAgreements: (poolId: string) =>
    apiGet<PoolAgreement[]>(`${base(poolId)}/agreements`, { auth: true }),
  createAgreement: (poolId: string, data: PoolAgreementCreate) =>
    apiPost<PoolAgreement>(`${base(poolId)}/agreements`, data, { auth: true }),
  updateAgreement: (poolId: string, agreementId: string, data: PoolAgreementUpdate) =>
    apiPatch<PoolAgreement>(`${base(poolId)}/agreements/${agreementId}`, data, {
      auth: true,
    }),
  deleteAgreement: (poolId: string, agreementId: string) =>
    apiDelete<void>(`${base(poolId)}/agreements/${agreementId}`, { auth: true }),

  // Assets
  listAssets: (poolId: string) =>
    apiGet<PoolAsset[]>(`${base(poolId)}/assets`, { auth: true }),
  createAsset: (poolId: string, data: PoolAssetCreate) =>
    apiPost<PoolAsset>(`${base(poolId)}/assets`, data, { auth: true }),
  updateAsset: (poolId: string, assetId: string, data: PoolAssetUpdate) =>
    apiPatch<PoolAsset>(`${base(poolId)}/assets/${assetId}`, data, { auth: true }),
  deleteAsset: (poolId: string, assetId: string) =>
    apiDelete<void>(`${base(poolId)}/assets/${assetId}`, { auth: true }),
};
