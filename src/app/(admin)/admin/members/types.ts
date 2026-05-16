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
}

export type FilterTab = "all" | "pending" | "active" | "unpaid" | "upgrades";
export type ApprovalAction = "approve" | "reject" | "upgrade";
