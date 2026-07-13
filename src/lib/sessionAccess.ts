import type { DisplayMembershipTier, MembershipTier } from "@/lib/tiers";

export type SessionAccessTier = DisplayMembershipTier;

export type SessionAccessDecision = {
  required_tier: MembershipTier;
  visible: boolean;
  bookable: boolean;
  digest_eligible: boolean;
  prompt_eligible: boolean;
  sign_in_allowed: boolean;
  reason?: string | null;
  message?: string | null;
};

const TIER_RANK: Record<SessionAccessTier, number> = {
  prospect: 0,
  community: 1,
  club: 2,
  academy: 3,
};

/**
 * Map a session_type to the minimum membership tier required to book.
 * Defaults to community for unknown/new types to avoid accidental lockouts.
 */
export function requiredTierForSessionType(sessionType?: string | null): MembershipTier {
  const normalized = String(sessionType || "").toLowerCase();

  if (normalized === "academy" || normalized === "cohort_class") {
    return "academy";
  }

  if (normalized === "club") {
    return "club";
  }

  return "community";
}

export function hasTierAccess(
  memberTier: SessionAccessTier,
  requiredTier: MembershipTier
): boolean {
  return TIER_RANK[memberTier] >= TIER_RANK[requiredTier];
}

export function tierDisplayLabel(tier: SessionAccessTier): string {
  if (tier === "prospect") return "Prospect";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
