import { describe, expect, it } from "vitest";
import { buildSwimActivities, categorizeActivities, classifySession } from "../my-swims";

describe("member swim activity aggregation", () => {
  it("deduplicates a prepaid Club reservation against the ordinary booking endpoint", () => {
    const result = buildSwimActivities(
      [{ id: "booking-1", session_id: "session-1", status: "confirmed" }],
      [{ id: "session-1", session_type: "club", title: "Club swim", starts_at: "2027-05-01T09:00:00Z" }],
      [{
        id: "booking-1", session_id: "session-1", status: "confirmed", session_status: "scheduled",
        session_title: "Club swim", session_starts_at: "2027-05-01T09:00:00Z", location_name: "Yaba",
      }],
      [], []
    );
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("club");
    expect(result[0].club?.session_starts_at).toBe("2027-05-01T09:00:00Z");
  });

  it("resolves pool visit dates from offers and does not invent dates for unavailable offers", () => {
    const result = buildSwimActivities([], [], [], [
      { id: "visit-1", offer_id: "offer-1", status: "confirmed", headcount: 1, selling_total_kobo: 100000, payment_reference: "PAY-1" },
      { id: "visit-2", offer_id: "expired-offer", status: "confirmed", headcount: 1, selling_total_kobo: 100000, payment_reference: "PAY-2" },
    ], [{
      id: "offer-1", title: "Independent pool day", starts_at: "2027-05-03T10:00:00Z", ends_at: "2027-05-03T12:00:00Z", pool_name: "Partner pool",
    }]);
    expect(result[0]).toMatchObject({ title: "Independent pool day", location: "Partner pool", date: "2027-05-03T10:00:00Z" });
    expect(result[1].date).toBeNull();
    const sections = categorizeActivities(result, new Date("2027-01-01T00:00:00Z"));
    expect(sections.upcoming).toHaveLength(1);
    expect(sections.attention).toHaveLength(1);
  });

  it("excludes cancelled bookings from upcoming swims without hiding cancellation notices", () => {
    const result = buildSwimActivities([], [], [{
      id: "club-1", session_id: "session-1", session_title: "Yaba Saturday",
      session_starts_at: "2027-05-01T09:00:00Z", location_name: "Yaba", status: "cancelled",
      session_status: "scheduled",
    }], [], []);
    const sections = categorizeActivities(result, new Date("2027-01-01T00:00:00Z"));
    expect(sections.upcoming).toHaveLength(0);
    expect(sections.attention).toHaveLength(1);
  });

  it("does not misclassify an Academy session as a Club booking", () => {
    expect(classifySession({ id: "a", session_type: "academy_class" })).toBe("academy");
    expect(classifySession({ id: "b", session_type: "community_swim" })).toBe("community");
  });
});
