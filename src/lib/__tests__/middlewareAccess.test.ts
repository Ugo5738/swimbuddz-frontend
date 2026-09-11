/**
 * Pins the route-access decision matrix (review finding F4).
 *
 * This is the security boundary. Every branch of the pre-refactor
 * middleware is locked here so the extraction stays behaviour-
 * preserving and future edits are deliberate.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateMemberAccess,
  requiresMemberAccess,
  type MiddlewareMember,
} from "../middlewareAccess";

const NOW = Date.UTC(2026, 4, 17); // fixed clock
const FUTURE = new Date(NOW + 86_400_000).toISOString(); // +1 day
const PAST = new Date(NOW - 86_400_000).toISOString(); // -1 day

function decide(pathname: string, member: MiddlewareMember, isJwtAdmin = false) {
  return evaluateMemberAccess({ pathname, isJwtAdmin, member });
}

function accessRedirect(required: string, status: string, returnTo: string) {
  return {
    kind: "redirect" as const,
    path: "/account/access",
    search: { required, status, returnTo },
  };
}

describe("requiresMemberAccess", () => {
  it.each([
    "/community",
    "/community/leaderboard",
    "/club",
    "/academy",
    "/academy/programs",
    "/academy/programs/adult-learn-to-swim",
  ])("keeps the public route %s public", (pathname) =>
    expect(requiresMemberAccess(pathname)).toBe(false)
  );

  it.each([
    "/sessions",
    "/sessions/abc",
    "/community/directory",
    "/club/training",
    "/academy/cohorts",
    "/account",
    "/upgrade/club/plan",
  ])("wires member checks for %s", (pathname) => {
    expect(requiresMemberAccess(pathname)).toBe(true);
  });

  it("does not match unrelated paths with the same text prefix", () => {
    expect(requiresMemberAccess("/community-centre")).toBe(false);
  });

  it("keeps onboarding, Academy enrollment and recovery reachable without a paid tier", () => {
    const unpaid: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "prospect",
        tier_statuses: {
          academy: { status: "payment_pending" },
        },
      },
    };

    for (const path of ["/account/academy", "/account/academy/cohorts/chosen", "/account/academy/enrollments/waitlisted", "/account/academy/enrollment-success"]) {
      expect(decide(path, unpaid)).toEqual({ kind: "allow" });
      expect(requiresMemberAccess(path)).toBe(true);
    }
    expect(decide("/account/academy-private", unpaid)).toEqual(accessRedirect("community", "inactive", "/account/academy-private"));
    expect(decide("/community/directory", unpaid).kind).toBe("redirect");
    expect(decide("/account/billing", unpaid)).toEqual({ kind: "allow" });
    expect(decide("/account/profile", unpaid)).toEqual({ kind: "allow" });
    expect(decide("/account/onboarding", unpaid)).toEqual({ kind: "allow" });
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
      search: { next: "/sessions" },
    });
  });

  it("rejected → /register/pending", () => {
    expect(decide("/account", { approval_status: "rejected" })).toEqual({
      kind: "redirect",
      path: "/register/pending",
      search: { next: "/account" },
    });
  });

  it("approval gate takes precedence over the paywall", () => {
    // Pending + no payment: still the approval redirect, not billing.
    expect(
      decide("/sessions", {
        approval_status: "pending",
        membership: { community_paid_until: null },
      })
    ).toEqual({ kind: "redirect", path: "/register/pending", search: { next: "/sessions" } });
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
    expect(decide("/attendance", unpaid)).toEqual(
      accessRedirect("community", "inactive", "/attendance")
    );
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
          paid_tier: "club",
          tier_statuses: {
            community: { status: "active" },
            club: { status: "active" },
          },
          community_paid_until: PAST,
          club_paid_until: FUTURE,
          active_tiers: ["club"],
        },
      })
    ).toEqual({ kind: "allow" });
  });

  it("backend active Club status satisfies paywall and club route even without raw dates", () => {
    const member: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "club",
        community_paid_until: null,
        club_paid_until: null,
        tier_statuses: {
          community: { status: "active" },
          club: { status: "active" },
        },
      },
    };

    expect(decide("/attendance", member)).toEqual({ kind: "allow" });
    expect(decide("/club/training", member)).toEqual({ kind: "allow" });
  });

  it("backend prospect status overrides stale raw paid dates at the paywall", () => {
    expect(
      decide("/attendance", {
        approval_status: "approved",
        membership: {
          paid_tier: "prospect",
          community_paid_until: FUTURE,
          tier_statuses: {
            community: { status: "approved_unpaid" },
          },
        },
      })
    ).toEqual(accessRedirect("community", "approved_unpaid", "/attendance"));
  });

  it("active Academy satisfies the Community paywall", () => {
    expect(
      decide("/attendance", {
        approval_status: "approved",
        membership: {
          paid_tier: "academy",
          tier_statuses: {
            community: { status: "active" },
            club: { status: "active" },
            academy: { status: "active" },
          },
          community_paid_until: PAST,
          academy_paid_until: FUTURE,
          active_tiers: ["academy"],
        },
      })
    ).toEqual({ kind: "allow" });
  });
});

describe("evaluateMemberAccess — tier-route gate", () => {
  it("keeps programme onboarding reachable before annual Membership payment", () => {
    const member: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "prospect",
        tier_statuses: { community: { status: "approved_unpaid" } },
      },
    };

    expect(decide("/upgrade/club/readiness", member)).toEqual({ kind: "allow" });
    expect(decide("/upgrade/academy/cohort", member)).toEqual({ kind: "allow" });
  });

  it("does not treat Academy as Club or annual Membership access", () => {
    const academyOnly: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "academy",
        effective_paid_tiers: ["academy"],
        tier_statuses: {
          community: { status: "approved_unpaid" },
          club: { status: "inactive" },
          academy: { status: "active" },
        },
      },
    };

    expect(decide("/academy/cohorts", academyOnly)).toEqual({ kind: "allow" });
    expect(decide("/sessions/academy-session", academyOnly)).toEqual({ kind: "allow" });
    expect(decide("/club/training", academyOnly)).toEqual(
      accessRedirect("club", "inactive", "/club/training")
    );
    expect(decide("/community/directory", academyOnly)).toEqual(
      accessRedirect("community", "approved_unpaid", "/community/directory")
    );
  });

  it("does not treat Club as annual Membership access", () => {
    const clubOnly: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "club",
        effective_paid_tiers: ["club"],
        tier_statuses: {
          community: { status: "approved_unpaid" },
          club: { status: "active" },
          academy: { status: "inactive" },
        },
      },
    };

    expect(decide("/club/training", clubOnly)).toEqual({ kind: "allow" });
    expect(decide("/community/directory", clubOnly)).toEqual(
      accessRedirect("community", "approved_unpaid", "/community/directory")
    );
  });

  it("community member can reach /sessions and /community", () => {
    const m: MiddlewareMember = {
      approval_status: "approved",
      membership: {
        paid_tier: "community",
        tier_statuses: { community: { status: "active" } },
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
          paid_tier: "community",
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "requested" },
          },
          community_paid_until: FUTURE,
          active_tiers: ["community"],
          requested_tiers: ["academy"],
        },
      })
    ).toEqual(accessRedirect("academy", "requested", "/academy/cohorts"));
  });

  it("backend requested status drives upgrade-pending route without raw requested_tiers", () => {
    expect(
      decide("/academy/cohorts", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          community_paid_until: FUTURE,
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "requested" },
          },
        },
      })
    ).toEqual(accessRedirect("academy", "requested", "/academy/cohorts"));
  });

  it("backend payment_pending status sends protected tier routes to billing", () => {
    expect(
      decide("/club/training", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          community_paid_until: FUTURE,
          tier_statuses: {
            community: { status: "active" },
            club: { status: "payment_pending" },
          },
        },
      })
    ).toEqual(accessRedirect("club", "payment_pending", "/club/training"));
  });

  it("backend approved_unpaid status sends protected tier routes to billing", () => {
    expect(
      decide("/academy/cohorts", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          community_paid_until: FUTURE,
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "approved_unpaid" },
          },
        },
      })
    ).toEqual(accessRedirect("academy", "approved_unpaid", "/academy/cohorts"));
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
          paid_tier: "community",
          tier_statuses: {
            community: { status: "active" },
            club: { status: "expired" },
          },
          community_paid_until: FUTURE, // passes the paywall
          club_paid_until: PAST, // approved but inactive
          active_tiers: ["community", "club"],
        },
      })
    ).toEqual(accessRedirect("club", "expired", "/club/training"));
  });

  it("academy-approved but lapsed hitting /academy → billing(required=academy)", () => {
    // Symmetric to the Club case (added with the F4 dead-branch fix).
    expect(
      decide("/academy/cohorts", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "expired" },
          },
          community_paid_until: FUTURE, // passes the paywall
          academy_paid_until: PAST, // approved but inactive
          active_tiers: ["academy"],
        },
      })
    ).toEqual(accessRedirect("academy", "expired", "/academy/cohorts"));
  });

  it("community member hitting /academy with no request → register?upgrade=true", () => {
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "inactive" },
          },
          community_paid_until: FUTURE,
          active_tiers: ["community"],
        },
      })
    ).toEqual(accessRedirect("academy", "inactive", "/academy"));
  });

  it("active Academy member reaches /academy", () => {
    expect(
      decide("/academy/cohorts/x", {
        approval_status: "approved",
        membership: {
          paid_tier: "academy",
          tier_statuses: {
            community: { status: "active" },
            club: { status: "active" },
            academy: { status: "active" },
          },
          community_paid_until: PAST,
          academy_paid_until: FUTURE,
          active_tiers: ["academy"],
        },
      })
    ).toEqual({ kind: "allow" });
  });

  it("Academy approval without paid entitlement is not treated as active", () => {
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          tier_statuses: {
            community: { status: "active" },
            academy: { status: "approved_unpaid" },
          },
          community_paid_until: FUTURE,
          academy_paid_until: null,
          active_tiers: ["academy"],
        },
      })
    ).toEqual(accessRedirect("academy", "approved_unpaid", "/academy"));
  });

  it("fails closed when the normalized membership summary is missing", () => {
    expect(
      decide("/academy", {
        approval_status: "approved",
        membership: {
          community_paid_until: FUTURE,
          active_tiers: [],
          primary_tier: "community",
        },
      })
    ).toEqual(accessRedirect("community", "inactive", "/academy"));
  });

  it("non-tier account route with normalized paid community is allowed", () => {
    expect(
      decide("/account/settings", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          tier_statuses: { community: { status: "active" } },
          community_paid_until: FUTURE,
        },
      })
    ).toEqual({ kind: "allow" });
  });

  it("active Community can open personal quarterly reports", () => {
    expect(
      decide("/account/reports/q2-2026", {
        approval_status: "approved",
        membership: {
          paid_tier: "community",
          tier_statuses: { community: { status: "active" } },
        },
      })
    ).toEqual({ kind: "allow" });
  });
});
