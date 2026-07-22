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
 * IMPORTANT: this is the member route-access boundary. It trusts the
 * backend-normalized membership summary (`paid_tier` / `tier_statuses`). A
 * missing or malformed summary fails closed.
 */

import type { DisplayMembershipTier, MembershipTier, MembershipTierStatusValue } from "@/lib/tiers";

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
    // Present in the response for operational surfaces; route access does not
    // infer entitlement from these raw lifecycle and billing fields.
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    declared_tiers?: string[] | null;
    effective_paid_tiers?: string[] | null;
    highest_paid_tier?: string | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    paid_tier?: string | null;
    paid_tiers?: string[] | null;
    payment_pending?: boolean | null;
    tier_statuses?: Partial<
      Record<
        MembershipTier,
        {
          status?: string | null;
        }
      >
    > | null;
  } | null;
}

export interface AccessInput {
  pathname: string;
  /** Path + query string to return to after the member restores access. */
  requestedPath?: string;
  /** Already-resolved from the signed JWT's app_metadata.roles. */
  isJwtAdmin: boolean;
  member: MiddlewareMember;
}

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; path: string; search?: Record<string, string> };

const ALLOW: AccessDecision = { kind: "allow" };

const MEMBER_ROUTE_PREFIXES = [
  "/sessions",
  "/account",
  "/attendance",
  "/community",
  "/club",
  "/academy",
  "/upgrade",
];

const PUBLIC_MEMBER_ROUTES = new Set([
  "/community",
  "/community/leaderboard",
  "/club",
  "/academy",
  "/academy/programs",
]);

const PUBLIC_MEMBER_ROUTE_PREFIXES = ["/academy/programs"];

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function requiresMemberAccess(pathname: string): boolean {
  if (PUBLIC_MEMBER_ROUTES.has(pathname)) return false;
  if (PUBLIC_MEMBER_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return false;
  }
  return MEMBER_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

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
  "/account/pods": ["club", "academy"],
  "/account/pod-lead": ["club", "academy"],
  // Personal quarterly reports measure all active members, including low or
  // zero participation. Pod-specific reporting has its own stricter checks.
  "/account/reports": ["community", "club", "academy"],
};

const MEMBERSHIP_TIERS: MembershipTier[] = ["community", "club", "academy"];
const STATUS_VALUES: MembershipTierStatusValue[] = [
  "active",
  "payment_pending",
  "requested",
  "approved_unpaid",
  "expired",
  "inactive",
];

function normalizeTier(value: unknown): MembershipTier | null {
  const tier = String(value || "").toLowerCase();
  return MEMBERSHIP_TIERS.includes(tier as MembershipTier) ? (tier as MembershipTier) : null;
}

function normalizeDisplayTier(value: unknown): DisplayMembershipTier | null {
  const tier = String(value || "").toLowerCase();
  if (tier === "prospect") return "prospect";
  return normalizeTier(tier);
}

function normalizeStatus(value: unknown): MembershipTierStatusValue | null {
  const status = String(value || "").toLowerCase();
  return STATUS_VALUES.includes(status as MembershipTierStatusValue)
    ? (status as MembershipTierStatusValue)
    : null;
}

function getTierStatus(
  membership: MiddlewareMember["membership"],
  tier: MembershipTier
): MembershipTierStatusValue | null {
  return normalizeStatus(membership?.tier_statuses?.[tier]?.status);
}

function getRequestedTiers(membership: MiddlewareMember["membership"]): MembershipTier[] {
  return MEMBERSHIP_TIERS.filter((tier) => {
    const status = getTierStatus(membership, tier);
    return status === "requested" || status === "payment_pending";
  });
}

function tierIsActive(membership: MiddlewareMember["membership"], tier: MembershipTier): boolean {
  return getTierStatus(membership, tier) === "active";
}

function getPaidTier(membership: MiddlewareMember["membership"]): DisplayMembershipTier {
  const backendPaidTier = normalizeDisplayTier(
    membership?.highest_paid_tier || membership?.paid_tier
  );
  if (backendPaidTier) return backendPaidTier;

  if (tierIsActive(membership, "academy")) return "academy";
  if (tierIsActive(membership, "club")) return "club";
  if (tierIsActive(membership, "community")) return "community";
  return "prospect";
}

function hasPaidEntitlement(membership: MiddlewareMember["membership"]): boolean {
  return getPaidTier(membership) !== "prospect";
}

function routeGateRedirectForRequiredTier(
  membership: MiddlewareMember["membership"],
  requiredTier: MembershipTier,
  returnTo: string
): AccessDecision {
  const status = getTierStatus(membership, requiredTier);
  return {
    kind: "redirect",
    path: "/account/access",
    search: {
      required: requiredTier,
      status:
        status ?? (getRequestedTiers(membership).includes(requiredTier) ? "requested" : "inactive"),
      returnTo,
    },
  };
}

/**
 * Decide whether a member may proceed to `pathname`, or where to
 * redirect them. Pure — same inputs always yield the same decision.
 *
 * Branch order:
 *   1. legacy top-level admin (`role==="admin"` / `is_admin`) → allow
 *   2. approval pending/rejected → /register/pending
 *   3. community activation paywall → contextual access explanation
 *   4. tier-route gate → contextual access explanation
 *   5. otherwise → allow
 */
export function evaluateMemberAccess(input: AccessInput): AccessDecision {
  const { pathname, member } = input;
  const returnTo = input.requestedPath || pathname;

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
  const paidTier = getPaidTier(membership);

  // 3. Community activation paywall. Account recovery/payment surfaces are
  // always reachable; feature/history routes require an effective paid tier.
  const paywallAllowedPrefixes = [
    "/account/profile",
    "/account/billing",
    "/account/onboarding",
    "/account/access",
  ];
  const paywallAllowed =
    pathname === "/account" ||
    paywallAllowedPrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix));

  if (!hasPaidEntitlement(membership) && !paywallAllowed) {
    return {
      kind: "redirect",
      path: "/account/access",
      search: {
        required: "community",
        status: getTierStatus(membership, "community") ?? "inactive",
        returnTo,
      },
    };
  }

  // 4. Tier-based route gate.
  const protectedRoute = Object.keys(TIER_ROUTES).find((route) =>
    pathMatchesPrefix(pathname, route)
  );

  if (protectedRoute) {
    const allowedTiers = TIER_ROUTES[protectedRoute];
    const effectiveTier = paidTier === "prospect" ? "community" : paidTier;

    if (!allowedTiers.includes(effectiveTier)) {
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
      const requiredTier: MembershipTier = allowedTiers.includes("club") ? "club" : "academy";

      return routeGateRedirectForRequiredTier(membership, requiredTier, returnTo);
    }
  }

  // 5. No gate tripped.
  return ALLOW;
}
