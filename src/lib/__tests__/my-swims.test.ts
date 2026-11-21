import { describe, expect, it } from "vitest";
import { buildSwimActivities, categorizeActivities, classifySession, isActiveAcademyEnrollment, isMyScheduledClubSession } from "../my-swims";

describe("member swim activity aggregation", () => {
  it("includes active Academy cohort classes without pretending they were booked", () => {
    const sessions = [{
      id: "academy-a", cohort_id: "cohort-1", session_type: "cohort_class",
      title: "Lesson five", starts_at: "2027-05-01T09:00:00Z", status: "scheduled",
    }];
    const enrolled = [{ cohort_id: "cohort-1", status: "enrolled" }];
    const result = buildSwimActivities([], sessions, [], [], [], enrolled);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "academy", status: "assigned", assignedAcademy: true,
      sessionId: "academy-a",
    });
    expect(categorizeActivities(result, new Date("2027-01-01")).upcoming).toHaveLength(1);
    const booked = buildSwimActivities(
      [{ id: "paid-booking", session_id: "academy-a", status: "confirmed" }],
      sessions, [], [], [], enrolled
    );
    expect(booked).toHaveLength(1);
    expect(booked[0].assignedAcademy).toBeUndefined();
  });

  it("keeps installment-paying enrolled students in their assigned classes", () => {
    const sessions = [{ id: "week-5", cohort_id: "cohort-a", session_type: "cohort_class",
      starts_at: "2027-01-10T10:00:00Z", title: "Week 5", status: "scheduled" }];
    const activities = buildSwimActivities([], sessions, [], [], [], [{
      cohort_id: "cohort-a", status: "enrolled", payment_status: "pending",
    }]);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ assignedAcademy: true, status: "assigned" });
  });

  it("does not assign Academy classes to paused, suspended or pending enrollments", () => {
    expect(isActiveAcademyEnrollment({ status: "enrolled", paused_at: "2026-10-01" })).toBe(false);
    expect(isActiveAcademyEnrollment({ status: "enrolled", access_suspended: true })).toBe(false);
    expect(isActiveAcademyEnrollment({ status: "pending_approval" })).toBe(false);
    expect(isActiveAcademyEnrollment({ status: "enrolled" })).toBe(true);
  });

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

  describe("upcoming home Club schedule", () => {
    const future = "2027-05-01T09:00:00Z";
    const today = new Date("2027-01-01T00:00:00Z");
    const pod = { id: "pod-home", club_id: "club-home", status: "active" };
    const home = {
      id: "practice-1", title: "Dolphin practice", session_type: "club",
      starts_at: future, status: "scheduled", club_id: "club-home",
      pod_id: "pod-home", access: { access_source: "club_enrollment" },
    };

    it("shows a home pod practice without inventing a reservation", () => {
      const rows = buildSwimActivities([], [home], [], [], [], [], pod, today);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        sessionId: "practice-1", status: "scheduled_for_pod",
        scheduledClub: true, kind: "club",
      });
      expect(rows[0].club).toBeUndefined();
      expect(rows[0].canBook).toBe(false); // no authoritatively granted booking action
      expect(categorizeActivities(rows, today).upcoming).toHaveLength(1);
    });

    it("only enables the booking CTA when the backend grants bookable access", () => {
      const available = { ...home, access: { ...home.access, bookable: true } };
      const unavailable = { ...home, id: "sold-out", access: { ...home.access, bookable: false } };
      const rows = buildSwimActivities([], [available, unavailable], [], [], [], [], pod, today);
      expect(rows.map(row => [row.sessionId, row.canBook])).toEqual([
        ["practice-1", true], ["sold-out", false],
      ]);
    });

    it("does not show another pod or Club location", () => {
      const rows = buildSwimActivities([], [
        home,
        { ...home, id: "other-pod", pod_id: "other-pod" },
        { ...home, id: "other-club", club_id: "club-other" },
      ], [], [], [], [], pod, today);
      expect(rows.map(r => r.sessionId)).toEqual(["practice-1"]);
    });

    it("includes a general session at the member's enrolled Club", () => {
      const general = { ...home, pod_id: null };
      const rows = buildSwimActivities([], [general], [], [], [], [], pod, today);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("scheduled_for_club");
    });

    it("refuses visiting and community drop-in sessions on My Swims", () => {
      const sources = ["club_visit", "community_dropin", "none"];
      const rows = buildSwimActivities([], sources.map((source, i) => ({
        ...home, id: `visit-${i}`, access: { access_source: source },
      })), [], [], [], [], pod, today);
      expect(rows).toEqual([]);
    });

    it("requires a known Club home for legacy and post-Academy grants", () => {
      const old = { ...home, pod_id: null, access: { access_source: "legacy_club_entitlement" } };
      const bridge = { ...home, pod_id: null, access: { access_source: "post_academy_bridge" } };
      expect(isMyScheduledClubSession(old, null)).toBe(false);
      expect(isMyScheduledClubSession(bridge, null)).toBe(false);
      expect(isMyScheduledClubSession(old, pod)).toBe(true);
    });

    it("keeps confirmed and cancelled reservations authoritative without duplicate schedules", () => {
      for (const status of ["confirmed", "cancelled"]) {
        const rows = buildSwimActivities([
          { id: "booking-1", session_id: "practice-1", status },
        ], [home], [], [], [], [], pod, today);
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe(status);
        expect(rows[0].scheduledClub).toBeUndefined();
        expect(categorizeActivities(rows, today).upcoming).toHaveLength(status === "confirmed" ? 1 : 0);
      }
    });

    it("does not convert old or cancelled Club sessions to new scheduled swims", () => {
      const rows = buildSwimActivities([], [
        { ...home, id: "past", starts_at: "2026-05-01T09:00:00Z" },
        { ...home, id: "cancelled", status: "cancelled" },
        { ...home, id: "draft", status: "draft" },
      ], [], [], [], [], pod, today);
      expect(rows).toEqual([]);
    });
  });

  it("does not misclassify an Academy session as a Club booking", () => {
    expect(classifySession({ id: "a", session_type: "academy_class" })).toBe("academy");
    expect(classifySession({ id: "b", session_type: "community_swim" })).toBe("community");
  });
});
