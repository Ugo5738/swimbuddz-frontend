import { apiGet, apiPost } from "./api";

export type GuestPassOffer = {
  session_id: string;
  title: string;
  location_name: string | null;
  starts_at: string;
  ends_at: string;
  currency: string;
  guest_fee_kobo: number;
  community_dropin_fee_kobo: number | null;
  allows_guests: boolean;
  spaces_remaining: number;
};

export type GuestPassReceipt = {
  id: string;
  session_id: string;
  price_kobo: number;
  additional_charges: Array<{ label: string; amount_kobo: number }>;
  total_kobo: number;
  payment_reference: string;
  status: string;
  checkout_url?: string | null;
  created_at: string;
};

export type GuestPassAdmin = GuestPassReceipt & {
  full_name: string;
  email: string;
  phone: string;
  referral_code: string | null;
  referrer_auth_id: string | null;
  referral_reward_kobo: number;
  referral_reward_status: string;
  referral_reward_reference: string | null;
  marketing_consent: boolean;
  attended_at: string | null;
  actual_swim_minutes: number | null;
  assessment_result: Record<string, unknown> | null;
  converted_member_id: string | null;
};

export type GuestPassInput = {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  guardian_name?: string;
  guardian_phone?: string;
  waiver_accepted: boolean;
  marketing_consent: boolean;
  referral_code?: string;
};

export function createGuestPass(
  sessionId: string,
  input: GuestPassInput,
): Promise<GuestPassReceipt> {
  return apiPost<GuestPassReceipt>(
    `/api/v1/sessions/${sessionId}/guest-passes`,
    input,
  );
}

export function listGuestPasses(): Promise<GuestPassAdmin[]> {
  return apiGet<GuestPassAdmin[]>("/api/v1/admin/guest-passes", { auth: true });
}

export function markGuestPassAttendance(
  id: string,
  input: {
    actual_swim_minutes: number;
    assessment_result?: Record<string, unknown>;
    send_assessment_email: boolean;
  },
): Promise<GuestPassAdmin> {
  return apiPost<GuestPassAdmin>(`/api/v1/admin/guest-passes/${id}/attendance`, input, {
    auth: true,
  });
}

export function markGuestRewardPaid(id: string, transferReference: string): Promise<GuestPassAdmin> {
  return apiPost<GuestPassAdmin>(
    `/api/v1/admin/guest-passes/${id}/referral-reward/paid`,
    { transfer_reference: transferReference },
    { auth: true },
  );
}
