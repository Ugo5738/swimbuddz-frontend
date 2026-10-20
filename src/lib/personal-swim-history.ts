import {
  classifySession,
  type SwimActivity,
  type SwimSession,
} from "@/lib/my-swims";

export type HistoricalAttendance = {
  id: string;
  session_id: string;
  status: string;
  check_in_time?: string | null;
  session?: {
    id?: string;
    title?: string;
    session_type?: string;
    start_time?: string;
    starts_at?: string;
    ends_at?: string;
    location_name?: string;
  } | null;
};

export type PersonalSwimHistoryItem = {
  key: string;
  sessionId?: string;
  kind: SwimActivity["kind"];
  title: string;
  date: string | null;
  location: string | null;
  /** Real member attendance, not a session's completed status. */
  attendanceStatus?: string;
  /** A historical commitment or pool-access purchase. */
  bookingStatus?: string;
  activity?: SwimActivity;
};

const attendanceStates = new Set([
  "present", "late", "absent", "excused", "no_show", "checked_in",
]);
const when = (value?: string | null) => {
  const valueMs = Date.parse(value || "");
  return Number.isFinite(valueMs) ? valueMs : null;
};

/**
 * The personal Past view is driven by member commitments and attendance, never
 * by the public list of completed sessions. Match all session-linked sources by
 * session ID, with one resulting card and verified attendance taking priority.
 *
 * The attendance API carries the historical session snapshot, which can resolve
 * older sessions missing from the current catalogue's recent-pages window.
 */
export function buildPersonalSwimHistory({
  activities,
  attendance,
  sessions,
  now = new Date(),
}: {
  activities: SwimActivity[];
  attendance: HistoricalAttendance[];
  sessions: SwimSession[];
  now?: Date;
}): PersonalSwimHistoryItem[] {
  const bySession = new Map(sessions.map((session) => [session.id, session]));
  const rows = new Map<string, PersonalSwimHistoryItem>();
  const cutoff = now.getTime();

  for (const activity of activities) {
    const dateMs = when(activity.date);
    if (dateMs === null || dateMs >= cutoff) continue;

    const key = activity.sessionId
      ? `session:${activity.sessionId}`
      : activity.pool
        ? `pool:${activity.pool.id}`
        : activity.key;

    const previous = rows.get(key);
    if (previous) {
      // Keep a linked Club-quarter reservation when it exists, otherwise
      // preserve the first personal commitment. No repeated session cards.
      if (activity.club && !previous.activity?.club) {
        rows.set(key, {
          ...previous,
          kind: activity.kind,
          activity,
          bookingStatus: activity.status,
        });
      }
      continue;
    }
    rows.set(key, {
      key,
      sessionId: activity.sessionId,
      kind: activity.kind,
      title: activity.title,
      date: activity.date,
      location: activity.location,
      bookingStatus: activity.status,
      activity,
    });
  }

  for (const record of attendance) {
    if (!record.session_id) continue;
    const fromCatalogue = bySession.get(record.session_id);
    const session = record.session;
    const date = session?.start_time ?? session?.starts_at ??
      fromCatalogue?.starts_at ?? fromCatalogue?.start_time ?? null;
    const attendanceTime = when(record.check_in_time);
    const dateMs = when(date);
    const status = record.status?.toLowerCase() ?? "";
    // Include undated verified historical attendance, but never label a
    // future session as Past just because an attendance record exists.
    if (dateMs !== null && dateMs >= cutoff) continue;
    if (dateMs === null &&
      (!attendanceStates.has(status) || attendanceTime === null || attendanceTime >= cutoff)) {
      continue;
    }

    const key = `session:${record.session_id}`;
    const existing = rows.get(key);
    const sessionType = session?.session_type ?? fromCatalogue?.session_type;
    const fallbackKind = classifySession({
      id: record.session_id,
      session_type: sessionType,
    });
    const existingStatus = existing?.attendanceStatus?.toLowerCase();
    const preferNewStatus = !existingStatus ||
      (["present", "late", "checked_in"].includes(status) &&
        !["present", "late", "checked_in"].includes(existingStatus));
    rows.set(key, {
      key,
      sessionId: record.session_id,
      kind: existing?.kind && existing.kind !== "session" ? existing.kind : fallbackKind,
      title: session?.title || fromCatalogue?.title || existing?.title || "SwimBuddz session",
      date: date || existing?.date || record.check_in_time || null,
      location: session?.location_name || fromCatalogue?.location_name ||
        existing?.location || null,
      bookingStatus: existing?.bookingStatus,
      activity: existing?.activity,
      attendanceStatus: preferNewStatus ? record.status : existing?.attendanceStatus,
    });
  }

  return [...rows.values()].sort((a, b) =>
    (when(b.date) ?? -Infinity) - (when(a.date) ?? -Infinity) ||
    a.key.localeCompare(b.key)
  );
}
