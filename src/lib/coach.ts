/**
 * Coach-specific API functions and types.
 * Used by coach dashboard, cohort management, and student progress pages.
 */

import { apiGet, apiPost } from "./api";

// --- Types ---

export type CohortStatus = "open" | "active" | "completed" | "cancelled";
export type EnrollmentStatus =
    | "pending_approval"
    | "enrolled"
    | "completed"
    | "dropped"
    | "waitlist";
export type ProgressStatus = "pending" | "achieved";

export type Program = {
    id: string;
    name: string;
    description: string | null;
    level: string;
    duration_weeks: number;
    default_capacity: number;
    currency: string;
    price_amount: number;
    cover_image_url: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
};

export type Cohort = {
    id: string;
    name: string;
    program_id: string;
    coach_id: string | null;
    start_date: string;
    end_date: string;
    capacity: number;
    status: CohortStatus;
    allow_mid_entry: boolean;
    require_approval: boolean;
    timezone: string | null;
    location_type: string | null;
    location_name: string | null;
    location_address: string | null;
    price_override: number | null;
    notes_internal: string | null;
    created_at: string;
    updated_at: string;
    program?: Program;
};

export type Milestone = {
    id: string;
    program_id: string;
    name: string;
    criteria: string | null;
    video_media_id: string | null;
    created_at: string;
    updated_at: string;
};

export type StudentProgress = {
    id: string;
    enrollment_id: string;
    milestone_id: string;
    status: ProgressStatus;
    achieved_at: string | null;
    evidence_media_id: string | null;
    student_notes: string | null;
    coach_notes: string | null;
    score: number | null;
    reviewed_by_coach_id: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
};

export type Enrollment = {
    id: string;
    program_id: string | null;
    cohort_id: string | null;
    member_id: string;
    status: EnrollmentStatus;
    payment_status: string;
    preferences: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    cohort?: Cohort;
    program?: Program;
    // Additional fields populated by backend when returning students
    member_name?: string;
    member_email?: string;
    progress?: StudentProgress[];
};

export type CoachProfile = {
    id: string;
    member_id: string;
    display_name: string | null;
    status: string;
    short_bio: string | null;
    coaching_years: number;
    coaching_specialties: string[];
    certifications: string[];
    pools_supported: string[];
    preferred_cohort_types: string[];
    created_at: string;
    updated_at: string;
};

// --- API Functions ---

/**
 * Get cohorts assigned to the current coach.
 */
export async function getMyCoachCohorts(): Promise<Cohort[]> {
    return apiGet<Cohort[]>("/api/v1/academy/cohorts/coach/me", { auth: true });
}

/**
 * Get a specific cohort by ID.
 */
export async function getCohort(cohortId: string): Promise<Cohort> {
    return apiGet<Cohort>(`/api/v1/academy/cohorts/${cohortId}`, { auth: true });
}

/**
 * Get students enrolled in a cohort.
 * Requires coach or admin permission.
 */
