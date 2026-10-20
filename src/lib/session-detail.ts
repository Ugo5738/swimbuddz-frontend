import type { HistoricalAttendance } from "@/lib/personal-swim-history";
import type { Session } from "@/lib/sessions";

export type SessionDetailView = {
  id: string;
  title: string;
  description: string | null;
  sessionType: string | null;
  status: string | null;
  startsAt: string | null;
  endsAt: string | null;
  locationName: string | null;
  locationAddress: string | null;
  attendanceStatus: string | null;
  /** Archived attendance only contains a historical snapshot, not current access. */
  historicalSnapshot: boolean;
  canBook: boolean;
};

/** Current sessions are authoritative for schedules and booking eligibility. */
export function activeSessionDetail(session: Session): SessionDetailView {
  return {
    id: session.id,
    title: session.title,
    description: session.description || null,
    sessionType: session.session_type,
    status: session.status,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    locationName: session.location_name || session.location || null,
    locationAddress: session.location_address || null,
    attendanceStatus: null,
    historicalSnapshot: false,
    canBook: session.status === "scheduled" &&
      Date.parse(session.starts_at) > Date.now() &&
      session.access?.bookable === true,
  };
}

/**
 * A past session can be archived or unavailable through GET /sessions/:id.
 * Only use a snapshot taken from the authenticated member's own attendance
 * endpoint, never a generic catalogue entry, to avoid exposing private data.
 */
export function historicalSessionDetail(
  records: HistoricalAttendance[],
  sessionId: string
): SessionDetailView | null {
  const record = records.find((item) => item.session_id === sessionId);
  if (!record) return null;
  const snapshot = record.session;
  return {
    id: sessionId,
    title: snapshot?.title || "Recorded SwimBuddz session",
    description: null,
    sessionType: snapshot?.session_type || null,
    status: "completed",
    startsAt: snapshot?.start_time || snapshot?.starts_at || record.check_in_time || null,
    endsAt: snapshot?.ends_at || null,
    locationName: snapshot?.location_name || null,
    locationAddress: null,
    attendanceStatus: record.status,
    historicalSnapshot: true,
    canBook: false,
  };
}
