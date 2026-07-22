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
  inherited_from?: MembershipTier | "post_academy" | null;
  effective_until?: string | null;
  expiring_soon?: boolean;
  days_remaining?: number | null;
  access_source?: "direct" | MembershipTier | "post_academy" | null;
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
    declared_tiers?: string[] | null;
    effective_paid_tiers?: string[] | null;
    highest_paid_tier?: string | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    post_academy_club_until?: string | null;
    pending_payment_reference?: string | null;
    paid_tier?: string | null;
    paid_tiers?: string[] | null;
    display_label?: string | null;
    display_detail?: string | null;
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
 * Get tiers the member has requested but not yet been approved for.
 */
export function getRequestedTiers(member: MemberWithMembership | null | undefined): string[] {
  const statuses = member?.membership?.tier_statuses;
  if (!statuses) return [];
  return MEMBERSHIP_TIERS.filter((tier) => {
    const status = statuses[tier]?.status;
    return status === "requested" || status === "payment_pending";
  });
}

export function getTierStatus(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): MembershipTierStatus | null {
  return member?.membership?.tier_statuses?.[tier] ?? null;
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
  return status?.status === "active";
}

/**
 * Check if member has a tier AND it's currently paid.
 */
export function isTierActive(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  const status = getTierStatus(member, tier);
  return status?.status === "active";
}

export function hasTierContext(
  member: MemberWithMembership | null | undefined,
  tier: MembershipTier
): boolean {
  const tierStatus = getTierStatus(member, tier);
  const status = tierStatus?.status;
  return Boolean(
    (status && ["active", "payment_pending", "requested", "approved_unpaid"].includes(status)) ||
    status === "expired"
  );
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
  const backendTier = normalizeDisplayTier(
    member?.membership?.highest_paid_tier || member?.membership?.paid_tier
  );
  if (backendTier) return backendTier;

  if (getTierStatus(member, "academy")?.status === "active") return "academy";
  if (getTierStatus(member, "club")?.status === "active") return "club";
  if (getTierStatus(member, "community")?.status === "active") return "community";
  return "prospect";
}

export function getPaidMembershipTiers(
  member: MemberWithMembership | null | undefined
): MembershipTier[] {
  const backendTiers = (member?.membership?.effective_paid_tiers || member?.membership?.paid_tiers)
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
  return "Prospect";
}

/** Get backend-owned secondary membership lifecycle text, when present. */
export function getMembershipDetail(
  member: MemberWithMembership | null | undefined
): string | null {
  const backendDetail = member?.membership?.display_detail;
  return backendDetail && backendDetail.trim() ? backendDetail : null;
}
