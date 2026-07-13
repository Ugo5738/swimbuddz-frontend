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
 * IMPORTANT: this is the member route-access boundary. It now trusts the
 * backend-normalized membership summary (`paid_tier` / `tier_statuses`) first
 * and keeps the old raw-field checks only as compatibility fallback. Change
 * behaviour only with a matching test and a clear reason.
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
    primary_tier?: string | null;
    active_tiers?: string[] | null;
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

const MEMBERSHIP_TIERS: MembershipTier[] = ["community", "club", "academy"];
const STATUS_VALUES: MembershipTierStatusValue[] = [
  "active",
  "payment_pending",
  "requested",
  "approved_unpaid",
  "expired",
  "inactive",
];

/** Parse an ISO date-ish value to epoch ms, or null if unusable. */
export function parseDateMs(value: unknown): number | null {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

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

function hasBackendStatus(membership: MiddlewareMember["membership"]): boolean {
  return Boolean(membership?.paid_tier || membership?.tier_statuses);
}

function getDeclaredTiers(membership: MiddlewareMember["membership"]): MembershipTier[] {
  const tiers = new Set<MembershipTier>();
  for (const rawTier of membership?.active_tiers ?? []) {
    const tier = normalizeTier(rawTier);
    if (tier) tiers.add(tier);
  }
  const primary = normalizeTier(membership?.primary_tier);
  if (primary) tiers.add(primary);
  return Array.from(tiers);
}

function getRequestedTiers(membership: MiddlewareMember["membership"]): MembershipTier[] {
  if (membership?.tier_statuses) {
    return MEMBERSHIP_TIERS.filter((tier) => {
      const status = getTierStatus(membership, tier);
      return status === "requested" || status === "payment_pending";
    });
  }

  return (membership?.requested_tiers ?? [])
    .map((tier) => normalizeTier(tier))
    .filter((tier): tier is MembershipTier => Boolean(tier));
}

function legacyTierIsActive(
  membership: MiddlewareMember["membership"],
  tier: MembershipTier,
  now: number
): boolean {
  const communityUntilMs = parseDateMs(membership?.community_paid_until);
  const clubUntilMs = parseDateMs(membership?.club_paid_until);
  const academyUntilMs = parseDateMs(membership?.academy_paid_until);
  const declaredTiers = getDeclaredTiers(membership);

  const communityPaid = communityUntilMs !== null && communityUntilMs > now;
  const clubPaid = clubUntilMs !== null && clubUntilMs > now;
  const academyPaid = academyUntilMs !== null && academyUntilMs > now;
  const legacyAcademyActive =
    declaredTiers.includes("academy") && (academyUntilMs === null || academyUntilMs > now);

  if (tier === "academy") return academyPaid || legacyAcademyActive;
  if (tier === "club") return clubPaid || academyPaid || legacyAcademyActive;
  return communityPaid || clubPaid || academyPaid;
}

function tierIsActive(
  membership: MiddlewareMember["membership"],
  tier: MembershipTier,
  now: number
): boolean {
  const status = getTierStatus(membership, tier);
  if (status) return status === "active";
  return legacyTierIsActive(membership, tier, now);
}

function getPaidTier(
  membership: MiddlewareMember["membership"],
  now: number
): DisplayMembershipTier {
  const backendPaidTier = normalizeDisplayTier(membership?.paid_tier);
  if (backendPaidTier) return backendPaidTier;

  if (tierIsActive(membership, "academy", now)) return "academy";
  if (tierIsActive(membership, "club", now)) return "club";
  if (tierIsActive(membership, "community", now)) return "community";
  return "prospect";
}

function hasPaidEntitlement(membership: MiddlewareMember["membership"], now: number): boolean {
  if (hasBackendStatus(membership)) {
    return getPaidTier(membership, now) !== "prospect";
  }

  return (
    (parseDateMs(membership?.community_paid_until) ?? 0) > now ||
    (parseDateMs(membership?.club_paid_until) ?? 0) > now ||
    (parseDateMs(membership?.academy_paid_until) ?? 0) > now
  );
}

function routeGateRedirectForRequiredTier(
  membership: MiddlewareMember["membership"],
  requiredTier: MembershipTier
): AccessDecision {
  const status = getTierStatus(membership, requiredTier);
  if (status === "requested") {
    return {
      kind: "redirect",
      path: "/account/profile",
      search: { upgrade: "pending" },
    };
  }
  if (status === "payment_pending" || status === "approved_unpaid" || status === "expired") {
    return {
      kind: "redirect",
      path: "/account/billing",
      search: { required: requiredTier },
    };
  }

  if (getRequestedTiers(membership).includes(requiredTier)) {
    return {
      kind: "redirect",
      path: "/account/profile",
      search: { upgrade: "pending" },
    };
  }

  if (getDeclaredTiers(membership).includes(requiredTier)) {
    return {
      kind: "redirect",
      path: "/account/billing",
      search: { required: requiredTier },
    };
  }

  return {
    kind: "redirect",
    path: "/register",
    search: { upgrade: "true" },
  };
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
  const paidTier = getPaidTier(membership, now);

  // 3. Community activation paywall. /account (and /account/profile) is
  // always reachable so members can pay; everything else is blocked
  // until *some* tier is paid. Active Club/Academy supersedes Community.
  const paywallAllowed = pathname.startsWith("/account") || pathname.startsWith("/account/profile");

  if (!hasPaidEntitlement(membership, now) && !paywallAllowed) {
    return {
      kind: "redirect",
      path: "/account/billing",
      search: { required: "community" },
    };
  }

  // 4. Tier-based route gate.
  const protectedRoute = Object.keys(TIER_ROUTES).find((route) => pathname.startsWith(route));

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

      return routeGateRedirectForRequiredTier(membership, requiredTier);
    }
  }

  // 5. No gate tripped.
  return ALLOW;
}
