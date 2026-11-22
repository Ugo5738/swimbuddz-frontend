import { describe, expect, it } from "vitest";
import {
  classifyJourneyDestination,
  destinationForGoal,
  JOURNEYS,
  resolvePostAuthJourney,
} from "../journeys";

describe("modular user journeys", () => {
  it("lets a store-only customer register without swimming enrollment", () => {
    expect(JOURNEYS.store.stages).not.toContain("onboarding");
    expect(resolvePostAuthJourney({ isFreshRegistration: true })).toBe("/explore");
    expect(resolvePostAuthJourney({ destination: "/store/checkout" })).toBe("/store/checkout");
    expect(classifyJourneyDestination("/account/orders")).toBe("store");
  });

  it("retains a programme selection through email verification", () => {
    expect(destinationForGoal("academy")).toBe("/upgrade/academy/cohort");
    expect(resolvePostAuthJourney({ requestedTiers: ["academy"] })).toBe("/upgrade/academy/cohort");
    expect(resolvePostAuthJourney({ requestedTiers: ["club"] })).toBe("/upgrade/club/readiness");
    expect(resolvePostAuthJourney({ destination: "/checkout?purpose=community" })).toBe("/checkout?purpose=community");
  });

  it("never accepts external return URLs or escalates an unrelated local URL", () => {
    expect(resolvePostAuthJourney({ destination: "//other.example" })).toBeNull();
    expect(resolvePostAuthJourney({ destination: "/admin/finance" })).toBeNull();
    expect(classifyJourneyDestination("https://other.example")).toBeNull();
  });

  it("does not hijack a selected session with a pending programme request", () => {
    expect(resolvePostAuthJourney({
      destination: "/sessions/session-1",
      requestedTiers: ["academy"],
    })).toBeNull();
    expect(resolvePostAuthJourney({ destination: "/account/profile", requestedTiers: ["club"] })).toBeNull();
  });

  it("does not override existing members' onboarding/billing rules", () => {
    expect(resolvePostAuthJourney({ communityActive: true })).toBeNull();
    expect(resolvePostAuthJourney({ academyActive: true })).toBeNull();
    expect(resolvePostAuthJourney({ isFreshRegistration: false })).toBeNull();
  });
});
