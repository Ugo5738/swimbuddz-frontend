/**
 * Centralized tier calculation utilities for SwimBuddz.
 * 
 * All functions expect the nested member structure from the API:
 * ```
 * member.membership.active_tiers
 * member.membership.primary_tier
 * member.membership.requested_tiers
 * ```
 */

/** Valid membership tiers */
export type MembershipTier = 'community' | 'club' | 'academy';

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
    } | null;
}

/**
 * Get the member's active (approved) tiers as a lowercase array.
 * Returns ["community"] if no tiers found.
 */
export function getMemberTiers(member: MemberWithMembership | null | undefined): string[] {
    if (!member?.membership) return ['community'];

    const tiers = member.membership.active_tiers;
    if (tiers && tiers.length > 0) {
        return tiers.map(t => String(t).toLowerCase());
    }

    // Fall back to primary_tier if no active_tiers
    const primary = member.membership.primary_tier;
    if (primary) {
        return [String(primary).toLowerCase()];
    }

    return ['community'];
}

/**
 * Get the member's primary (highest priority) tier.
 */
export function getMemberPrimaryTier(member: MemberWithMembership | null | undefined): string {
    if (!member?.membership) return 'community';

    // Use explicit primary_tier if set
    const primary = member.membership.primary_tier;
    if (primary) {
        return String(primary).toLowerCase();
    }

    // Otherwise, find highest priority from active_tiers
    const tiers = getMemberTiers(member);
    return sortTiersByPriority(tiers)[0] || 'community';
}

/**
 * Get tiers the member has requested but not yet been approved for.
 */
export function getRequestedTiers(member: MemberWithMembership | null | undefined): string[] {
    if (!member?.membership?.requested_tiers) return [];
    return member.membership.requested_tiers.map(t => String(t).toLowerCase());
}

/**
 * Check if member is approved for a specific tier.
 */
export function hasTier(member: MemberWithMembership | null | undefined, tier: MembershipTier): boolean {
    return getMemberTiers(member).includes(tier);
}

/**
 * Check if member has requested (but not been approved for) a specific tier.
 */
export function hasRequestedTier(member: MemberWithMembership | null | undefined, tier: MembershipTier): boolean {
    return getRequestedTiers(member).includes(tier);
}

/**
 * Check if a tier's payment is active (not expired).
 * Returns false if never paid or payment expired.
 */
export function isTierPaid(member: MemberWithMembership | null | undefined, tier: MembershipTier): boolean {
    if (!member?.membership) return false;

    const now = new Date();

    switch (tier) {
        case 'community': {
            const until = member.membership.community_paid_until;
            return until ? new Date(until) > now : false;
        }
        case 'club': {
            const until = member.membership.club_paid_until;
            return until ? new Date(until) > now : false;
        }
        case 'academy': {
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
export function isTierActive(member: MemberWithMembership | null | undefined, tier: MembershipTier): boolean {
    return hasTier(member, tier) && isTierPaid(member, tier);
}

/**
 * Get the member's effective tier (highest approved + paid tier).
 */
export function getEffectiveTier(member: MemberWithMembership | null | undefined): MembershipTier {
    if (isTierActive(member, 'academy')) return 'academy';
    if (isTierActive(member, 'club')) return 'club';
    if (isTierActive(member, 'community')) return 'community';

    // If nothing is paid, still return their approved tier
    const primary = getMemberPrimaryTier(member);
    return (primary as MembershipTier) || 'community';
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
    return [...tiers].sort((a, b) =>
        (TIER_PRIORITY[b.toLowerCase()] || 0) - (TIER_PRIORITY[a.toLowerCase()] || 0)
    );
}

/**
 * Get a member status label for display.
 * Examples: "Academy Member", "Club (Pending)", "Community Member"
 */
export function getMembershipLabel(member: MemberWithMembership | null | undefined): string {
    const requested = getRequestedTiers(member);

    if (requested.includes('academy') && !isTierActive(member, 'academy')) {
        return 'Academy (Pending)';
    }
    if (requested.includes('club') && !isTierActive(member, 'club')) {
        return 'Club (Pending)';
    }

    const effective = getEffectiveTier(member);
    return `${getTierDisplayName(effective)} Member`;
}
