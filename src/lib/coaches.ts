/**
 * Coach API client and types for the coach application, onboarding, and management.
 *
 * Types are generated from backend OpenAPI schema.
 * Run `npm run generate:types` to update types after backend changes.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
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

    /**
     * Delete a coach application/profile (admin only).
     */
    deleteApplication: (id: string) =>
        apiDelete<{ message: string }>(`/api/v1/admin/coaches/applications/${id}`, { auth: true }),
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

// ============================================================================
// COACH AGREEMENT TYPES & API
// ============================================================================

export type SignatureType = "typed_name" | "drawn" | "checkbox" | "uploaded_image";

export interface AgreementContent {
    version: string;
    title: string;
    content: string;
    content_hash: string;
    effective_date: string;
    requires_signature: boolean;
}

export interface SignAgreementRequest {
    signature_type: SignatureType;
    signature_data: string;
    signature_media_id?: string;
    agreement_version: string;
    agreement_content_hash: string;
    handbook_acknowledged: boolean;
    handbook_version?: string;
}

export interface CoachAgreementResponse {
    id: string;
    coach_profile_id: string;
    agreement_version: string;
    signature_type: string;
    signed_at: string;
    is_active: boolean;
    ip_address?: string;
    created_at: string;
}

export interface AgreementStatus {
    has_signed_current_version: boolean;
    current_version: string;
    signed_version?: string;
    signed_at?: string;
    requires_new_signature: boolean;
}

export interface AgreementHistoryItem {
    id: string;
    agreement_version: string;
    signature_type: string;
    signed_at: string;
    is_active: boolean;
    superseded_at?: string;
}

export const AgreementApi = {
    /**
     * Get the current agreement content for signing.
     */
    getCurrentAgreement: () =>
        apiGet<AgreementContent>("/api/v1/coaches/agreement/current", { auth: true }),

    /**
     * Check if the coach has signed the current agreement.
     */
    getAgreementStatus: () =>
        apiGet<AgreementStatus>("/api/v1/coaches/agreement/status", { auth: true }),

    /**
     * Sign the coach agreement.
     */
    signAgreement: (data: SignAgreementRequest) =>
        apiPost<CoachAgreementResponse>("/api/v1/coaches/agreement/sign", data, { auth: true }),

    /**
     * Get the coach's agreement signing history.
     */
    getAgreementHistory: () =>
        apiGet<AgreementHistoryItem[]>("/api/v1/coaches/agreement/history", { auth: true }),
};


// ============================================================================
// ADMIN AGREEMENT VERSION MANAGEMENT
// ============================================================================

export interface AgreementVersionListItem {
    id: string;
    version: string;
    title: string;
    effective_date: string;
    is_current: boolean;
    content_hash: string;
    signature_count: number;
    created_at: string;
}

export interface AgreementVersionDetail extends AgreementVersionListItem {
    content: string;
    created_by_id: string | null;
    active_signature_count: number;
    updated_at: string;
}

export interface CreateAgreementVersionRequest {
    version: string;
    title: string;
    content: string;
    effective_date: string;
}

export const AdminAgreementApi = {
    /**
     * List all agreement versions (admin only).
     */
    list: () =>
        apiGet<AgreementVersionListItem[]>("/api/v1/admin/coaches/agreements", {
            auth: true,
        }),

    /**
     * Get a specific agreement version with signature stats (admin only).
     */
    get: (versionId: string) =>
        apiGet<AgreementVersionDetail>(
            `/api/v1/admin/coaches/agreements/${versionId}`,
            { auth: true }
        ),

    /**
     * Create a new agreement version (admin only).
     * Auto-sets as current and notifies active coaches.
     */
    create: (data: CreateAgreementVersionRequest) =>
        apiPost<AgreementVersionDetail>(
            "/api/v1/admin/coaches/agreements",
            data,
            { auth: true }
        ),
};


// ============================================================================
// HANDBOOK
// ============================================================================

export interface HandbookContent {
    version: string;
    title: string;
    content: string;
    content_hash: string;
    effective_date: string;
}

export interface HandbookVersionListItem {
    id: string;
    version: string;
    title: string;
    effective_date: string;
    is_current: boolean;
    content_hash: string;
    created_at: string;
}

export const HandbookApi = {
    /**
     * Get the current handbook content.
     */
    getCurrentHandbook: () =>
        apiGet<HandbookContent>("/api/v1/coaches/handbook/current", { auth: true }),

    /**
     * Get a specific handbook version.
     */
    getHandbookVersion: (version: string) =>
        apiGet<HandbookContent>(`/api/v1/coaches/handbook/${version}`, { auth: true }),
};

export const AdminHandbookApi = {
    /**
     * List all handbook versions (admin only).
     */
    list: () =>
        apiGet<HandbookVersionListItem[]>("/api/v1/admin/coaches/handbook/versions", {
            auth: true,
        }),

    /**
     * Create a new handbook version (admin only).
     */
    create: (data: { version: string; title: string; content: string; effective_date: string }) =>
        apiPost<HandbookVersionListItem>(
            "/api/v1/admin/coaches/handbook",
            data,
            { auth: true }
        ),
};
