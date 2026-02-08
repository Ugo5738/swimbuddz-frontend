/**
 * Volunteers API client and types.
 *
 * Types are defined manually until OpenAPI type generation is updated.
 * Run `npm run generate:types` after backend deployment to get generated types.
 */
import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// ── Enums ──────────────────────────────────────────────────────────

export type VolunteerRoleCategory =
    // Session roles
    | "session_lead"
    | "warmup_lead"
    | "lane_marshal"
    | "checkin"
    | "safety"
    // Community roles
    | "welcome"
    | "ride_share"
    | "mentor"
    // Content & media roles
    | "media"
    | "gallery_support"
    // Events & logistics roles
    | "events_logistics"
    | "trip_planner"
    // Academy support roles
    | "academy_assistant"
    // Catch-all
    | "other";

export type VolunteerTier = "tier_1" | "tier_2" | "tier_3";
export type OpportunityStatus = "draft" | "open" | "filled" | "in_progress" | "completed" | "cancelled";
export type OpportunityType = "open_claim" | "approval_required";
export type SlotStatus = "claimed" | "approved" | "rejected" | "cancelled" | "no_show" | "completed";
export type RecognitionTier = "bronze" | "silver" | "gold";
export type RewardType = "discounted_session" | "free_merch" | "priority_event" | "membership_discount" | "custom";

// ── Types ──────────────────────────────────────────────────────────

export interface VolunteerRole {
    id: string;
    title: string;
    description: string | null;
    category: VolunteerRoleCategory;
    required_skills: string[] | null;
    min_tier: VolunteerTier;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    active_volunteers_count: number;
}

export interface VolunteerProfile {
    id: string;
    member_id: string;
    tier: VolunteerTier;
    tier_override: VolunteerTier | null;
    total_hours: number;
    total_sessions_volunteered: number;
    total_no_shows: number;
    total_late_cancellations: number;
    reliability_score: number;
    recognition_tier: RecognitionTier | null;
    preferred_roles: string[] | null;
    available_days: string[] | null;
    notes: string | null;
    is_active: boolean;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    member_name?: string | null;
    member_email?: string | null;
}

export interface VolunteerOpportunity {
    id: string;
    title: string;
    description: string | null;
    role_id: string | null;
    date: string;
    start_time: string | null;
    end_time: string | null;
    session_id: string | null;
    event_id: string | null;
    location_name: string | null;
    slots_needed: number;
    slots_filled: number;
    opportunity_type: OpportunityType;
    status: OpportunityStatus;
    min_tier: VolunteerTier;
    cancellation_deadline_hours: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    role_title: string | null;
    role_category: string | null;
}

export interface VolunteerSlot {
    id: string;
    opportunity_id: string;
    member_id: string;
    status: SlotStatus;
    claimed_at: string;
    approved_at: string | null;
    approved_by: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    hours_logged: number | null;
    admin_notes: string | null;
    member_feedback: string | null;
    member_name?: string | null;
}

export interface VolunteerHoursLog {
    id: string;
    member_id: string;
    slot_id: string | null;
    opportunity_id: string | null;
    hours: number;
    date: string;
    role_id: string | null;
    source: string;
    logged_by: string | null;
    notes: string | null;
    created_at: string;
}

export interface HoursSummary {
    total_hours: number;
    total_sessions: number;
    hours_this_month: number;
    tier: VolunteerTier;
    recognition_tier: RecognitionTier | null;
    reliability_score: number;
    next_tier_hours_needed: number | null;
    by_role: Array<{
        role_id: string | null;
        role_name: string | null;
        hours: number;
        sessions: number;
    }>;
}

export interface VolunteerReward {
    id: string;
    member_id: string;
    reward_type: RewardType;
    title: string;
    description: string | null;
    trigger_type: string | null;
    trigger_value: string | null;
    is_redeemed: boolean;
    redeemed_at: string | null;
    expires_at: string | null;
    discount_percent: number | null;
    discount_amount_ngn: number | null;
    granted_by: string | null;
    created_at: string;
}

export interface LeaderboardEntry {
    rank: number;
    member_id: string;
    member_name: string | null;
    total_hours: number;
    total_sessions: number;
    recognition_tier: RecognitionTier | null;
}

export interface DashboardSummary {
    total_active_volunteers: number;
    total_hours_this_month: number;
    upcoming_opportunities: number;
    unfilled_slots: number;
    no_show_rate: number;
    top_volunteers: LeaderboardEntry[];
}

// ── Labels / Display Helpers ───────────────────────────────────────

