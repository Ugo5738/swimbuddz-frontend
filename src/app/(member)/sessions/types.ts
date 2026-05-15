// Types extracted from page.tsx during the file-size sweep.

export type ViewTab = "upcoming" | "booked" | "past" | "all";

export type DateFilter =
  | "all"
  | "this_week"
  | "this_month"
  | "next_7"
  | "next_30";

export type MemberProfile = {
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
  } | null;
};

export type AttendanceRecord = {
  session_id: string;
  status?: string;
};
