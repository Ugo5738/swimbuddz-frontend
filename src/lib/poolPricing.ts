import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export type ActivityScope = "all" | "community" | "club" | "academy";
export type ChargeBasis = "per_attendee" | "per_staff" | "per_hour" | "per_lane" | "flat_session";

export interface OperatingArea {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  country_code: string;
  timezone: string;
  currency: string;
  is_active: boolean;
}

export interface EffectiveRate {
  id: string;
  activity_scope: ActivityScope;
  charge_basis: ChargeBasis;
  amount_naira: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  day_of_week: number | null;
  starts_after: string | null;
  ends_before: string | null;
  minimum_quantity: number;
  notes: string | null;
  is_active: boolean;
}

export interface PoolRate extends EffectiveRate {
  pool_id: string;
  description: string | null;
}

export interface OperatingCostRate extends EffectiveRate {
  category: string;
  description: string;
  operating_area_id: string | null;
  pool_id: string | null;
  supplier_name: string | null;
}

export interface CostQuoteLine {
  category: string;
  description: string;
  charge_basis: ChargeBasis;
  unit_cost_naira: number;
  quantity: number;
  total_cost_naira: number;
  source_rate_type: "pool_rate" | "operating_cost_rate";
  source_rate_id: string;
}

export interface CostQuote {
  pool_id: string;
  operating_area_id: string | null;
  activity_scope: string;
  currency: string;
  expected_attendees: number;
  lines: CostQuoteLine[];
  estimated_total_cost_naira: number;
  estimated_cost_per_attendee_naira: number;
  warnings: string[];
}

const ROOT = "/api/v1/admin/pools/pricing";

export const PoolPricingApi = {
  listAreas: (includeInactive = false) =>
    apiGet<OperatingArea[]>(`${ROOT}/areas${includeInactive ? "?include_inactive=true" : ""}`, {
      auth: true,
    }),
  createArea: (payload: Omit<OperatingArea, "id">) =>
    apiPost<OperatingArea>(`${ROOT}/areas`, payload, { auth: true }),
  updateArea: (id: string, payload: Partial<OperatingArea>) =>
    apiPatch<OperatingArea>(`${ROOT}/areas/${id}`, payload, { auth: true }),
  deactivateArea: (id: string) => apiDelete(`${ROOT}/areas/${id}`, { auth: true }),

  listPoolRates: () =>
    apiGet<PoolRate[]>(`${ROOT}/pool-rates?include_inactive=true`, {
      auth: true,
    }),
  createPoolRate: (payload: Omit<PoolRate, "id">) =>
    apiPost<PoolRate>(`${ROOT}/pool-rates`, payload, { auth: true }),
  updatePoolRate: (id: string, payload: Partial<PoolRate>) =>
    apiPatch<PoolRate>(`${ROOT}/pool-rates/${id}`, payload, { auth: true }),
  deactivatePoolRate: (id: string) => apiDelete(`${ROOT}/pool-rates/${id}`, { auth: true }),

  listCostRates: () =>
    apiGet<OperatingCostRate[]>(`${ROOT}/cost-rates?include_inactive=true`, { auth: true }),
  createCostRate: (payload: Omit<OperatingCostRate, "id">) =>
    apiPost<OperatingCostRate>(`${ROOT}/cost-rates`, payload, {
      auth: true,
    }),
  updateCostRate: (id: string, payload: Partial<OperatingCostRate>) =>
    apiPatch<OperatingCostRate>(`${ROOT}/cost-rates/${id}`, payload, {
      auth: true,
    }),
  deactivateCostRate: (id: string) => apiDelete(`${ROOT}/cost-rates/${id}`, { auth: true }),

  quote: (payload: {
    pool_id: string;
    activity_scope: "community" | "club" | "academy";
    starts_at: string;
    ends_at: string;
    timezone: string;
    expected_attendees: number;
    expected_staff: number;
    lanes: number;
  }) => apiPost<CostQuote>(`${ROOT}/quote`, payload, { auth: true }),
};
