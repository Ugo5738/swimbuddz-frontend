/**
 * Centralized tier calculation utilities for SwimBuddz.
 *
 * All functions expect the nested member structure from the API:
 * ```
 * member.membership.display_label
 * member.membership.paid_tier
 * member.membership.tier_statuses
 * ```
 */

/** Valid membership tiers */
export type MembershipTier = "community" | "club" | "academy";
export type DisplayMembershipTier = MembershipTier | "prospect";
export type MembershipTierStatusValue =
  | "active"
  | "payment_pending"
  | "requested"
  | "approved_unpaid"
  | "expired"
  | "inactive";

export type MembershipTierStatus = {
  tier: MembershipTier;
  status: MembershipTierStatusValue;
  label: string;
  paid_until?: string | null;
  requested?: boolean;
  declared_active?: boolean;
  direct_paid?: boolean;
  inherited?: boolean;
  inherited_from?: MembershipTier | null;
};

// Tier priority for sorting (higher = more privileged)
const TIER_PRIORITY: Record<string, number> = {
  academy: 3,
  club: 2,
  community: 1,
};

/** Member shape expected by tier utilities */
interface MemberWithMembership {
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    pending_payment_reference?: string | null;
    paid_tier?: string | null;
    paid_tiers?: string[] | null;
    display_label?: string | null;
    payment_pending?: boolean | null;
    tier_statuses?: Partial<Record<MembershipTier, MembershipTierStatus>> | null;
  } | null;
}

const MEMBERSHIP_TIERS: MembershipTier[] = ["community", "club", "academy"];

function normalizeTier(value: string | null | undefined): MembershipTier | null {
  const normalized = String(value || "").toLowerCase();
  return MEMBERSHIP_TIERS.includes(normalized as MembershipTier)
    ? (normalized as MembershipTier)
    : null;
}

function normalizeDisplayTier(value: string | null | undefined): DisplayMembershipTier | null {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "prospect") return "prospect";
  return normalizeTier(normalized);
}

/**
 * Get the member's active (approved) tiers as a lowercase array.
 * Returns ["community"] if no tiers found.
 */
export function getMemberTiers(member: MemberWithMembership | null | undefined): string[] {
  if (!member?.membership) return ["community"];

  const tiers = member.membership.active_tiers;
  if (tiers && tiers.length > 0) {
    return tiers.map((t) => String(t).toLowerCase());
  }

  // Fall back to primary_tier if no active_tiers
  const primary = member.membership.primary_tier;
  if (primary) {
    return [String(primary).toLowerCase()];
  }

  return ["community"];
}

/**
 * Get the member's primary (highest priority) tier.
 */
export function getMemberPrimaryTier(member: MemberWithMembership | null | undefined): string {
  if (!member?.membership) return "community";

  // Use explicit primary_tier if set
  const primary = member.membership.primary_tier;
  if (primary) {
    return String(primary).toLowerCase();
  }

  // Otherwise, find highest priority from active_tiers
  const tiers = getMemberTiers(member);
  return sortTiersByPriority(tiers)[0] || "community";
}

/**
 * Get tiers the member has requested but not yet been approved for.
 */
export function getRequestedTiers(member: MemberWithMembership | null | undefined): string[] {
  const statuses = member?.membership?.tier_statuses;
  if (statuses) {
    return MEMBERSHIP_TIERS.filter((tier) => {
      const status = statuses[tier]?.status;
      return status === "requested" || status === "payment_pending";
    });
  }

  if (!member?.membership?.requested_tiers) return [];
  return member.membership.requested_tiers.map((t) => String(t).toLowerCase());
}

export function getTierStatus(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): MembershipTierStatus | null {
  return member?.membership?.tier_statuses?.[tier] ?? null;
}

/**
 * Check if member is approved for a specific tier.
 */
export function hasTier(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  return getMemberTiers(member).includes(tier);
}

/**
 * Check if member has requested (but not been approved for) a specific tier.
 */
export function hasRequestedTier(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  return getRequestedTiers(member).includes(tier);
}

/**
 * Check if a tier's payment is active (not expired).
 * Returns false if never paid or payment expired.
 */
