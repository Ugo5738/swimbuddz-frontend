export type CalendarAudience = "community" | "club" | "academy";
export type CalendarSource = "session" | "event";

export type CalendarItem = {
  id: string;
  source: CalendarSource;
  audience: CalendarAudience;
  kind: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_name: string | null;
  pool_id: string | null;
  status: string;
  href: string;
  bookable: boolean;
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
