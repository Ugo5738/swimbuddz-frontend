import { describe, expect, it } from "vitest";
import { buildPersonalSwimHistory } from "../personal-swim-history";
import type { SwimActivity } from "../my-swims";

const booking: SwimActivity = {
  key: "session:booking-a",
  sessionId: "session-a",
  bookingId: "booking-a",
  kind: "club",
  title: "Club Swim",
  date: "2026-02-14T12:00:00Z",
  location: "Rowe Park",
  status: "confirmed",
};

describe("personal past swims", () => {
  const now = new Date("2026-10-20T18:00:00Z");
  it("combines a booking and recorded attendance into one card", () => {
    const rows = buildPersonalSwimHistory({
      activities: [booking],
      attendance: [{ id: "attendance-a", session_id: "session-a", status: "present",
        session: { title: "Club Swim", session_type: "club", start_time: "2026-02-14T12:00:00Z" } }],
      sessions: [],
      now,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sessionId: "session-a", attendanceStatus: "present",
      bookingStatus: "confirmed", kind: "club" });
  });

  it("includes old attendance from historical session snapshots, without recent catalogue", () => {
    const rows = buildPersonalSwimHistory({ activities: [], sessions: [], now, attendance: [
      { id: "old", session_id: "old-session", status: "late",
        session: { title: "Saturday Swim", start_time: "2025-02-01T09:00:00Z" } },
    ]});
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Saturday Swim");
    expect(rows[0].attendanceStatus).toBe("late");
  });

  it("does not mistake generic completed sessions for personal history", () => {
    expect(buildPersonalSwimHistory({ activities: [], attendance: [], sessions: [
      { id: "other", title: "Unattended completed session", starts_at: "2026-02-01T09:00:00Z" },
    ], now })).toEqual([]);
  });

  it("keeps independent pool visits distinct while deduplicating session bookings", () => {
    const rows = buildPersonalSwimHistory({ activities: [booking, booking,
      { key: "pool:one", kind: "pool", bookingId: "one", title: "Pool Access",
        location: "Yaba", date: "2026-02-14T11:00:00Z", status: "confirmed",
        pool: { id: "one", offer_id: "offer", status: "confirmed", headcount: 1,
          selling_total_kobo: 5000, payment_reference: "p" } },
    ], attendance: [], sessions: [], now });
    expect(rows.map(r => r.key)).toEqual(["session:session-a", "pool:one"]);
  });

  it("excludes future attendance and sessions with no verified historical time", () => {
    const rows = buildPersonalSwimHistory({ activities: [], sessions: [], now, attendance: [
      { id: "future", session_id: "future", status: "present",
        session: { start_time: "2026-12-01T11:00:00Z" } },
      { id: "unknown", session_id: "unknown", status: "registered" },
      { id: "missing-date", session_id: "missing-date", status: "present" },
    ]});
    expect(rows).toEqual([]);
  });
});
