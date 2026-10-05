// Types extracted from page.tsx during the file-size sweep.

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  swim_level?: string;
  location_preference?: string[];
  registration_complete: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  approved_at?: string;
  approved_by?: string;
  approval_notes?: string;
  profile_photo_url?: string;
  city?: string;
  country?: string;
  gender?: string;
  date_of_birth?: string;
  occupation?: string;
  area_in_lagos?: string;
  how_found_us?: string;
  previous_communities?: string;
  hopes_from_swimbuddz?: string;
  goals_narrative?: string;
  primary_tier?: string;
  active_tiers?: string[];
  requested_tiers?: string[];
  community_paid_until?: string;
  club_paid_until?: string;
  academy_paid_until?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_info?: string;
  membership_tier?: string;
  requested_membership_tiers?: string[];

  // Canonical admin projection. Membership and programmes are independent;
  // these fields supersede the legacy tier hierarchy for admin display.
  annual_membership_status?: string;
  annual_membership_label?: string;
  annual_membership_paid_until?: string;
  club_programme_status?: string;
  club_programme_label?: string;
  academy_programme_status?: string;
  academy_programme_label?: string;
  pending_programmes?: string[];
  current_club_id?: string;
  current_club_name?: string;
  current_club_payment_mode?: string;
  current_club_until?: string;
  current_pod_id?: string;
  current_pod_name?: string;
}

export type FilterTab = "all" | "pending" | "membership_due" | "programme_requests" | "club";
export type ApprovalAction = "approve" | "reject";