export const CATEGORY_LABELS: Record<VolunteerRoleCategory, string> = {
    session_lead: "Session Lead",
    warmup_lead: "Warm-up Lead",
    lane_marshal: "Lane Marshal",
    checkin: "Check-in",
    safety: "Safety",
    welcome: "Welcome",
    ride_share: "Ride Share",
    mentor: "Mentor / Buddy",
    media: "Media",
    gallery_support: "Gallery Support",
    events_logistics: "Events & Logistics",
    trip_planner: "Trip Planner",
    academy_assistant: "Academy Assistant",
    other: "Other",
};

/** Group headings for displaying roles by section */
export const CATEGORY_GROUPS: Record<string, { label: string; categories: VolunteerRoleCategory[] }> = {
    session: { label: "Session Roles", categories: ["session_lead", "warmup_lead", "lane_marshal", "checkin", "safety"] },
    community: { label: "Community Roles", categories: ["welcome", "ride_share", "mentor"] },
    content: { label: "Content & Media", categories: ["media", "gallery_support"] },
    events: { label: "Events & Logistics", categories: ["events_logistics", "trip_planner"] },
    academy: { label: "Academy Support", categories: ["academy_assistant"] },
};

export const TIER_LABELS: Record<VolunteerTier, string> = {
    tier_1: "Tier 1 — Occasional",
    tier_2: "Tier 2 — Core",
    tier_3: "Tier 3 — Lead",
};

export const TIER_SHORT_LABELS: Record<VolunteerTier, string> = {
    tier_1: "Occasional",
    tier_2: "Core",
    tier_3: "Lead",
};

export const RECOGNITION_LABELS: Record<RecognitionTier, string> = {
    bronze: "Bronze (10+ hrs)",
    silver: "Silver (50+ hrs)",
    gold: "Gold (100+ hrs)",
};

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
    draft: "Draft",
    open: "Open",
    filled: "Filled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
};

export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
    claimed: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    no_show: "No Show",
    completed: "Completed",
};

// ── API Client ─────────────────────────────────────────────────────

const V = "/api/v1/volunteers";
const VA = "/api/v1/admin/volunteers";

