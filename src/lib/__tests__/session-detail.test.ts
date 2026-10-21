import { describe, expect, it } from "vitest";
import { activeSessionDetail, historicalSessionDetail } from "../session-detail";
import type { Session } from "../sessions";

describe("session detail route data", () => {
  it("uses authoritative current session details with backend bookability", () => {
    const session = {
      id: "current", title: "Club practice", session_type: "club", status: "scheduled",
      starts_at: "2099-10-20T09:00:00Z", ends_at: "2099-10-20T11:00:00Z",
      location_name: "Yaba", access: { bookable: true },
    } as Session;
    expect(activeSessionDetail(session)).toMatchObject({
      id: "current", title: "Club practice", historicalSnapshot: false, canBook: true,
    });
  });

  it("resolves old sessions from this member's verified attendance history", () => {
    const details = historicalSessionDetail([{
      id: "attendance-1", session_id: "old-session", status: "present",
      session: { title: "Saturday Swim", session_type: "club",
        start_time: "2026-02-14T12:00:00Z", location_name: "Rowe Park" },
    }], "old-session");
    expect(details).toMatchObject({
      id: "old-session", title: "Saturday Swim", attendanceStatus: "present",
      historicalSnapshot: true, canBook: false,
    });
  });

  it("does not reveal another member's session or make past sessions bookable", () => {
    const records = [{ id: "a", session_id: "mine", status: "late" }];
    expect(historicalSessionDetail(records, "someone-else")).toBeNull();
    expect(historicalSessionDetail(records, "mine")?.canBook).toBe(false);
  });
});
