import { apiGet, apiPatch, apiPost } from "./api";

export type ChargePolicy = {
  id: string;
  purpose: string;
  payment_method: string | null;
  label: string;
  calculation_mode: "additive" | "gross_up";
  rate_basis_points: number;
  fixed_amount_kobo: number;
  cap_amount_kobo: number | null;
  waive_fixed_below_kobo: number | null;
  is_active: boolean;
};

export function listChargePolicies(): Promise<ChargePolicy[]> {
  return apiGet<ChargePolicy[]>("/api/v1/payments/charges", { auth: true });
}

export function createChargePolicy(input: Omit<ChargePolicy, "id">): Promise<ChargePolicy> {
  return apiPost<ChargePolicy>("/api/v1/payments/charges", input, { auth: true });
}

export function updateChargePolicy(
  id: string,
  patch: Partial<Omit<ChargePolicy, "id" | "purpose" | "payment_method">>,
): Promise<ChargePolicy> {
  return apiPatch<ChargePolicy>(`/api/v1/payments/charges/${id}`, patch, { auth: true });
}
