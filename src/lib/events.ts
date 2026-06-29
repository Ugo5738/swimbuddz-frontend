/**
 * Events API client + types for member-created open-swim meets.
 *
 * The generated OpenAPI types live in api-types.ts; these narrow interfaces
 * cover the fields the member UI actually reads/writes.
 */
import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export interface EventResponse {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  max_capacity: number | null;
  tier_access: string;
  cost_naira: number | null;
  pool_id: string | null;
  pool_fee_naira: number | null;
  organizer_surcharge_naira: number | null;
  /** Effective per-attendee charge (cost_naira OR pool_fee + surcharge). */
  total_cost_naira: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  rsvp_count?: Record<string, number>;
}

export interface OpenSwimCreate {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string; // ISO
  end_time?: string | null;
  max_capacity?: number | null;
  tier_access?: string;
  pool_id?: string | null; // null = free / informal venue
  organizer_surcharge_naira?: number | null;
}

export type OpenSwimUpdate = Partial<
  Pick<
    OpenSwimCreate,
    | "title"
    | "description"
    | "location"
    | "start_time"
    | "end_time"
    | "max_capacity"
    | "organizer_surcharge_naira"
  >
>;

export interface PartnerPool {
  id: string;
  name: string;
  location_area: string | null;
  price_per_swimmer_ngn: string | null; // Decimal serialized as string
  flat_session_fee_ngn: string | null;
  max_swimmers_capacity: number | null;
}

interface PoolListResponse {
  items: PartnerPool[];
  total: number;
  page: number;
  page_size: number;
}

export const EventsApi = {
  get: (id: string) => apiGet<EventResponse>(`/api/v1/events/${id}`),

  createOpenSwim: (data: OpenSwimCreate) =>
    apiPost<EventResponse>("/api/v1/events/open-swim", data, { auth: true }),

  updateOpenSwim: (id: string, data: OpenSwimUpdate) =>
    apiPatch<EventResponse>(`/api/v1/events/open-swim/${id}`, data, {
      auth: true,
    }),

  cancelOpenSwim: (id: string) =>
    apiDelete<void>(`/api/v1/events/open-swim/${id}`, { auth: true }),

  /**
   * Active-partner pools that bill *per swimmer* — the only pools a member may
   * select for a paid meet (flat-fee pools are excluded, matching the backend
   * guardrail).
   */
  listPerSwimmerPools: async (): Promise<PartnerPool[]> => {
    const res = await apiGet<PoolListResponse>("/api/v1/pools?page_size=100");
    return (res.items || []).filter((p) => {
      const perSwimmer = Number(p.price_per_swimmer_ngn ?? 0);
      const flat = Number(p.flat_session_fee_ngn ?? 0);
      return perSwimmer > 0 && !(flat > 0);
    });
  },
};
