export type GuestBookingMode = "disabled" | "public" | "member_invite" | "approval_required";
export type GuestSessionSettings = {
  allows_guests?: boolean;
  guest_fee?: number | null;
  guest_booking_mode?: GuestBookingMode;
  guest_booking_closes_at?: string | null;
  guest_reconciliation_days?: number;
  guest_location_private?: boolean;
};

import { apiGet, apiPost } from "./api";

export type GuestPassOffer = {
  session_id: string;
  title: string;
  location_name: string | null;
  starts_at: string;
  ends_at: string;
  currency: string;
  guest_fee_kobo: number | null;
  community_dropin_fee_kobo: number | null;
  allows_guests: boolean;
  spaces_remaining: number | null;
  timezone: string;
  booking_mode: "reservation" | "settlement" | "closed";
  guest_booking_mode: GuestBookingMode;
  booking_closes_at: string | null;
  reconciliation_closes_at: string | null;
  approval_granted: boolean;
  safety_acknowledgement_version: string;
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
  receipt_url?: string | null;
  reservation_expires_at?: string | null;
  booking_mode: "reservation" | "settlement";
  payment_method: "paystack" | "manual_transfer";
  session_title?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  timezone: string;
  location_name?: string | null;
  location_address?: string | null;
  attendance_recorded: boolean;
};

export type GuestPassAdmin = GuestPassReceipt & {
  booking_source?: string | null;
  campaign_key?: string | null;
  confirmation_email_sent_at?: string | null;
  full_name: string;
  email: string;
  phone: string;
  referral_code: string | null;
  referrer_auth_id: string | null;
  referral_reward_bubbles: number;
  referral_reward_status: string;
  marketing_consent: boolean;
  attended_at: string | null;
  actual_swim_minutes: number | null;
  assessment_result: Record<string, unknown> | null;
  converted_member_id: string | null;
};

export type GuestPassInput = {
  payment_method?: "paystack" | "manual_transfer";
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  guardian_name?: string;
  guardian_phone?: string;
  waiver_accepted: boolean;
  marketing_consent: boolean;
  referral_code?: string;
  booking_source?: string;
  campaign_key?: string;
  access_token?: string;
};

export type AdminReferralCode = {
  member_auth_id: string;
  code: string;
  is_active: boolean;
  expires_at: string | null;
};

export function buildGuestPassSharePath(
  sessionId: string,
  referralCode?: string | null,
  attribution?: { source?: string; campaign?: string }
): string {
  const path = `/guest-pass/session/${encodeURIComponent(sessionId)}`;
  const params = new URLSearchParams();
  const code = referralCode?.trim().toUpperCase();
  if (code) params.set("ref", code);
  if (attribution?.source) params.set("source", attribution.source);
  if (attribution?.campaign) params.set("campaign", attribution.campaign);
  return params.size ? `${path}?${params.toString().replaceAll("+", "%20")}` : path;
}

export function isGuestShareEnabled(session: GuestSessionSettings): boolean {
  return (
    session.allows_guests !== false &&
    session.guest_fee != null &&
    !!session.guest_booking_mode &&
    session.guest_booking_mode !== "disabled"
  );
}

export function trackGuestLink(
  sessionId: string,
  event: "view" | "share",
  source?: string,
  campaign?: string
) {
  const id = crypto.randomUUID();
  return apiPost(
    `/api/v1/sessions/${sessionId}/guest-link-events`,
    {
      id,
      event_type: event,
      booking_source: source || undefined,
      campaign_key: campaign || undefined,
    },
    { auth: false }
  ).catch(() => undefined);
}

export type GuestFunnel = {
  link_views: number;
  link_shares: number;
  checkout_started: number;
  paid: number;
  attended: number;
  assessed: number;
  converted: number;
};

export function getOrCreateGuestReferrerCode(memberAuthId: string): Promise<AdminReferralCode> {
  return apiPost<AdminReferralCode>(
    `/api/v1/admin/wallet/referrals/code/${encodeURIComponent(memberAuthId)}`,
    {},
    { auth: true }
  );
}

export function createGuestPass(
  sessionId: string,
  input: GuestPassInput
): Promise<GuestPassReceipt> {
  return apiPost<GuestPassReceipt>(`/api/v1/sessions/${sessionId}/guest-passes`, input, {
    auth: false,
  });
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
  }
): Promise<GuestPassAdmin> {
  return apiPost<GuestPassAdmin>(`/api/v1/admin/guest-passes/${id}/attendance`, input, {
    auth: true,
  });
}
