/**
 * Coach API client and types for the coach application, onboarding, and management.
 */

import { apiGet, apiPatch, apiPost } from "./api";

// === Types ===

export interface CoachApplicationData {
    // Account info (if creating new account)
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;

    // Application fields
    display_name?: string;
    short_bio: string;
    full_bio?: string;

    coaching_years: number;
    coaching_experience_summary?: string;
    coaching_specialties: string[];
    certifications: string[];
    other_certifications_note?: string;
    coaching_document_link?: string;
    coaching_document_file_name?: string;

    // Optional professional info
    levels_taught?: string[];
    age_groups_taught?: string[];
    languages_spoken?: string[];
    coaching_portfolio_link?: string;

    // Safety/compliance
    has_cpr_training?: boolean;
    cpr_expiry_date?: string;
}

export interface CoachApplicationResponse {
    id: string;
    member_id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name?: string;

    status: CoachStatus;
    short_bio?: string;
    coaching_years: number;
    coaching_specialties: string[];
    certifications: string[];
    coaching_document_link?: string;
    coaching_document_file_name?: string;

    application_submitted_at?: string;
    application_reviewed_at?: string;
    rejection_reason?: string;

    created_at: string;
    updated_at: string;
}

export interface CoachApplicationStatusResponse {
    status: CoachStatus | "none";
    application_submitted_at?: string;
    application_reviewed_at?: string;
    rejection_reason?: string;
    can_access_dashboard: boolean;
}

export type CoachStatus =
    | "draft"
    | "pending_review"
    | "more_info_needed"
    | "approved"
    | "rejected"
    | "active"
    | "inactive"
    | "suspended";

export interface CoachOnboardingData {
    availability_calendar?: Record<string, unknown>;
    pools_supported?: string[];
    can_travel_between_pools?: boolean;
    travel_radius_km?: number;
    accepts_one_on_one?: boolean;
    accepts_group_cohorts?: boolean;
    max_swimmers_per_session?: number;
    max_cohorts_at_once?: number;
    preferred_cohort_types?: string[];
    currency?: string;
    one_to_one_rate_per_hour?: number;
    group_session_rate_per_hour?: number;
    academy_cohort_stipend?: number;
    show_in_directory?: boolean;
    coach_profile_photo_url?: string;
}

export interface CoachProfileUpdate extends Partial<CoachApplicationData>, Partial<CoachOnboardingData> {
    coach_profile_photo_url?: string;
}

// Admin types
export interface AdminCoachApplicationListItem {
    id: string;
    member_id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name?: string;
    status: CoachStatus;
    coaching_years: number;
    coaching_specialties: string[];
    certifications: string[];
    coaching_document_link?: string;
    coaching_document_file_name?: string;
    application_submitted_at?: string;
    created_at: string;
}

export interface AdminCoachApplicationDetail extends AdminCoachApplicationListItem {
    phone?: string;
    coach_profile_photo_url?: string;
    short_bio?: string;
    full_bio?: string;
    other_certifications_note?: string;
    coaching_experience_summary?: string;
    levels_taught: string[];
    age_groups_taught: string[];
    languages_spoken: string[];
    coaching_portfolio_link?: string;
    coaching_document_link?: string;
    coaching_document_file_name?: string;
    has_cpr_training: boolean;
    cpr_expiry_date?: string;
    background_check_status: string;
    background_check_document_url?: string;
    application_reviewed_at?: string;
    application_reviewed_by?: string;
    rejection_reason?: string;
    admin_notes?: string;
    updated_at: string;
}

// === API Client ===

