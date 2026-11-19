/** Shared read-only API contracts for member swim planning. */
import { apiGet, apiPost, apiPut } from "@/lib/api";

export type SwimPlanKind = "solo" | "friends" | "open" | "coached";
export type SwimPlan = {
  id: string;
  kind: SwimPlanKind;
  title: string;
  notes?: string | null;
  pool_id?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  participants: number;
  coaching_focus?: string | null;
  status: string;
  approval_status: "approved" | "pending" | "rejected";
  venue_status: "pending" | "verified" | "not_required" | "rejected";
  linked_event_id?: string | null;
  venue_confirmation_reference?: string | null;
  selling_price_kobo?: number | null;
  admin_notes?: string | null;
};
export type SwimPlanInput = {
  kind: SwimPlanKind;
  title: string;
  notes?: string | null;
  pool_id?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  participants: number;
  coaching_focus?: string | null;
};
export type PartnerPoolForPlanning = {
  id: string;
  name: string;
  location_area: string | null;
  address?: string | null;
  price_per_swimmer_ngn?: string | null;
  flat_session_fee_ngn?: string | null;
  max_swimmers_capacity?: number | null;
};
type PartnerList = { items: PartnerPoolForPlanning[]; total: number; page: number; page_size: number };
const ROOT = "/api/v1/events/swim-plans";

export const SwimPlansApi = {
  mine: () => apiGet<SwimPlan[]>(`${ROOT}/me`, { auth: true }),
  create: (payload: SwimPlanInput) => apiPost<SwimPlan>(ROOT, payload, { auth: true }),
  pools: () => apiGet<PartnerList>("/api/v1/pools?page_size=100", { auth: true }),
  adminList: () => apiGet<SwimPlan[]>(`${ROOT}/admin`, { auth: true }),
  getPolicy: () => apiGet<{ auto_approve_public: boolean }>(`${ROOT}/admin/policy`, { auth: true }),
  setPolicy: (auto_approve_public: boolean) =>
    apiPut<{ auto_approve_public: boolean }>(`${ROOT}/admin/policy`, { auto_approve_public }, { auth: true }),
  review: (id: string, approved: boolean, notes?: string) =>
    apiPut<SwimPlan>(`${ROOT}/admin/${id}/review`, { approved, notes }, { auth: true }),
  verifyVenue: (id: string, confirmed: boolean, reference?: string, notes?: string, selling_price_naira?: number) =>
    apiPut<SwimPlan>(`${ROOT}/admin/${id}/verify-venue`, { confirmed, reference, notes, selling_price_naira }, { auth: true }),
  publish: (id: string) => apiPost<SwimPlan>(`${ROOT}/admin/${id}/publish`, {}, { auth: true }),
};
