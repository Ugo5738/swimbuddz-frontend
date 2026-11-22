import { describe, expect, it } from "vitest";
import { safeReturnPath, isAcademyDestination, isStandaloneReturnPath } from "../returnPath";
import { canPayAcademyEnrollment } from "../academy/paymentEligibility";
import { podDisplayName } from "../pods";
import { isPastOpportunity } from "../volunteers";

describe("safe cohort destinations", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2fevil.example",
    "https://evil.example",
    "/%00bad",
    "/%zz",
  ])("rejects %s", (path) => expect(safeReturnPath(path)).toBeNull());
  it("preserves the cohort and checkout query", () => {
    const path = "/checkout?purpose=academy_cohort&cohort_id=abc";
    expect(safeReturnPath(path)).toBe(path);
    expect(isAcademyDestination(path)).toBe(true);
    expect(isAcademyDestination("/checkout?purpose=community")).toBe(false);
    expect(isAcademyDestination("/account/academy-other")).toBe(false);
  });
  it("recognizes standalone storefront and public deep links", () => {
    expect(isStandaloneReturnPath("/store")).toBe(true);
    expect(isStandaloneReturnPath("/store/checkout")).toBe(true);
    expect(isStandaloneReturnPath("/store/cart")).toBe(true);
    expect(isStandaloneReturnPath("/pool-access/my-bookings")).toBe(true);
    expect(isStandaloneReturnPath("/experiences/exp-1")).toBe(true);
    expect(isStandaloneReturnPath("/guest-pass/gp-1")).toBe(true);
    expect(isStandaloneReturnPath("/tips/post-1")).toBe(true);
    expect(isStandaloneReturnPath("/store-other")).toBe(false);
    expect(isStandaloneReturnPath("/account/billing")).toBe(false);
    expect(isStandaloneReturnPath("//evil.example/store/checkout")).toBe(false);
  });
});

describe("Academy payment eligibility", () => {
  it.each(["waitlist", "dropped", "dropout_pending", "graduated", "", undefined])(
    "never offers payment for %s",
    (status) => expect(canPayAcademyEnrollment(status)).toBe(false)
  );
  it.each(["pending_approval", "enrolled"])("allows a reserved place: %s", (status) =>
    expect(canPayAcademyEnrollment(status)).toBe(true)
  );
});

it("distinguishes identical pod handles by location", () => {
  const pod = { name: "Dolphins", handle: "dolphins", slug: "dolphins" };
  expect(podDisplayName({ ...pod, club_location: "Yaba" })).toBe("Dolphins · Yaba");
  expect(podDisplayName({ ...pod, club_location: "Ago" })).toBe("Dolphins · Ago");
  expect(podDisplayName({ ...pod, name: "Yaba Dolphins", club_location: "Yaba" })).toBe(
    "Yaba Dolphins"
  );
});

it("uses the operating timezone for past opportunities", () => {
  const now = new Date("2026-09-11T23:30:00Z");
  expect(isPastOpportunity("2026-09-11", now)).toBe(true);
  expect(isPastOpportunity("2026-09-12", now)).toBe(false);
});
