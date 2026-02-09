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
    spotlight_quote: string | null;
    is_featured: boolean;
    featured_from: string | null;
    featured_until: string | null;
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

export interface SpotlightFeaturedVolunteer {
    member_id: string;
    member_name: string;
    profile_photo_url: string | null;
    spotlight_quote: string | null;
    recognition_tier: RecognitionTier | null;
    total_hours: number;
    preferred_roles: string[] | null;
}

export interface SpotlightMilestone {
    description: string;
    count: number;
}

export interface SpotlightData {
    featured_volunteer: SpotlightFeaturedVolunteer | null;
    total_active_volunteers: number;
    total_hours_all_time: number;
    milestones_this_month: SpotlightMilestone[];
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

// ── Role Details (from VOLUNTEER_ROLES.md) ────────────────────────

export interface RoleDetails {
    timeCommitment: string;
    responsibilities: string[];
    skillsNeeded: string;
    bestFor: string;
}

export const ROLE_DETAILS: Partial<Record<VolunteerRoleCategory, RoleDetails>> = {
    session_lead: {
        timeCommitment: "90–120 min (full session + 15 min before/after)",
        responsibilities: [
            "Arrive 15 minutes before session starts",
            "Brief other volunteers on the day's plan",
            "Signal the start and end of each phase: warm-up, main swim, cool-down",
            "Make announcements to the group",
            "Handle any on-the-ground issues",
            "Ensure all swimmers have exited before leaving",
        ],
        skillsNeeded: "Comfortable speaking to groups. Calm under mild pressure. No swimming expertise required.",
        bestFor: "People who like organising, keeping things on track, and being the go-to person.",
    },
    warmup_lead: {
        timeCommitment: "~45 min (10 min setup + 30 min warm-up + 5 min wrap-up)",
        responsibilities: [
            "Prepare a 15–30 minute warm-up routine",
            "Lead stretches, mobility drills, and light cardio",
            "Demonstrate each exercise clearly",
            "Adapt for different fitness levels",
            "Focus on injury prevention: shoulders, neck, ankles, core",
        ],
        skillsNeeded: "Basic fitness knowledge. Enthusiasm. No certification needed.",
        bestFor: "Fitness enthusiasts, gym-goers, anyone who enjoys leading group exercise.",
    },
    lane_marshal: {
        timeCommitment: "~40–50 min (main swim portion)",
        responsibilities: [
            "Assign swimmers to lanes based on speed and ability",
            "Help first-timers understand circle swimming",
            "Rebalance lanes if one gets overcrowded",
            "Gently enforce lane etiquette",
            "Watch for swimmers in the wrong lane and help them move",
        ],
        skillsNeeded: "Basic swimming knowledge. Tactful communication.",
        bestFor: "Experienced swimmers who understand pool flow and can guide others.",
    },
    checkin: {
        timeCommitment: "~30 min (15 min before + first 15 min of session)",
        responsibilities: [
            "Set up at the session entrance before start time",
            "Greet arriving members and mark attendance on the app",
            "Confirm walk-ins vs. pre-registered members",
            "Note first-timers and direct them to the Welcome Volunteer",
            "Track late arrivals and hand off count to Session Lead",
        ],
        skillsNeeded: "Comfortable using a phone/tablet. Friendly and approachable.",
        bestFor: "Organised people who like greeting others. Low physical effort.",
    },
    safety: {
        timeCommitment: "~50–60 min (full swim duration, focused attention)",
        responsibilities: [
            "Position yourself poolside with clear view of all lanes",
            "Watch for signs of exhaustion, distress, or unsafe behaviour",
            "Know the location of first-aid kit, AED, and emergency exits",
            "Alert nearest coach or lifeguard if someone is struggling",
            "Flag hazards to the Session Lead",
        ],
        skillsNeeded: "Basic first-aid knowledge preferred. Must be attentive and calm. CPR training is a plus.",
        bestFor: "Responsible, observant individuals. Healthcare workers, parents.",
    },
    welcome: {
        timeCommitment: "~30 min spread across the session",
        responsibilities: [
            "Introduce yourself to anyone attending their first session",
            "Give a quick orientation: changing rooms, belongings, session flow",
            "Introduce newcomers to 2–3 friendly regulars",
            "Answer basic questions",
            "Check in with them at the end — encourage them to come back",
        ],
        skillsNeeded: "Warmth. Friendliness. Memory for names is a huge plus.",
        bestFor: "Extroverts, natural connectors, people who remember what it felt like to be new.",
    },
    ride_share: {
        timeCommitment: "30–60 min each way (Lagos traffic considered)",
        responsibilities: [
            "Make your car available for a designated pickup zone",
            "Communicate departure time and pickup location",
            "Wait a reasonable time for passengers (5 min grace period)",
            "Drive safely to the pool venue",
            "After session, drive passengers back to pickup zone",
        ],
        skillsNeeded: "Valid driver's license. Reliable vehicle. Patience in Lagos traffic.",
        bestFor: "Car owners already driving to sessions with spare seats.",
    },
    mentor: {
        timeCommitment: "No extra time beyond attending sessions + 5–10 min WhatsApp check-ins",
        responsibilities: [
            "Be paired with a newer member for 4–8 sessions",
            "Check in before each session — are they coming? Any concerns?",
            "Swim near them so they have a familiar face",
            "Help them understand community norms",
            "Celebrate their milestones and reach out if they go quiet",
        ],
        skillsNeeded: "Empathy. Consistency. Patience with people who may be scared of water.",
        bestFor: "Regulars who remember how intimidating it was to start.",
    },
    media: {
        timeCommitment: "Throughout the session (can still swim)",
        responsibilities: [
            "Capture a mix of action shots, warm-up photos, candid moments, group shots",
            "Record 15–30 second video clips for social content",
            "Get the group photo at the end of every session",
            "Respect photo consent — skip opted-out members",
            "Share raw media with Gallery Support or upload to shared album",
        ],
        skillsNeeded: "A decent phone camera. Basic sense of composition.",
        bestFor: "Anyone already snapping pics at sessions. Instagram-savvy members.",
    },
    gallery_support: {
        timeCommitment: "30–60 min after each session (can be done from home)",
        responsibilities: [
            "Collect raw photos/videos from Media Volunteers",
            "Upload them to the SwimBuddz gallery",
            "Tag members who appear in photos",
            "Select 5–10 best-of shots per session for highlights",
            "Delete duplicates and ensure photo consent is respected",
        ],
        skillsNeeded: "Organised. Eye for selecting good photos. Can be done remotely.",
        bestFor: "Detail-oriented people. Photographers. Great if you can't always attend sessions.",
    },
    events_logistics: {
        timeCommitment: "2–4 hours per event (variable)",
        responsibilities: [
            "Help set up and tear down for special events",
            "Manage equipment: cones, lane ropes, timing equipment, speakers",
            "Coordinate timing between activities during multi-part events",
            "Handle on-the-ground logistics: venue access, parking, vendors",
            "Be the fixer — adapt when things go wrong",
        ],
        skillsNeeded: "Flexible. Problem-solver. Comfortable with physical setup work.",
        bestFor: "People who like making things happen behind the scenes.",
    },
    trip_planner: {
        timeCommitment: "5–10 hours planning per trip (over 2–4 weeks) + trip day",
        responsibilities: [
            "Research and propose trip destinations",
            "Plan logistics: transport, accommodation, costs, group size",
            "Create and share trip itineraries",
            "Manage RSVPs and collect payments",
            "Handle on-the-day logistics and safety briefings",
        ],
        skillsNeeded: "Research skills. Organisational ability. Budget management.",
        bestFor: "Natural planners. Travel enthusiasts who know great swim spots.",
    },
    academy_assistant: {
        timeCommitment: "60–90 min (full academy session) + 10 min coach debrief",
        responsibilities: [
            "Assist the lead coach during cohort sessions",
            "Help demonstrate drills and techniques",
            "Work one-on-one with students needing extra attention",
            "Assist with skill assessment sessions",
            "Help manage session resources: kickboards, pull buoys, fins",
        ],
        skillsNeeded: "Competent swimmer (Intermediate+). Patient with learners. Interest in coaching.",
        bestFor: "Strong swimmers interested in coaching. Education professionals.",
    },
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

    // Spotlight (public)
    getSpotlight: () =>
        apiGet<SpotlightData>(`${V}/spotlight`),

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

        // Spotlight management
        featureVolunteer: (memberId: string, data: { spotlight_quote?: string; featured_until?: string }) =>
            apiPost<VolunteerProfile>(`${VA}/profiles/${memberId}/feature`, data, { auth: true }),

        unfeatureVolunteer: (memberId: string) =>
            apiDelete<void>(`${VA}/profiles/${memberId}/feature`, { auth: true }),
    },
};
