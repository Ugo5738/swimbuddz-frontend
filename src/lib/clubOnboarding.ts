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
  community_experience_offering_id: string | null;
  sessions_included: number;
  period_start: string;
  period_end: string;
  minimum_entry_sessions: number;
  remaining_sessions: number;
  entry_available: boolean;
  entry_reason: string | null;
  current_price_kobo: number;
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
  selected_plans: ClubPlan[];
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
    club_items?: Array<{
      plan_version_id: string;
      name: string;
      period_start: string;
      period_end: string;
      remaining_sessions: number;
      full_quarter_fee_kobo: number;
      amount_kobo: number;
    }>;
    annual_swimbuddz_membership?: number;
    academy?: number;
    academy_membership_policy?: "open" | "active_required" | "included";
    annual_membership_months?: number;
    installment_number?: number | null;
    total_installments?: number | null;
    community_experience?: number;
    community_experience_selected?: boolean;
  };
};

export type CommunityExperienceOffering = {
  id: string;
  name: string;
  currency: string;
  period_start: string;
  period_end: string;
  standard_member_fee_kobo: number;
  club_member_fee_kobo: number;
  club_bundle_fee_kobo: number;
  purchase_opens_at: string | null;
  purchase_closes_at: string | null;
  is_active: boolean;
};

export type CommunityExperienceQuote = {
  offering_id: string;
  offering_name: string;
  currency: string;
  price_context: "standard_member" | "club_member_later";
  amount_kobo: number;
  annual_membership_fee_kobo: number;
  annual_membership_months: number;
  subtotal_kobo: number;
  already_purchased: boolean;
};

export function listClubPlans(): Promise<ClubPlan[]> {
  return apiGet<ClubPlan[]>("/api/v1/clubs/plans");
}

export function previewAcademyCheckout(
  enrollmentId: string,
  useInstallments: boolean,
  paymentMethod: "paystack" | "manual_transfer" = "paystack",
  amountOverrideKobo?: number,
): Promise<ChargePreview> {
  return apiPost<ChargePreview>(
    "/api/v1/payments/charges/preview",
    {
      purpose: "academy_cohort",
      payment_method: paymentMethod,
      enrollment_id: enrollmentId,
      use_installments: useInstallments,
      amount_override_kobo: amountOverrideKobo,
    },
    { auth: true },
  );
}

export function listCommunityExperiences(): Promise<CommunityExperienceOffering[]> {
  return apiGet<CommunityExperienceOffering[]>("/api/v1/clubs/community-experiences", {
    auth: true,
  });
}

export function createCommunityExperience(input: Omit<CommunityExperienceOffering, "id">) {
  return apiPost<CommunityExperienceOffering>(
    "/api/v1/clubs/community-experiences",
    input,
    { auth: true },
  );
}

export function quoteCommunityExperience(id: string) {
  return apiGet<CommunityExperienceQuote>(
    `/api/v1/clubs/community-experiences/${id}/quote`,
    { auth: true },
  );
}

export function listMyClubApplications(): Promise<ClubApplication[]> {
  return apiGet<ClubApplication[]>("/api/v1/clubs/applications/me", { auth: true });
}

export function createClubApplication(input: {
  plan_version_id: string;
  plan_version_ids?: string[];
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

export function previewCommunityExperienceCheckout(
  offeringId: string,
  paymentMethod: "paystack" | "manual_transfer" = "paystack",
): Promise<ChargePreview> {
  return apiPost<ChargePreview>(
    "/api/v1/payments/charges/preview",
    {
      purpose: "community_experience",
      payment_method: paymentMethod,
      community_experience_offering_id: offeringId,
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
    community_experience_offering_id?: string;
    sessions_included: number;
    period_start: string;
    period_end: string;
    minimum_entry_sessions: number;
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
