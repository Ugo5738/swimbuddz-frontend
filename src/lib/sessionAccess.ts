import type { MembershipTier } from "@/lib/tiers";

export type SessionAccessTier = MembershipTier;

const TIER_RANK: Record<SessionAccessTier, number> = {
  community: 1,
  club: 2,
  academy: 3,
};

/**
 * Map a session_type to the minimum membership tier required to book.
 * Defaults to community for unknown/new types to avoid accidental lockouts.
 */
export function requiredTierForSessionType(
  sessionType?: string | null,
): SessionAccessTier {
  const normalized = String(sessionType || "").toLowerCase();

  if (
    normalized === "academy" ||
    normalized === "cohort_class" ||
    normalized === "one_on_one" ||
    normalized === "group_booking"
  ) {
    return "academy";
  }

  if (normalized === "club") {
    return "club";
  }

  return "community";
}

export function hasTierAccess(
  memberTier: SessionAccessTier,
  requiredTier: SessionAccessTier,
): boolean {
  return TIER_RANK[memberTier] >= TIER_RANK[requiredTier];
}

export function tierDisplayLabel(tier: SessionAccessTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

