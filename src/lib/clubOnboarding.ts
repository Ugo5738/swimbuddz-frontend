import { apiGet, apiPost, apiPut } from "./api";

export type ClubPlan = {
  id: string;
  club_id: string;
  club_name: string;
  club_slug: string;
  location: string | null;
  operating_area_id: string | null;
  default_pool_id: string | null;
  name: string;
  billing_cycle: "quarterly";
  currency: string;
  club_fee_kobo: number;
  community_experience_fee_kobo: number;
  community_experience_default_selected: boolean;
  sessions_included: number;
  refreshments_included: boolean;
  capacity: number | null;
  premium_venue_note: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
};

export type ClubAssessment = {
  id: string;
  outcome: "pending" | "club_ready" | "club_ready_modified" | "academy_first";
  self_report: Record<string, unknown>;
  primary_technique_focus: string | null;
  first_club_milestone: string | null;
};

export type ClubApplication = {
  id: string;
  member_name: string | null;
  member_email: string | null;
  club_id: string;
  plan_version_id: string;
  status: string;
  community_experience_selected: boolean;
  preferred_pod_id: string | null;
  plan: ClubPlan | null;
  assessment: ClubAssessment | null;
};

export type ClubPreAssessment = {
  can_swim_25m_continuously: boolean;
  controlled_breathing: boolean;
  comfortable_in_deep_water: boolean;
  can_float_or_tread_30_seconds: boolean;
  can_stop_and_recover: boolean;
  last_swim_date?: string;
  current_nonstop_distance_m?: number | null;
  injuries_or_accommodations?: string;
  notes?: string;
};

export type ChargePreview = {
  currency: string;
  subtotal_kobo: number;
  additional_charges: Array<{ label: string; amount_kobo: number }>;
  additional_charges_total_kobo: number;
  total_kobo: number;
  components: {
    club?: number;
    community_experience?: number;
    community_experience_selected?: boolean;
  };
};

export function listClubPlans(): Promise<ClubPlan[]> {
  return apiGet<ClubPlan[]>("/api/v1/clubs/plans");
}

export function listMyClubApplications(): Promise<ClubApplication[]> {
  return apiGet<ClubApplication[]>("/api/v1/clubs/applications/me", { auth: true });
}

export function createClubApplication(input: {
  plan_version_id: string;
  community_experience_selected: boolean;
  preferred_pod_id?: string;
  notes?: string;
}): Promise<ClubApplication> {
  return apiPost<ClubApplication>("/api/v1/clubs/applications", input, { auth: true });
}

export function submitClubPreAssessment(
  applicationId: string,
  input: ClubPreAssessment,
): Promise<ClubApplication> {
  return apiPut<ClubApplication>(
    `/api/v1/clubs/applications/${applicationId}/pre-assessment`,
    input,
    { auth: true },
  );
}

export function previewClubCheckout(
  applicationId: string,
  paymentMethod: "paystack" | "manual_transfer" = "paystack",
): Promise<ChargePreview> {
  return apiPost<ChargePreview>(
    "/api/v1/payments/charges/preview",
    {
      purpose: "club",
      payment_method: paymentMethod,
      club_application_id: applicationId,
    },
    { auth: true },
  );
}

export function listAllClubPlans(): Promise<ClubPlan[]> {
  return apiGet<ClubPlan[]>("/api/v1/clubs/admin/plans", { auth: true });
}

export function createClubPlan(
  clubId: string,
  input: {
    name: string;
    billing_cycle: "quarterly";
    currency: string;
    club_fee_kobo: number;
    community_experience_fee_kobo: number;
    community_experience_default_selected: boolean;
    sessions_included: number;
    refreshments_included: boolean;
    capacity?: number;
    premium_venue_note?: string;
    effective_from: string;
    effective_to?: string;
    is_active: boolean;
  },
): Promise<ClubPlan> {
  return apiPost<ClubPlan>(`/api/v1/clubs/${clubId}/plans`, input, { auth: true });
}

export function listClubApplicationsForReview(status?: string): Promise<ClubApplication[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<ClubApplication[]>(`/api/v1/clubs/admin/applications${query}`, { auth: true });
}

export function completeObservedClubAssessment(
  applicationId: string,
  input: {
    outcome: "club_ready" | "club_ready_modified" | "academy_first";
    observed_checks: Record<string, boolean>;
    nonstop_distance_m?: number;
    deep_water_comfort?: string;
    primary_technique_focus?: string;
    first_club_milestone?: string;
    assessor_notes?: string;
    send_result_email: boolean;
  },
): Promise<ClubApplication> {
  return apiPut<ClubApplication>(
    `/api/v1/clubs/admin/applications/${applicationId}/assessment`,
    input,
    { auth: true },
  );
}
