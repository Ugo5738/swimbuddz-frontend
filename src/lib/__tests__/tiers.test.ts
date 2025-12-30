import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    getMemberTiers,
    getMemberPrimaryTier,
    getRequestedTiers,
    hasTier,
    hasRequestedTier,
    isTierPaid,
    isTierActive,
    getEffectiveTier,
    getTierDisplayName,
    sortTiersByPriority,
    getMembershipLabel,
} from '../tiers';

describe('Tier Utilities', () => {
    describe('getMemberTiers', () => {
        it('returns ["community"] for null member', () => {
            expect(getMemberTiers(null)).toEqual(['community']);
        });

        it('returns ["community"] for member without membership', () => {
            expect(getMemberTiers({})).toEqual(['community']);
        });

        it('returns tiers from active_tiers', () => {
            const member = {
                membership: { active_tiers: ['Club', 'Community'] },
            };
            expect(getMemberTiers(member)).toEqual(['club', 'community']);
        });

        it('falls back to primary_tier when no active_tiers', () => {
            const member = { membership: { primary_tier: 'club' } };
            expect(getMemberTiers(member)).toEqual(['club']);
        });
    });

    describe('getMemberPrimaryTier', () => {
        it('returns "community" for null member', () => {
            expect(getMemberPrimaryTier(null)).toBe('community');
        });

        it('returns primary_tier', () => {
            const member = { membership: { primary_tier: 'Academy' } };
            expect(getMemberPrimaryTier(member)).toBe('academy');
        });

        it('returns highest priority tier from active_tiers', () => {
            const member = { membership: { active_tiers: ['community', 'club'] } };
            expect(getMemberPrimaryTier(member)).toBe('club');
        });
    });

    describe('getRequestedTiers', () => {
        it('returns empty array for null member', () => {
            expect(getRequestedTiers(null)).toEqual([]);
        });

        it('returns requested_tiers', () => {
            const member = { membership: { requested_tiers: ['Club', 'Academy'] } };
            expect(getRequestedTiers(member)).toEqual(['club', 'academy']);
        });
    });

    describe('hasTier', () => {
        it('returns true when member has tier', () => {
            const member = { membership: { active_tiers: ['club', 'community'] } };
            expect(hasTier(member, 'club')).toBe(true);
        });

        it('returns false when member lacks tier', () => {
            const member = { membership: { active_tiers: ['community'] } };
            expect(hasTier(member, 'academy')).toBe(false);
        });
    });

    describe('hasRequestedTier', () => {
        it('returns true when tier is requested', () => {
            const member = { membership: { requested_tiers: ['club'] } };
            expect(hasRequestedTier(member, 'club')).toBe(true);
        });

        it('returns false when tier is not requested', () => {
            const member = { membership: { requested_tiers: ['academy'] } };
            expect(hasRequestedTier(member, 'club')).toBe(false);
        });
    });

    describe('isTierPaid', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-06-15'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns false for null member', () => {
            expect(isTierPaid(null, 'community')).toBe(false);
        });

        it('returns true when payment is not expired', () => {
            const member = { membership: { community_paid_until: '2025-12-31' } };
            expect(isTierPaid(member, 'community')).toBe(true);
        });

        it('returns false when payment is expired', () => {
            const member = { membership: { club_paid_until: '2025-01-01' } };
            expect(isTierPaid(member, 'club')).toBe(false);
        });

        it('returns false when never paid', () => {
            const member = { membership: { academy_paid_until: null } };
            expect(isTierPaid(member, 'academy')).toBe(false);
        });
    });

    describe('isTierActive', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-06-15'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns true when approved and paid', () => {
            const member = {
                membership: {
                    active_tiers: ['club'],
                    club_paid_until: '2025-12-31',
                },
            };
            expect(isTierActive(member, 'club')).toBe(true);
        });

        it('returns false when approved but not paid', () => {
            const member = {
                membership: {
                    active_tiers: ['club'],
                    club_paid_until: '2025-01-01',
                },
            };
            expect(isTierActive(member, 'club')).toBe(false);
        });
    });

    describe('getEffectiveTier', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-06-15'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns highest paid tier', () => {
            const member = {
                membership: {
                    active_tiers: ['club', 'community'],
                    club_paid_until: '2025-12-31',
                    community_paid_until: '2025-12-31',
                },
            };
            expect(getEffectiveTier(member)).toBe('club');
        });

        it('returns approved tier if nothing is paid', () => {
            const member = {
                membership: {
                    active_tiers: ['club'],
                    club_paid_until: null,
                },
            };
            expect(getEffectiveTier(member)).toBe('club');
        });
    });

    describe('getTierDisplayName', () => {
        it('capitalizes tier name', () => {
            expect(getTierDisplayName('community')).toBe('Community');
            expect(getTierDisplayName('CLUB')).toBe('Club');
        });
    });

    describe('sortTiersByPriority', () => {
        it('sorts tiers with highest priority first', () => {
            expect(sortTiersByPriority(['community', 'academy', 'club'])).toEqual([
                'academy',
                'club',
                'community',
            ]);
        });
    });

    describe('getMembershipLabel', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-06-15'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns pending label for requested tier', () => {
            const member = {
                membership: {
                    active_tiers: ['community'],
                    requested_tiers: ['club'],
                    community_paid_until: '2025-12-31',
                },
            };
            expect(getMembershipLabel(member)).toBe('Club (Pending)');
        });

        it('returns member label for active tier', () => {
            const member = {
                membership: {
                    active_tiers: ['club'],
                    club_paid_until: '2025-12-31',
                },
            };
            expect(getMembershipLabel(member)).toBe('Club Member');
        });
    });
});
