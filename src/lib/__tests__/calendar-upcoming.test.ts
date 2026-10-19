import { describe, expect, it } from "vitest";
import { selectUpcomingCalendarItems, type CalendarItem } from "../calendar";

function activity(id: string, starts_at: string, status = "published"): CalendarItem {
  return {
    id, starts_at, status, source: "session", kind: "club",
    title: id, primary_audience: "club", audience: "club", audiences: ["club"],
    visibility: "members_only", access_level: "club", location_type: "physical",
    description: null, ends_at: null, timezone: "Africa/Lagos", location_name: "Yaba",
    location_area: null, pool_id: null, href: `/sessions/${id}`,
    bookable: false, viewer_can_attend: false,
  };
}

describe("member calendar discovery preview", () => {
  it("sorts upcoming sessions and excludes cancelled, past and invalid dates", () => {
    const selected = selectUpcomingCalendarItems([
      activity("later", "2026-11-01T09:00:00Z"),
      activity("cancelled", "2026-10-21T09:00:00Z", "cancelled"),
      activity("past", "2026-10-01T09:00:00Z"),
      activity("invalid", "not-a-date"),
      activity("next", "2026-10-24T09:00:00Z"),
    ], new Date("2026-10-19T00:00:00Z"), 5);
    expect(selected.map((item) => item.id)).toEqual(["next", "later"]);
  });

  it("does not mistake a visible members-only event for a confirmed reservation", () => {
    const selected = selectUpcomingCalendarItems([
      activity("not-booked", "2026-10-24T09:00:00Z"),
    ], new Date("2026-10-19T00:00:00Z"), 6);
    expect(selected).toHaveLength(1);
    expect(selected[0].bookable).toBe(false);
  });
});
