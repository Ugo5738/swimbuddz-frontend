export type CalendarAudience = "community" | "club" | "academy";
export type CalendarSource = string;
export type CalendarVisibility = "public" | "members_only" | "invite_only";
export type CalendarLocationType = "physical" | "online" | "hybrid";

export type CalendarItem = {
  id: string;
  source: CalendarSource;
  primary_audience: CalendarAudience;
  audiences: CalendarAudience[];
  /** Deprecated compatibility alias for primary_audience. */
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
  available_activity_types: Array<{ key: string; label: string }>;
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
  community_swim: "Community Swim",
  club: "Club training",
  open_swim: "Open swim",
  online_talk: "Online talk",
  quarter_meet: "Quarter meet",
  social: "Social",
  volunteer: "Volunteer",
  wrapped: "SwimBuddz Wrapped",
};

export function calendarActivityLabel(kind: string): string {
  const known = CALENDAR_ACTIVITY_LABELS[kind];
  if (known) return known;
  return kind
    .replaceAll("-", "_")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function calendarPrimaryAudience(item: CalendarItem): CalendarAudience {
  return item.primary_audience ?? item.audience;
}

export function calendarAudiences(item: CalendarItem): CalendarAudience[] {
  return item.audiences?.length ? item.audiences : [calendarPrimaryAudience(item)];
}

export function calendarMatchesAudience(
  item: CalendarItem,
  audience: CalendarAudience
): boolean {
  return calendarAudiences(item).includes(audience);
}

export function calendarSourceLabel(source: string): string {
  const known: Record<string, string> = {
    session: "Swim session",
    event: "Event",
    challenge: "Challenge",
    experience: "Experience",
    volunteer_opportunity: "Volunteer opportunity",
  };
  return known[source] ?? calendarActivityLabel(source);
}

export function calendarActionLabel(item: CalendarItem): string {
  if (item.source === "session") return item.bookable ? "Book session" : "View session";
  if (item.source === "event") return item.viewer_can_attend ? "View event" : "View eligibility";
  const known: Record<string, string> = {
    challenge: "View challenge",
    experience: "View experience",
    volunteer_opportunity: "View opportunity",
  };
  return known[item.source] ?? "View activity";
}

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
