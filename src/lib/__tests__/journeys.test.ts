import { describe, expect, it } from "vitest";
import { classifyJourneyDestination, destinationForGoal, JOURNEYS, resolvePostAuthJourney } from "../journeys";

describe("configurable journeys", () => {
  it("keeps shop-only accounts separate from swimming membership", () => {
    expect(JOURNEYS.store.stages).not.toContain("onboarding");
    expect(resolvePostAuthJourney({})).toBe("/explore");
    expect(resolvePostAuthJourney({ destination: "/store/checkout" })).toBe("/store/checkout");
    expect(classifyJourneyDestination("/account/orders")).toBe("store");
  });
  it("preserves chosen swimming products and defers onboarding", () => {
    expect(destinationForGoal("academy")).toBe("/upgrade/academy/cohort");
    expect(resolvePostAuthJourney({ requestedTiers: ["academy"] })).toBe("/upgrade/academy/cohort");
    expect(resolvePostAuthJourney({ requestedTiers: ["club"] })).toBe("/upgrade/club/readiness");
    expect(resolvePostAuthJourney({ destination: "/checkout?purpose=community" })).toBe("/checkout?purpose=community");
  });
  it("does not accept external return URLs", () => {
    expect(resolvePostAuthJourney({ destination: "//attacker.test", communityActive: false })).toBe("/explore");
    expect(classifyJourneyDestination("https://attacker.test")).toBeNull();
  });
  it("does not override an enrolled member's default dashboard route", () => {
    expect(resolvePostAuthJourney({ communityActive: true })).toBeNull();
    expect(resolvePostAuthJourney({ academyActive: true })).toBeNull();
  });
});