export async function getCohortStudents(cohortId: string): Promise<Enrollment[]> {
    return apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/students`, {
        auth: true,
    });
}

/**
 * Get all students across all cohorts assigned to the current coach.
 * Returns enrollments with cohort and progress data.
 */
export async function getMyCoachStudents(): Promise<Enrollment[]> {
    return apiGet<Enrollment[]>("/api/v1/academy/coach/me/students", {
        auth: true,
    });
}

// --- Session Types ---

export type SessionLocation =
    | "sunfit_pool"
    | "rowe_park_pool"
    | "federal_palace_pool"
    | "open_water"
    | "other";

export type SessionType =
    | "cohort_class"
    | "one_on_one"
    | "group_booking"
    | "club"
    | "community"
    | "event";

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type CoachSession = {
    id: string;
    title: string;
    description: string | null;
    session_type: SessionType;
    status: SessionStatus;
    starts_at: string;
    ends_at: string;
    timezone: string;
    location: SessionLocation | null;
    location_name: string | null;
    location_address: string | null;
    capacity: number;
    cohort_id: string | null;
    week_number: number | null;
    lesson_title: string | null;
    created_at: string;
    updated_at: string;
};

/**
 * Get sessions for the current coach.
 * Includes sessions from assigned cohorts and direct assignments.
 */
export async function getMyCoachSessions(options?: {
    fromDate?: string;
    toDate?: string;
}): Promise<CoachSession[]> {
    const params = new URLSearchParams();
    if (options?.fromDate) params.set("from_date", options.fromDate);
    if (options?.toDate) params.set("to_date", options.toDate);

    const queryString = params.toString();
    const url = `/api/v1/sessions/coach/me${queryString ? `?${queryString}` : ""}`;

    return apiGet<CoachSession[]>(url, { auth: true });
}

// --- Resource Types ---

export type ResourceSourceType = "url" | "upload";
export type ResourceVisibility = "enrolled_only" | "public" | "coach_only";

export type CohortResource = {
    id: string;
    cohort_id: string;
    title: string;
    resource_type: string; // 'note', 'drill', 'assignment'
    description: string | null;
    source_type: ResourceSourceType;
    content_media_id: string | null;
    storage_path: string | null;
    mime_type: string | null;
    file_size_bytes: number | null;
    visibility: ResourceVisibility;
    week_number: number | null;
    created_at: string;
    cohort?: Cohort;
};

/**
 * Get all resources across all cohorts assigned to the current coach.
 */
export async function getMyCoachResources(): Promise<CohortResource[]> {
    return apiGet<CohortResource[]>("/api/v1/academy/coach/me/resources", {
        auth: true,
    });
}

/**
 * Get resources for a specific cohort.
 */
export async function getCohortResources(cohortId: string): Promise<CohortResource[]> {
    return apiGet<CohortResource[]>(`/api/v1/academy/cohorts/${cohortId}/resources`, {
        auth: true,
    });
}

/**
 * Get milestones for a program.
 */
export async function getProgramMilestones(programId: string): Promise<Milestone[]> {
    return apiGet<Milestone[]>(`/api/v1/academy/programs/${programId}/milestones`, {
        auth: true,
    });
}

/**
 * Get progress records for an enrollment.
 */
export async function getEnrollmentProgress(
    enrollmentId: string
): Promise<StudentProgress[]> {
    return apiGet<StudentProgress[]>(
        `/api/v1/academy/enrollments/${enrollmentId}/progress`,
        { auth: true }
    );
}

/**
 * Update student progress (coach marking milestone as achieved).
 */
export async function updateStudentProgress(
    enrollmentId: string,
    milestoneId: string,
    data: {
        status: ProgressStatus;
        achieved_at?: string;
        coach_notes?: string;
    }
): Promise<StudentProgress> {
    return apiPost<StudentProgress>(
        "/api/v1/academy/progress",
        {
            enrollment_id: enrollmentId,
            milestone_id: milestoneId,
            ...data,
        },
        { auth: true }
    );
}

/**
 * Get the current coach's profile and application status.
 */
export async function getMyCoachProfile(): Promise<CoachProfile> {
    return apiGet<CoachProfile>("/api/v1/members/coaches/me", { auth: true });
}

/**
 * Get coach application status (lightweight check).
 */
export async function getCoachApplicationStatus(): Promise<{
    status: string;
    can_access_dashboard: boolean;
    application_submitted_at: string | null;
    application_reviewed_at: string | null;
    rejection_reason: string | null;
}> {
    return apiGet("/api/v1/members/coaches/application-status", { auth: true });
}

// --- Earnings Types ---

export type CohortEarning = {
    cohort_id: string;
    cohort_name: string;
    program_name: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    earnings: number;
};

export type CoachEarnings = {
    summary: {
        total_earnings: number;
        active_cohorts: number;
        completed_cohorts: number;
        pending_payout: number;
    };
    rates: {
        academy_cohort_stipend: number;
        one_to_one_rate_per_hour: number;
        group_session_rate_per_hour: number;
    };
    cohort_earnings: CohortEarning[];
};

/**
 * Get earnings summary for the current coach.
 */
export async function getMyCoachEarnings(): Promise<CoachEarnings> {
    return apiGet<CoachEarnings>("/api/v1/academy/coach/me/earnings", {
        auth: true,
    });
}

// --- Helper Functions ---

/**
 * Calculate cohort statistics from a list of cohorts.
 */
export function calculateCohortStats(cohorts: Cohort[]) {
    const now = Date.now();
    const activeCohorts = cohorts.filter((c) => c.status === "active");
    const upcomingCohorts = cohorts.filter((c) => {
        const start = Date.parse(c.start_date);
        return (
            Number.isFinite(start) &&
            start > now &&
            c.status !== "completed" &&
            c.status !== "cancelled"
        );
    });
    const next7Days = upcomingCohorts.filter((c) => {
        const start = Date.parse(c.start_date);
        const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
        return start <= sevenDaysFromNow;
    });

    return {
        totalCohorts: cohorts.length,
        activeCohorts: activeCohorts.length,
        upcomingCohorts: upcomingCohorts.length,
        next7Days: next7Days.length,
        completedCohorts: cohorts.filter((c) => c.status === "completed").length,
    };
}

/**
 * Calculate student progress percentage for a single enrollment.
 */
export function calculateProgressPercentage(
    progress: StudentProgress[],
    totalMilestones: number
): number {
    if (totalMilestones === 0) return 0;
    const achieved = progress.filter((p) => p.status === "achieved").length;
    return Math.round((achieved / totalMilestones) * 100);
}

/**
 * Get students grouped by their progress status.
 */
export function groupStudentsByProgress(
    enrollments: Enrollment[],
    milestones: Milestone[]
) {
    const totalMilestones = milestones.length;

    return enrollments.reduce(
        (acc, enrollment) => {
            const progress = enrollment.progress || [];
            const percentage = calculateProgressPercentage(progress, totalMilestones);

            if (percentage === 0) {
                acc.notStarted.push(enrollment);
            } else if (percentage === 100) {
                acc.completed.push(enrollment);
            } else {
                acc.inProgress.push(enrollment);
            }

            return acc;
        },
        {
            notStarted: [] as Enrollment[],
            inProgress: [] as Enrollment[],
            completed: [] as Enrollment[],
        }
    );
}
