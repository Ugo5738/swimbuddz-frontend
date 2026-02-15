/**
 * Tests for registration utility functions.
 *
 * Covers:
 * - createPendingRegistration: POST to pending-registrations API
 * - completePendingRegistrationOnBackend: idempotent completion with race-condition handling
 * - getPostAuthRedirectPath: complex branching for post-login routing
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — set up before imports
// ---------------------------------------------------------------------------

vi.mock('../auth', () => ({
    getCurrentAccessToken: vi.fn(),
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
    },
}));

vi.mock('../api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
}));

import { apiGet, apiPost } from '../api';
import { getCurrentAccessToken } from '../auth';
import {
    completePendingRegistrationOnBackend,
    createPendingRegistration,
    getPostAuthRedirectPath,
} from '../registration';

const mockedGetToken = vi.mocked(getCurrentAccessToken);
const mockedApiGet = vi.mocked(apiGet);
const mockedApiPost = vi.mocked(apiPost);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    mockedGetToken.mockResolvedValue('test-token');
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// createPendingRegistration
// ---------------------------------------------------------------------------

describe('createPendingRegistration', () => {
    it('calls apiPost with the correct endpoint and payload', async () => {
        mockedApiPost.mockResolvedValue(undefined);

        const payload = {
            email: 'test@test.com',
            first_name: 'Test',
            last_name: 'User',
            password: 'password123',
        };

        await createPendingRegistration(payload);

        expect(mockedApiPost).toHaveBeenCalledWith(
            '/api/v1/pending-registrations/',
            payload,
        );
    });
});

// ---------------------------------------------------------------------------
// completePendingRegistrationOnBackend
// ---------------------------------------------------------------------------

describe('completePendingRegistrationOnBackend', () => {
    it('returns { status: "none" } when no access token', async () => {
        mockedGetToken.mockResolvedValue(null);

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({ status: 'none' });
    });

    it('returns { status: "completed" } on success', async () => {
        mockedApiPost.mockResolvedValue(undefined);

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({ status: 'completed' });
        expect(mockedApiPost).toHaveBeenCalledWith(
            '/api/v1/pending-registrations/complete',
            undefined,
            { auth: true },
        );
    });

    it('treats "already exists" error as completed (idempotent)', async () => {
        mockedApiPost.mockRejectedValue(new Error('Member already exists'));

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({ status: 'completed' });
    });

    it('treats "Pending registration not found" as completed (race condition)', async () => {
        mockedApiPost.mockRejectedValue(new Error('Pending registration not found'));

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({ status: 'completed' });
    });

    it('returns error for unexpected failures', async () => {
        mockedApiPost.mockRejectedValue(new Error('Database connection failed'));

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({
            status: 'error',
            message: 'Database connection failed',
        });
    });

    it('returns error with default message for non-Error throws', async () => {
        mockedApiPost.mockRejectedValue('something weird');

        const result = await completePendingRegistrationOnBackend();
        expect(result).toEqual({
            status: 'error',
            message: 'Unable to finish registration.',
        });
    });
});

// ---------------------------------------------------------------------------
// getPostAuthRedirectPath
// ---------------------------------------------------------------------------

describe('getPostAuthRedirectPath', () => {
    // Helper to build a member object with sensible defaults
    function buildMember(overrides: Record<string, any> = {}) {
        return {
            roles: ['member'],
            profile_photo_media_id: 'photo-123',
            first_name: 'Test',
            last_name: 'User',
            profile: {
                gender: 'male',
                date_of_birth: '1990-01-01',
                phone: '+234123456789',
                country: 'Nigeria',
                city: 'Lagos',
                time_zone: 'Africa/Lagos',
                swim_level: 'beginner',
                deep_water_comfort: 'comfortable',
                personal_goals: 'Learn to swim',
            },
            emergency_contact: {
                name: 'Jane Doe',
                contact_relationship: 'spouse',
                phone: '+234987654321',
            },
            availability: {
                preferred_locations: ['Sunfit Pool'],
                preferred_times: ['morning'],
                available_days: ['monday', 'wednesday'],
            },
            membership: {
                primary_tier: 'community',
                active_tiers: ['community'],
                requested_tiers: [],
                community_paid_until: '2025-12-31',
                club_paid_until: null,
                academy_paid_until: null,
            },
            coach_profile: null,
            ...overrides,
        };
    }

    // --- Coach routing ---

    it('redirects approved coach to /coach/onboarding', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                roles: ['coach', 'member'],
                coach_profile: { status: 'approved' },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/coach/onboarding');
    });

    it('redirects active coach to /coach/dashboard', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                roles: ['coach', 'member'],
                coach_profile: { status: 'active' },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/coach/dashboard');
    });

    it('redirects draft coach to /coach/apply', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                roles: ['coach', 'member'],
                coach_profile: { status: 'draft' },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/coach/apply');
    });

    it('redirects coach with no profile status to /coach/apply', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                roles: ['coach', 'member'],
                coach_profile: { status: null },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/coach/apply');
    });

    it('redirects pending_review coach to /coach/apply', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                roles: ['coach', 'member'],
                coach_profile: { status: 'pending_review' },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/coach/apply');
    });

    // --- Onboarding incomplete ---

    it('redirects to /account/onboarding when profile photo missing', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({ profile_photo_media_id: null }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/onboarding');
    });

    it('redirects to /account/onboarding when emergency contact missing', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({ emergency_contact: null }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/onboarding');
    });

    it('redirects to /account/onboarding when swim background missing', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                profile: {
                    gender: 'male',
                    date_of_birth: '1990-01-01',
                    phone: '+234123456789',
                    country: 'Nigeria',
                    city: 'Lagos',
                    time_zone: 'Africa/Lagos',
                    swim_level: null,
                    deep_water_comfort: null,
                    personal_goals: null,
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/onboarding');
    });

    // --- Payment routing ---

    it('redirects to billing when community not paid', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                membership: {
                    primary_tier: 'community',
                    active_tiers: ['community'],
                    requested_tiers: [],
                    community_paid_until: null,
                    club_paid_until: null,
                    academy_paid_until: null,
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/billing?required=community');
    });

    it('redirects to billing when community expired', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                membership: {
                    primary_tier: 'community',
                    active_tiers: ['community'],
                    requested_tiers: [],
                    community_paid_until: '2025-01-01', // expired
                    club_paid_until: null,
                    academy_paid_until: null,
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/billing?required=community');
    });

    it('redirects to billing for club when club requested but not paid', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                membership: {
                    primary_tier: 'community',
                    active_tiers: ['community'],
                    requested_tiers: ['club'],
                    community_paid_until: '2025-12-31',
                    club_paid_until: null,
                    academy_paid_until: null,
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/billing?required=club');
    });

    // --- Success paths ---

    it('redirects to /account for fully onboarded community member', async () => {
        mockedApiGet.mockResolvedValue(buildMember());

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account');
    });

    it('redirects to /account/academy when academy is active', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                membership: {
                    primary_tier: 'academy',
                    active_tiers: ['academy', 'community'],
                    requested_tiers: [],
                    community_paid_until: '2025-12-31',
                    club_paid_until: null,
                    academy_paid_until: '2025-12-31',
                    academy_skill_assessment: { canFloat: true },
                    academy_goals: 'Learn freestyle',
                    academy_preferred_coach_gender: 'any',
                    academy_lesson_preference: 'group',
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/academy');
    });

    // --- Error fallback ---

    it('returns /account when API call fails', async () => {
        mockedApiGet.mockRejectedValue(new Error('Network error'));

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account');
    });

    // --- Academy onboarding ---

    it('redirects to onboarding when academy requested but assessment missing', async () => {
        mockedApiGet.mockResolvedValue(
            buildMember({
                membership: {
                    primary_tier: 'community',
                    active_tiers: ['community'],
                    requested_tiers: ['academy'],
                    community_paid_until: '2025-12-31',
                    club_paid_until: null,
                    academy_paid_until: null,
                    academy_skill_assessment: null,
                    academy_goals: null,
                    academy_preferred_coach_gender: null,
                    academy_lesson_preference: null,
                },
            }),
        );

        const path = await getPostAuthRedirectPath();
        expect(path).toBe('/account/onboarding');
    });
});