export const CoachesApi = {
    /**
     * Submit a coach application.
     */
    apply: (data: CoachApplicationData) =>
        apiPost<CoachApplicationResponse>("/api/v1/coaches/apply", data, { auth: true }),

    /**
     * Get the current user's coach profile.
     */
    getMe: () =>
        apiGet<CoachApplicationResponse>("/api/v1/coaches/me", { auth: true }),

    /**
     * Update the current user's coach profile.
     */
    updateMe: (data: CoachProfileUpdate) =>
        apiPatch<CoachApplicationResponse>("/api/v1/coaches/me", data, { auth: true }),

    /**
     * Get just the application status (lightweight check).
     */
    getApplicationStatus: () =>
        apiGet<CoachApplicationStatusResponse>("/api/v1/coaches/application-status", { auth: true }),

    /**
     * Complete coach onboarding (for approved coaches).
     */
    completeOnboarding: (data: CoachOnboardingData) =>
        apiPost<CoachApplicationResponse>("/api/v1/coaches/me/onboarding", data, { auth: true }),

    // === Admin endpoints ===

    /**
     * List coach applications (admin only).
     */
    listApplications: (status?: string) => {
        // Backend expects application_status; keep name explicit to match API
        const params = status ? `?application_status=${status}` : "";
        return apiGet<AdminCoachApplicationListItem[]>(`/api/v1/admin/coaches/applications${params}`, { auth: true });
    },

    /**
     * Get a single coach application for review (admin only).
     */
    getApplication: (id: string) =>
        apiGet<AdminCoachApplicationDetail>(`/api/v1/admin/coaches/applications/${id}`, { auth: true }),

    /**
     * Approve a coach application (admin only).
     */
    approve: (id: string, adminNotes?: string) =>
        apiPost<{ message: string; status: string }>(
            `/api/v1/admin/coaches/applications/${id}/approve`,
            { admin_notes: adminNotes },
            { auth: true }
        ),

    /**
     * Reject a coach application (admin only).
     */
    reject: (id: string, reason: string, adminNotes?: string) =>
        apiPost<{ message: string; status: string }>(
            `/api/v1/admin/coaches/applications/${id}/reject`,
            { rejection_reason: reason, admin_notes: adminNotes },
            { auth: true }
        ),

    /**
     * Request more info from a coach applicant (admin only).
     */
    requestMoreInfo: (id: string, message: string, adminNotes?: string) =>
        apiPost<{ message: string; status: string }>(
            `/api/v1/admin/coaches/applications/${id}/request-info`,
            { message, admin_notes: adminNotes },
            { auth: true }
        ),
};

// === Helper functions ===

export function getStatusLabel(status: CoachStatus | "none"): string {
    const labels: Record<CoachStatus | "none", string> = {
        none: "Not Applied",
        draft: "Draft",
        pending_review: "Pending Review",
        more_info_needed: "More Info Needed",
        approved: "Approved",
        rejected: "Rejected",
        active: "Active",
        inactive: "Inactive",
        suspended: "Suspended",
    };
    return labels[status] || status;
}

export function getStatusColor(status: CoachStatus | "none"): string {
    const colors: Record<CoachStatus | "none", string> = {
        none: "text-slate-500",
        draft: "text-slate-500",
        pending_review: "text-amber-600",
        more_info_needed: "text-orange-600",
        approved: "text-emerald-600",
        rejected: "text-red-600",
        active: "text-emerald-600",
        inactive: "text-slate-500",
        suspended: "text-red-600",
    };
    return colors[status] || "text-slate-500";
}

// Options for coach application form
export const coachSpecialtyOptions = [
    { value: "technique", label: "Technique Improvement" },
    { value: "beginners", label: "Beginners / Learn to Swim" },
    { value: "kids", label: "Kids Coaching" },
    { value: "open_water", label: "Open Water Swimming" },
    { value: "competitive", label: "Competitive Swimming" },
    { value: "triathlon", label: "Triathlon Training" },
    { value: "fitness", label: "Fitness Swimming" },
    { value: "masters", label: "Masters Swimming" },
    { value: "stroke_correction", label: "Stroke Correction" },
    { value: "fear_overcome", label: "Fear Overcoming" },
];

export const certificationOptions = [
    { value: "cpr", label: "CPR Certified" },
    { value: "first_aid", label: "First Aid" },
    { value: "lifeguard", label: "Lifeguard Certified" },
    { value: "asca_1", label: "ASCA Level 1" },
    { value: "asca_2", label: "ASCA Level 2" },
    { value: "asca_3", label: "ASCA Level 3" },
    { value: "fina", label: "FINA Certified" },
    { value: "nsf", label: "NSF Certified" },
    { value: "usa_swimming", label: "USA Swimming" },
    { value: "swim_england", label: "Swim England" },
];

export const ageGroupOptions = [
    { value: "toddlers", label: "Toddlers (2-4)" },
    { value: "kids", label: "Kids (5-12)" },
    { value: "teens", label: "Teens (13-17)" },
    { value: "adults", label: "Adults (18+)" },
    { value: "seniors", label: "Seniors (60+)" },
];

export const levelsTaughtOptions = [
    { value: "non_swimmer", label: "Non-swimmers" },
    { value: "beginner", label: "Beginners" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "competitive", label: "Competitive" },
];
