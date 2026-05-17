/**
 * Pure access-decision logic for the route middleware (review finding F4).
 *
 * The middleware used to inline a ~140-line nested decision tree
 * (approval gate → community paywall → tier-route gate) directly
 * against an untyped `await res.json()`. That made the security
 * boundary effectively untestable and leaned on `any`.
 *
 * This module isolates the decision as a **pure function**:
 * `evaluateMemberAccess(input) -> AccessDecision`. No I/O, no
 * NextRequest, no Supabase — just (pathname, member snapshot, now) in,
 * a decision out. `src/middleware.ts` keeps all I/O and translates the
 * decision into a `NextResponse`. The matrix is pinned by
 * `__tests__/middlewareAccess.test.ts`.
 *
 * IMPORTANT: this is a behaviour-preserving extraction. The branch
 * order and every redirect target/param match the pre-refactor
 * middleware exactly. Change behaviour only with a matching test
 * change and a clear reason — this is the access boundary.
 */

import type { MembershipTier } from "@/lib/tiers";

/**
 * The slice of `GET /api/v1/members/me` the access decision actually
 * reads. Intentionally a narrow, hand-written view (not the 15k-line
 * generated union) so the security logic depends on a small, explicit
 * contract. `role`/`is_admin` are legacy top-level admin signals kept
 * for backwards compatibility with the original middleware.
 */
export interface MiddlewareMember {
  role?: string | null;
  is_admin?: boolean | null;
  approval_status?: string | null;
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
  } | null;
}

export interface AccessInput {
  pathname: string;
  /** Already-resolved from the signed JWT's app_metadata.roles. */
  isJwtAdmin: boolean;
  member: MiddlewareMember;
  /** Injected for deterministic tests (defaults to Date.now()). */
  now?: number;
}

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; path: string; search?: Record<string, string> };

const ALLOW: AccessDecision = { kind: "allow" };

// Tier access requirements per protected route prefix. Mirrors the
// original middleware's TIER_ROUTES exactly.
const TIER_ROUTES: Record<string, MembershipTier[]> = {
  "/community": ["community", "club", "academy"],
  "/club": ["club", "academy"],
  // Sessions include Community sessions, so Community members must be
  // able to access /sessions/*. Per-session tier restrictions are
  // enforced by the sessions API/UI, not this blanket rule.
  "/sessions": ["community", "club", "academy"],
  "/academy": ["academy"],
};

/** Parse an ISO date-ish value to epoch ms, or null if unusable. */
export function parseDateMs(value: unknown): number | null {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Decide whether a member may proceed to `pathname`, or where to
 * redirect them. Pure — same inputs always yield the same decision.
 *
 * Branch order (unchanged from the original middleware):
 *   1. legacy top-level admin (`role==="admin"` / `is_admin`) → allow
 *   2. approval pending/rejected → /register/pending
 *   3. community activation paywall → /account/billing?required=community
 *   4. tier-route gate → upgrade-pending / billing(club) / register-upgrade
 *   5. otherwise → allow
 */
export function evaluateMemberAccess(input: AccessInput): AccessDecision {
  const { pathname, member } = input;
  const now = input.now ?? Date.now();

  // 1. Legacy admin signal (JWT admin is handled by the caller before
  // we ever get here; this preserves the old member.role fallback).
  if (member.role === "admin" || member.is_admin) {
    return ALLOW;
  }

  // 2. Approval status gate. Pending/rejected members are sent to the
  // waiting page (unless they're already on it). Matched routes never
  // include /register/pending, so in practice this always redirects;
  // the guard is kept verbatim for behaviour parity.
  const approval = member.approval_status;
  if (approval === "pending" || approval === "rejected") {
    if (pathname !== "/register/pending") {
      return { kind: "redirect", path: "/register/pending" };
    }
  }

  const membership = member.membership;

  const communityPaidUntilMs = parseDateMs(membership?.community_paid_until);
  const academyUntilMs = parseDateMs(membership?.academy_paid_until);
  const clubUntilMs = parseDateMs(membership?.club_paid_until);

  const communityActive =
    communityPaidUntilMs !== null && communityPaidUntilMs > now;
  const clubPaid = clubUntilMs !== null && clubUntilMs > now;
  const academyPaid = academyUntilMs !== null && academyUntilMs > now;

  // 3. Community activation paywall. /account (and /account/profile) is
  // always reachable so members can pay; everything else is blocked
  // until *some* tier is paid. Active Club/Academy supersedes Community.
  const paywallAllowed =
    pathname.startsWith("/account") || pathname.startsWith("/account/profile");

  if (!communityActive && !clubPaid && !academyPaid && !paywallAllowed) {
    return {
      kind: "redirect",
      path: "/account/billing",
      search: { required: "community" },
    };
  }

  // 4. Tier-based route gate.
  const protectedRoute = Object.keys(TIER_ROUTES).find((route) =>
    pathname.startsWith(route),
  );

  if (protectedRoute) {
    const approvedTiers: string[] =
      membership?.active_tiers && membership.active_tiers.length > 0
        ? membership.active_tiers.map((t) => String(t).toLowerCase())
        : membership?.primary_tier
          ? [String(membership.primary_tier).toLowerCase()]
          : ["community"];

    const academyApproved = approvedTiers.includes("academy");
    const clubApproved = approvedTiers.includes("club");

    const academyActive =
      academyApproved && (academyUntilMs === null || academyUntilMs > now);
    const clubActive =
      clubApproved && clubUntilMs !== null && clubUntilMs > now;

    const effectiveTier: MembershipTier = academyActive
      ? "academy"
      : clubActive
        ? "club"
        : "community";
    const allowedTiers = TIER_ROUTES[protectedRoute];

    if (!allowedTiers.includes(effectiveTier)) {
      const requestedTiers: string[] = membership?.requested_tiers || [];
      // The cheapest tier that grants access — the LOWEST-privilege
      // entry in allowedTiers, not the highest. Only /club
      // (["club","academy"] → "club") and /academy (["academy"] →
      // "academy") reach this block; /community and /sessions always
      // include "community" in allowedTiers and community is the
      // effective-tier floor, so they never get here.
      //
      // (The pre-F4 code computed `includes("academy") ? "academy" :
      // "club"`, which was always "academy" and made the
      // approved-but-unpaid → billing branch dead. Fixed deliberately
      // here so an approved-but-lapsed member is sent to billing to
      // reactivate, not back through the upgrade-request flow.)
      const requiredTier: MembershipTier = allowedTiers.includes("club")
        ? "club"
        : "academy";

      if (requestedTiers.includes(requiredTier)) {
        return {
          kind: "redirect",
          path: "/account/profile",
          search: { upgrade: "pending" },
        };
      }

      // Approved for the required tier but not currently active
      // (lapsed payment) → send to billing to reactivate rather than
      // the re-registration / upgrade-request flow.
      if (
        requiredTier === "club" &&
        approvedTiers.includes("club") &&
        !clubActive
      ) {
        return {
          kind: "redirect",
          path: "/account/billing",
          search: { required: "club" },
        };
      }
      if (
        requiredTier === "academy" &&
        approvedTiers.includes("academy") &&
        !academyActive
      ) {
        return {
          kind: "redirect",
          path: "/account/billing",
          search: { required: "academy" },
        };
      }

      return {
        kind: "redirect",
        path: "/register",
        search: { upgrade: "true" },
      };
    }
  }

  // 5. No gate tripped.
  return ALLOW;
}
