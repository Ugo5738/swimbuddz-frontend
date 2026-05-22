// Types extracted from page.tsx during the file-size sweep.

export type ViewTab = "upcoming" | "booked" | "past" | "all";

export type DateFilter = "all" | "this_week" | "this_month" | "next_7" | "next_30";

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

// Returned by GET /api/v1/sessions/bookings/me. Only the fields the
// Booked tab needs are typed here (the endpoint returns the full
// SessionBookingResponse). status is "pending" | "confirmed" for the
// default active set; the booking lifecycle is intent-only so a booking
// never shows up in attendance until day-of sign-in — the Booked tab
// reads bookings directly.
//
// ``id`` and ``notes`` are needed for the self-report actions
// ("I can't make it" / "I'll be late") on each booking row.
export type MyBooking = {
  id?: string;
  session_id: string;
  status?: string;
  notes?: string | null;
};
