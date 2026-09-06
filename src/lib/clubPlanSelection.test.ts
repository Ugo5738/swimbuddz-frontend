import { describe, expect, it } from "vitest";

import type { ClubPlan } from "./clubOnboarding";
import {
  clubQuarterLabel,
  sortClubPlans,
  toggleIndependentClubPlan,
} from "./clubPlanSelection";

function plan(
  id: string,
  periodStart: string,
  periodEnd: string,
  entryAvailable = true,
): ClubPlan {
  return {
    id,
    club_id: "club-1",
    club_name: "Yaba Club",
    club_slug: "yaba",
    location: "Yaba",
    operating_area_id: "mainland",
    pool_id: "rowe-park",
    default_pool_id: "rowe-park",
    name: `${id} Club`,
    billing_cycle: "quarterly",
    currency: "NGN",
    club_fee_kobo: 6_000_000,
    community_experience_fee_kobo: 3_000_000,
    community_experience_default_selected: true,
    community_experience_offering_id: "experience-1",
    sessions_included: 12,
    period_start: periodStart,
    period_end: periodEnd,
    minimum_entry_sessions: 5,
    remaining_sessions: 12,
    entry_available: entryAvailable,
    entry_reason: entryAvailable ? null : "Entry closed",
    current_price_kobo: 6_000_000,
    refreshments_included: true,
    capacity: null,
    premium_venue_note: null,
    effective_from: periodStart,
    effective_to: null,
    is_active: true,
  };
}

const q1 = plan("q1", "2027-01-01", "2027-03-31");
const q3 = plan("q3", "2027-07-01", "2027-09-30");

describe("Club quarter selection", () => {
  it("formats the quarter from the plan period without local timezone drift", () => {
    expect(clubQuarterLabel(q1)).toBe("Q1 2027");
  });

  it("sorts published quarters without imposing adjacency", () => {
    expect(sortClubPlans([q3, q1])).toEqual([q1, q3]);
  });

  it("selects a future quarter without adding an intermediate quarter", () => {
    expect(toggleIndependentClubPlan([q1.id], q3)).toEqual([q1.id, q3.id]);
  });

  it("does not select a future quarter whose entry is unavailable", () => {
    expect(
      toggleIndependentClubPlan([q1.id], { ...q3, entry_available: false }),
    ).toEqual([q1.id]);
  });
});
