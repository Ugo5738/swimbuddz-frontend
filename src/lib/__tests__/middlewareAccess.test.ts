/**
 * Pins the route-access decision matrix (review finding F4).
 *
 * This is the security boundary. Every branch of the pre-refactor
 * middleware is locked here so the extraction stays behaviour-
 * preserving and future edits are deliberate. `now` is injected so
 * "paid until" comparisons are deterministic.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateMemberAccess,
  parseDateMs,
  type MiddlewareMember,
} from "../middlewareAccess";

const NOW = Date.UTC(2026, 4, 17); // fixed clock
const FUTURE = new Date(NOW + 86_400_000).toISOString(); // +1 day
const PAST = new Date(NOW - 86_400_000).toISOString(); // -1 day

function decide(
  pathname: string,
  member: MiddlewareMember,
  isJwtAdmin = false,
) {
  return evaluateMemberAccess({ pathname, isJwtAdmin, member, now: NOW });
}

describe("parseDateMs", () => {
  it("returns null for empty / unusable values", () => {
    expect(parseDateMs(null)).toBeNull();
    expect(parseDateMs(undefined)).toBeNull();
    expect(parseDateMs("")).toBeNull();
    expect(parseDateMs("not-a-date")).toBeNull();
  });

  it("parses an ISO string to epoch ms", () => {
    expect(parseDateMs("2026-05-17T00:00:00.000Z")).toBe(
      Date.UTC(2026, 4, 17),
    );
  });
});

describe("evaluateMemberAccess — admin bypass", () => {
  it("legacy role==='admin' is allowed everywhere", () => {
    expect(decide("/academy", { role: "admin" })).toEqual({ kind: "allow" });
  });

  it("legacy is_admin flag is allowed everywhere", () => {
    expect(decide("/admin/reports", { is_admin: true })).toEqual({
      kind: "allow",
    });
  });
});

describe("evaluateMemberAccess — approval gate", () => {
  it("pending → /register/pending", () => {
    expect(decide("/sessions", { approval_status: "pending" })).toEqual({
      kind: "redirect",
      path: "/register/pending",
    });
  });

  it("rejected → /register/pending", () => {
    expect(decide("/account", { approval_status: "rejected" })).toEqual({
      kind: "redirect",
      path: "/register/pending",
    });
  });

  it("approval gate takes precedence over the paywall", () => {
    // Pending + no payment: still the approval redirect, not billing.
    expect(
      decide("/sessions", {
        approval_status: "pending",
        membership: { community_paid_until: null },
      }),
    ).toEqual({ kind: "redirect", path: "/register/pending" });
  });
});

describe("evaluateMemberAccess — community paywall", () => {
  const unpaid: MiddlewareMember = {
    approval_status: "approved",
    membership: {
      community_paid_until: PAST,
      club_paid_until: null,
      academy_paid_until: null,
    },
  };

  it("blocks a non-account route when nothing is paid", () => {
    expect(decide("/attendance", unpaid)).toEqual({
      kind: "redirect",
      path: "/account/billing",
      search: { required: "community" },
    });
  });

  it("always lets the member reach /account to pay", () => {
    expect(decide("/account/billing", unpaid)).toEqual({ kind: "allow" });
    expect(decide("/account/profile", unpaid)).toEqual({ kind: "allow" });
  });

  it("active Club satisfies the Community paywall", () => {
    expect(
      decide("/attendance", {
        approval_status: "approved",
        membership: {
          community_paid_until: PAST,
          club_paid_until: FUTURE,
          active_tiers: ["club"],
        },
      }),
    ).toEqual({ kind: "allow" });
  });

  it("active Academy satisfies the Community paywall", () => {
    expect(
      decide("/attendance", {
        approval_status: "approved",
        membership: {
          community_paid_until: PAST,
          academy_paid_until: FUTURE,
          active_tiers: ["academy"],
        },
      }),
    ).toEqual({ kind: "allow" });
  });
});

describe("evaluateMemberAccess — tier-route gate", () => {
  it("community member can reach /sessions and /community", () => {
    const m: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        community_paid_until: FUTURE,
        active_tiers: ["community"],
      },
    };
    expect(decide("/sessions/abc", m)).toEqual({ kind: "allow" });
    expect(decide("/community/directory", m)).toEqual({ kind: "allow" });
  });

  it("community member hitting /academy with an upgrade already requested → upgrade=pending", () => {
    expect(
      decide("/academy/cohorts", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE,
          active_tiers: ["community"],
          requested_tiers: ["academy"],
        },
      }),
    ).toEqual({
      kind: "redirect",
      path: "/account/profile",
      search: { upgrade: "pending" },
    });
  });

  it("club-approved but unpaid hitting /club → billing(required=club)", () => {
    // The F4 dead branch is now fixed: requiredTier is the LOWEST
    // allowed tier (/club → "club"), so an approved-but-lapsed Club
    // member is sent to billing to reactivate — not back through the
    // upgrade-request flow.
    expect(
      decide("/club/training", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE, // passes the paywall
          club_paid_until: PAST, // approved but inactive
          active_tiers: ["community", "club"],
        },
      }),
    ).toEqual({
      kind: "redirect",
      path: "/account/billing",
      search: { required: "club" },
    });
  });

  it("academy-approved but lapsed hitting /academy → billing(required=academy)", () => {
    // Symmetric to the Club case (added with the F4 dead-branch fix).
    expect(
      decide("/academy/cohorts", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE, // passes the paywall
          academy_paid_until: PAST, // approved but inactive
          active_tiers: ["academy"],
        },
      }),
    ).toEqual({
      kind: "redirect",
      path: "/account/billing",
      search: { required: "academy" },
    });
  });

  it("community member hitting /academy with no request → register?upgrade=true", () => {
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE,
          active_tiers: ["community"],
        },
      }),
    ).toEqual({
      kind: "redirect",
      path: "/register",
      search: { upgrade: "true" },
    });
  });

  it("active Academy member reaches /academy", () => {
    expect(
      decide("/academy/cohorts/x", {
        approval_status: "approved",
        membership: {
          community_paid_until: PAST,
          academy_paid_until: FUTURE,
          active_tiers: ["academy"],
        },
      }),
    ).toEqual({ kind: "allow" });
  });

  it("Academy approved with null academy_paid_until still counts as active", () => {
    // academyActive = academyApproved && (academyUntilMs === null || > now)
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE,
          academy_paid_until: null,
          active_tiers: ["academy"],
        },
      }),
    ).toEqual({ kind: "allow" });
  });

  it("falls back to primary_tier when active_tiers is empty", () => {
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE,
          active_tiers: [],
          primary_tier: "community",
        },
      }),
    ).toEqual({
      kind: "redirect",
      path: "/register",
      search: { upgrade: "true" },
    });
  });

  it("non-tier member route (/account) with paid community is allowed", () => {
    expect(
      decide("/account/settings", {
        approval_status: "approved",
        membership: { community_paid_until: FUTURE },
      }),
    ).toEqual({ kind: "allow" });
  });
});
