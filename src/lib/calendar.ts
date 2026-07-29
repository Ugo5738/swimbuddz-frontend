export type CalendarAudience = "community" | "club" | "academy";
export type CalendarSource = "session" | "event";
export type CalendarVisibility = "public" | "members_only" | "invite_only";
export type CalendarLocationType = "physical" | "online" | "hybrid";

export type CalendarItem = {
  id: string;
  source: CalendarSource;
  audience: CalendarAudience;
  kind: string;
  visibility: CalendarVisibility;
  access_level: string;
  location_type: CalendarLocationType;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_name: string | null;
  location_area: string | null;
  pool_id: string | null;
  status: string;
  href: string;
  bookable: boolean;
  viewer_can_attend: boolean;
};

export type CalendarResponse = {
  items: CalendarItem[];
  range_start: string;
  range_end: string;
  available_audiences: CalendarAudience[];
  errors: Record<string, string>;
};

export const CALENDAR_AUDIENCE_LABELS: Record<CalendarAudience, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy",
};

export const CALENDAR_VISIBILITY_LABELS: Record<CalendarVisibility, string> = {
  public: "Public",
  members_only: "Members-only",
  invite_only: "Invite-only",
};

export const CALENDAR_ACTIVITY_LABELS: Record<string, string> = {
  assessment: "Assessment",
  beach_day: "Beach day",
  bring_a_buddy: "Bring-a-Buddy",
  cohort_class: "Academy class",
  community: "Community swim",
  club: "Club training",
  open_swim: "Open swim",
  online_talk: "Online talk",
  quarter_meet: "Quarter meet",
  social: "Social",
  volunteer: "Volunteer",
  wrapped: "SwimBuddz Wrapped",
};

export const CALENDAR_AUDIENCE_COLORS: Record<
  CalendarAudience,
  { background: string; border: string; dot: string }
> = {
  community: {
    background: "#0369a1",
    border: "#075985",
    dot: "bg-sky-700",
  },
  club: {
    background: "#15803d",
    border: "#166534",
    dot: "bg-green-700",
  },
  academy: {
    background: "#c2410c",
    border: "#9a3412",
    dot: "bg-orange-700",
  },
};

export function formatCalendarDateTime(item: CalendarItem): string {
  const startsAt = new Date(item.starts_at);
  try {
    return new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: item.timezone,
      timeZoneName: "short",
    }).format(startsAt);
  } catch {
    return new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(startsAt);
  }
}
