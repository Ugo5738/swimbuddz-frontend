/**
 * Coach API client and types for the coach application, onboarding, and management.
 *
 * Types are generated from backend OpenAPI schema.
 * Run `npm run generate:types` to update types after backend changes.
 */

import { apiGet, apiPatch, apiPost } from "./api";
import type { components } from "./api-types";

// === Generated Types (re-exported from api-types.ts) ===

export type CoachProfileResponse = components["schemas"]["CoachProfileResponse"];
export type CoachApplicationCreate = components["schemas"]["CoachApplicationCreate"];
export type CoachApplicationResponse = components["schemas"]["CoachApplicationResponse"];
export type CoachApplicationStatusResponse = components["schemas"]["CoachApplicationStatusResponse"];
export type CoachOnboardingUpdate = components["schemas"]["CoachOnboardingUpdate"];
export type CoachProfileUpdate = components["schemas"]["CoachProfileUpdate"];
export type AdminCoachApplicationListItem = components["schemas"]["AdminCoachApplicationListItem"];
export type AdminCoachApplicationDetail = components["schemas"]["AdminCoachApplicationDetail"];

// Type alias for backwards compatibility (wrapped with Partial for partial initialization)
export type CoachApplicationData = Partial<CoachApplicationCreate> & {
    short_bio: string;
    coaching_years: number;
};
export type CoachOnboardingData = Partial<CoachOnboardingUpdate>;

// CoachStatus type (string union for status field values)
export type CoachStatus =
    | "draft"
    | "pending_review"
    | "more_info_needed"
    | "approved"
    | "rejected"
    | "active"
    | "inactive"
    | "suspended";

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

export function getStatusLabel(status: string): string {
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
    return labels[status as CoachStatus | "none"] || status;
}

export function getStatusColor(status: string): string {
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
    return colors[status as CoachStatus | "none"] || "text-slate-500";
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