export const VolunteersApi = {
    // Roles (public)
    listRoles: (activeOnly = true) =>
        apiGet<VolunteerRole[]>(`${V}/roles?active_only=${activeOnly}`),

    getRole: (id: string) =>
        apiGet<VolunteerRole>(`${V}/roles/${id}`),

    // Profile (member)
    getMyProfile: () =>
        apiGet<VolunteerProfile>(`${V}/profile/me`, { auth: true }),

    registerAsVolunteer: (data: {
        preferred_roles?: string[];
        available_days?: string[];
        notes?: string;
    }) => apiPost<VolunteerProfile>(`${V}/profile/me`, data, { auth: true }),

    updateMyProfile: (data: {
        preferred_roles?: string[];
        available_days?: string[];
        notes?: string;
    }) => apiPatch<VolunteerProfile>(`${V}/profile/me`, data, { auth: true }),

    // Opportunities (member)
    listOpportunities: (params?: {
        status?: OpportunityStatus;
        role_id?: string;
        from_date?: string;
        to_date?: string;
    }) => {
        const search = new URLSearchParams();
        if (params?.status) search.set("status", params.status);
        if (params?.role_id) search.set("role_id", params.role_id);
        if (params?.from_date) search.set("from_date", params.from_date);
        if (params?.to_date) search.set("to_date", params.to_date);
        const qs = search.toString();
        return apiGet<VolunteerOpportunity[]>(`${V}/opportunities${qs ? `?${qs}` : ""}`);
    },

    listUpcomingOpportunities: () =>
        apiGet<VolunteerOpportunity[]>(`${V}/opportunities/upcoming`),

    getOpportunity: (id: string) =>
        apiGet<VolunteerOpportunity>(`${V}/opportunities/${id}`),

    // Slot claiming
    claimSlot: (opportunityId: string) =>
        apiPost<VolunteerSlot>(`${V}/opportunities/${opportunityId}/claim`, undefined, { auth: true }),

    cancelClaim: (opportunityId: string) =>
        apiDelete<void>(`${V}/opportunities/${opportunityId}/claim`, { auth: true }),

    // Hours
    getMyHours: () =>
        apiGet<VolunteerHoursLog[]>(`${V}/hours/me`, { auth: true }),

    getMyHoursSummary: () =>
        apiGet<HoursSummary>(`${V}/hours/me/summary`, { auth: true }),

    getLeaderboard: (period: "all_time" | "this_month" = "all_time") =>
        apiGet<LeaderboardEntry[]>(`${V}/hours/leaderboard?period=${period}`),

    // Rewards
    getMyRewards: () =>
        apiGet<VolunteerReward[]>(`${V}/rewards/me`, { auth: true }),

    redeemReward: (rewardId: string) =>
        apiPost<VolunteerReward>(`${V}/rewards/${rewardId}/redeem`, undefined, { auth: true }),

    // ── Admin ──────────────────────────────────────────────────────

    admin: {
        // Roles
        createRole: (data: Partial<VolunteerRole>) =>
            apiPost<VolunteerRole>(`${VA}/roles`, data, { auth: true }),

        updateRole: (id: string, data: Partial<VolunteerRole>) =>
            apiPatch<VolunteerRole>(`${VA}/roles/${id}`, data, { auth: true }),

        deactivateRole: (id: string) =>
            apiDelete<void>(`${VA}/roles/${id}`, { auth: true }),

        // Profiles
        listProfiles: (params?: { tier?: VolunteerTier; active_only?: boolean }) => {
            const search = new URLSearchParams();
            if (params?.tier) search.set("tier", params.tier);
            if (params?.active_only !== undefined) search.set("active_only", String(params.active_only));
            const qs = search.toString();
            return apiGet<VolunteerProfile[]>(`${VA}/profiles${qs ? `?${qs}` : ""}`, { auth: true });
        },

        getProfile: (memberId: string) =>
            apiGet<VolunteerProfile>(`${VA}/profiles/${memberId}`, { auth: true }),

        updateProfile: (memberId: string, data: Partial<VolunteerProfile>) =>
            apiPatch<VolunteerProfile>(`${VA}/profiles/${memberId}`, data, { auth: true }),

        // Opportunities
        createOpportunity: (data: Partial<VolunteerOpportunity>) =>
            apiPost<VolunteerOpportunity>(`${VA}/opportunities`, data, { auth: true }),

        bulkCreateOpportunities: (opportunities: Partial<VolunteerOpportunity>[]) =>
            apiPost<VolunteerOpportunity[]>(`${VA}/opportunities/bulk`, { opportunities }, { auth: true }),

        updateOpportunity: (id: string, data: Partial<VolunteerOpportunity>) =>
            apiPatch<VolunteerOpportunity>(`${VA}/opportunities/${id}`, data, { auth: true }),

        cancelOpportunity: (id: string) =>
            apiDelete<void>(`${VA}/opportunities/${id}`, { auth: true }),

        publishOpportunity: (id: string) =>
            apiPost<VolunteerOpportunity>(`${VA}/opportunities/${id}/publish`, undefined, { auth: true }),

        // Slots
        listSlots: (opportunityId: string) =>
            apiGet<VolunteerSlot[]>(`${VA}/opportunities/${opportunityId}/slots`, { auth: true }),

        updateSlot: (slotId: string, data: { status?: SlotStatus; admin_notes?: string }) =>
            apiPatch<VolunteerSlot>(`${VA}/slots/${slotId}`, data, { auth: true }),

        checkinSlot: (slotId: string) =>
            apiPost<VolunteerSlot>(`${VA}/slots/${slotId}/checkin`, undefined, { auth: true }),

        checkoutSlot: (slotId: string, data?: { hours?: number; admin_notes?: string }) =>
            apiPost<VolunteerSlot>(`${VA}/slots/${slotId}/checkout`, data, { auth: true }),

        markNoShow: (slotId: string) =>
            apiPost<VolunteerSlot>(`${VA}/slots/${slotId}/no-show`, undefined, { auth: true }),

        bulkComplete: (slotIds: string[], hours?: number) =>
            apiPost<VolunteerSlot[]>(`${VA}/slots/bulk-complete`, { slot_ids: slotIds, hours }, { auth: true }),

        // Hours
        addManualHours: (data: {
            member_id: string;
            hours: number;
            date: string;
            role_id?: string;
            notes?: string;
        }) => apiPost<VolunteerHoursLog>(`${VA}/hours/manual`, data, { auth: true }),

        // Rewards
        grantReward: (data: Partial<VolunteerReward> & { member_id: string; reward_type: RewardType; title: string }) =>
            apiPost<VolunteerReward>(`${VA}/rewards`, data, { auth: true }),

        listAllRewards: () =>
            apiGet<VolunteerReward[]>(`${VA}/rewards/all`, { auth: true }),

        // Dashboard
        getDashboard: () =>
            apiGet<DashboardSummary>(`${VA}/dashboard`, { auth: true }),

        getReliabilityReport: () =>
            apiGet<VolunteerProfile[]>(`${VA}/reliability-report`, { auth: true }),
    },
};