export function isTierPaid(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  const status = getTierStatus(member, tier);
  if (status) return status.status === "active";

  if (!member?.membership) return false;

  const now = new Date();

  switch (tier) {
    case "community": {
      const until = member.membership.community_paid_until;
      return until ? new Date(until) > now : false;
    }
    case "club": {
      const until = member.membership.club_paid_until;
      return until ? new Date(until) > now : false;
    }
    case "academy": {
      const until = member.membership.academy_paid_until;
      return until ? new Date(until) > now : false;
    }
    default:
      return false;
  }
}

/**
 * Check if member has a tier AND it's currently paid.
 */
export function isTierActive(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  const status = getTierStatus(member, tier);
  if (status) return status.status === "active";

  return hasTier(member, tier) && isTierPaid(member, tier);
}

export function hasTierContext(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  const status = getTierStatus(member, tier)?.status;
  if (status) {
    return ["active", "payment_pending", "requested", "approved_unpaid"].includes(status);
  }

  return hasTier(member, tier) || hasRequestedTier(member, tier);
}

/**
 * Get the highest currently paid entitlement.
 *
 * This is the value member-facing access surfaces should use. Declared
 * active_tiers/requested_tiers describe lifecycle/admin state; *_paid_until
 * determines whether session access is actually active.
 */
export function getPaidMembershipTier(
  member: MemberWithMembership | null | undefined
): DisplayMembershipTier {
  const backendTier = normalizeDisplayTier(member?.membership?.paid_tier);
  if (backendTier) return backendTier;

  if (isTierPaid(member, "academy")) return "academy";
  if (isTierPaid(member, "club")) return "club";
  if (isTierPaid(member, "community")) return "community";
  return "prospect";
}

export function getPaidMembershipTiers(
  member: MemberWithMembership | null | undefined
): MembershipTier[] {
  const backendTiers = member?.membership?.paid_tiers
    ?.map((tier) => normalizeTier(tier))
    .filter((tier): tier is MembershipTier => Boolean(tier));

  if (backendTiers && backendTiers.length > 0) {
    return sortTiersByPriority(backendTiers) as MembershipTier[];
  }

  const paidTier = getPaidMembershipTier(member);
  if (paidTier === "academy") return ["academy", "club", "community"];
  if (paidTier === "club") return ["club", "community"];
  if (paidTier === "community") return ["community"];
  return [];
}

/**
 * Get the member's effective tier (highest approved + paid tier).
 */
export function getEffectiveTier(member: MemberWithMembership | null | undefined): MembershipTier {
  if (isTierActive(member, "academy")) return "academy";
  if (isTierActive(member, "club")) return "club";
  if (isTierActive(member, "community")) return "community";

  // If nothing is paid, still return their approved tier
  const primary = getMemberPrimaryTier(member);
  return (primary as MembershipTier) || "community";
}

/**
 * Get display-friendly tier name (capitalized).
 */
export function getTierDisplayName(tier: string): string {
  const normalized = tier.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Sort tiers by priority (highest first: academy > club > community).
 */
export function sortTiersByPriority(tiers: string[]): string[] {
  return [...tiers].sort(
    (a, b) => (TIER_PRIORITY[b.toLowerCase()] || 0) - (TIER_PRIORITY[a.toLowerCase()] || 0)
  );
}

/**
 * Get a member status label for display.
 * Examples: "Academy Member", "Club (Pending)", "Community Member"
 */
export function getMembershipLabel(member: MemberWithMembership | null | undefined): string {
  const backendLabel = member?.membership?.display_label;
  if (backendLabel && backendLabel.trim()) return backendLabel;

  const requested = getRequestedTiers(member);
  const paidTier = getPaidMembershipTier(member);

  if (requested.includes("academy") && paidTier !== "academy") {
    return "Academy (Pending)";
  }
  if (requested.includes("club") && !["club", "academy"].includes(paidTier)) {
    return "Club (Pending)";
  }

  if (paidTier === "prospect") return "Prospect";
  return `${getTierDisplayName(paidTier)} Member`;
}
