// Helpers extracted from page.tsx during the file-size sweep.

import type { SessionWithRides } from "@/components/sessions/SessionCard";

import type { DateFilter } from "./types";

export function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";

  return date.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

export function formatDate(start: string) {
  return new Date(start).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function timeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Starting now";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffHours > 0) return `In ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `In ${diffMin} min${diffMin === 1 ? "" : "s"}`;
}

export function isActiveBooking(status?: string): boolean {
  const s = String(status || "").toLowerCase();
  return s !== "cancelled" && s !== "canceled" && s !== "no_show";
}

/**
 * A SessionBooking only counts as "booked" once payment has cleared
 * (status CONFIRMED). PENDING is a reservation whose payment is still in
 * flight — or was abandoned — and must NOT read as booked, otherwise an
 * unpaid/abandoned online attempt shows the session as booked to the
 * member. Distinct from {@link isActiveBooking}, which is the right test
 * for day-of attendance records but too loose for booking status.
 */
export function isConfirmedBooking(status?: string): boolean {
  return String(status || "").toLowerCase() === "confirmed";
}

/** Get the start of this week (Monday) */
export function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the end of this week (Sunday 23:59) */
export function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Get end of this month */
export function getEndOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function filterByDate(
  sessions: SessionWithRides[],
  filter: DateFilter
): SessionWithRides[] {
  if (filter === "all") return sessions;

  const now = new Date();

  switch (filter) {
    case "this_week": {
      const start = getStartOfWeek();
      const end = getEndOfWeek();
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= start && d <= end;
      });
    }
    case "this_month": {
      const end = getEndOfMonth();
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    case "next_7": {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    case "next_30": {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    default:
      return sessions;
  }
}

export function filterByType(
  sessions: SessionWithRides[],
  types: Set<string>
): SessionWithRides[] {
  if (types.size === 0) return sessions;
  return sessions.filter((s) => types.has(s.session_type));
}

/** Group sessions by date and sort groups chronologically.
 *  When enrolledCohortIds is provided, enrolled-cohort sessions sort first within each date. */
export function groupByDate(
  sessions: SessionWithRides[],
  enrolledCohortIds?: Set<string>
): { dateKey: string; label: string; sessions: SessionWithRides[] }[] {
  const grouped = new Map<string, { label: string; sessions: SessionWithRides[] }>();

  for (const session of sessions) {
    const key = getDateKey(session.starts_at);
    if (!grouped.has(key)) {
      grouped.set(key, {
        label: formatDateHeader(session.starts_at),
        sessions: [],
      });
    }
    grouped.get(key)!.sessions.push(session);
  }

  // Sort sessions within each group: enrolled cohort first, then by time
  for (const group of grouped.values()) {
    group.sessions.sort((a, b) => {
      if (enrolledCohortIds && enrolledCohortIds.size > 0) {
        const aEnrolled = a.cohort_id ? enrolledCohortIds.has(a.cohort_id) : false;
        const bEnrolled = b.cohort_id ? enrolledCohortIds.has(b.cohort_id) : false;
        if (aEnrolled !== bEnrolled) return aEnrolled ? -1 : 1;
      }
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }

  // Sort groups by date
  return Array.from(grouped.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([dateKey, group]) => ({ dateKey, ...group }));
}
