import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";

// Note: These types match the backend academy_service models after the schema redesign

// --- Enums ---

export enum ProgramLevel {
    BEGINNER_1 = "beginner_1",
    BEGINNER_2 = "beginner_2",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced",
    SPECIALTY = "specialty",
}

export enum BillingType {
    ONE_TIME = "one_time",
    SUBSCRIPTION = "subscription",
    PER_SESSION = "per_session",
}

export enum CohortStatus {
    OPEN = "open",
    ACTIVE = "active",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

export enum LocationType {
    POOL = "pool",
    OPEN_WATER = "open_water",
    REMOTE = "remote",
}

export enum EnrollmentStatus {
    PENDING_APPROVAL = "pending_approval",
    ENROLLED = "enrolled",
    WAITLIST = "waitlist",
    DROPPED = "dropped",
    GRADUATED = "graduated",
}

export enum EnrollmentSource {
    WEB = "web",
    ADMIN = "admin",
    PARTNER = "partner",
}

export enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    WAIVED = "waived",
}

export enum MilestoneType {
    SKILL = "skill",
    ENDURANCE = "endurance",
    TECHNIQUE = "technique",
    ASSESSMENT = "assessment",
}

export enum RequiredEvidence {
    NONE = "none",
    VIDEO = "video",
    TIME_TRIAL = "time_trial",
}

export enum ProgressStatus {
    PENDING = "pending",
    ACHIEVED = "achieved",
}

// --- Types ---

export interface Program {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    cover_image_url?: string;
    cover_image_media_id?: string;
    level: ProgramLevel;
    duration_weeks: number;
    default_capacity?: number;
    // Pricing
    currency?: string;
    price_amount?: number;
    billing_type?: BillingType;
    // Content
    curriculum_json?: any;
    prep_materials?: any;
    // Status
    version?: number;
    is_published?: boolean;
    created_at: string;
    updated_at: string;
}

export interface Cohort {
    id: string;
    program_id: string;
    name: string;
    start_date: string;
    end_date: string;
    capacity: number;
    // Location
    timezone?: string;
    location_type?: LocationType;
    location_name?: string;
    location_address?: string;
    // Coach
    coach_id?: string | null;
    // Pricing
    price_override?: number;
    // Status
    status: CohortStatus;
    allow_mid_entry?: boolean;
    require_approval?: boolean; // If true, enrollment needs admin approval even after payment
    notes_internal?: string;
    // Relations
    program?: Program;
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    id: string;
    program_id?: string | null;
    cohort_id?: string | null;
    member_id: string;
    status: EnrollmentStatus;
    payment_status: PaymentStatus;
    preferences?: any;
    // Payment tracking
    price_snapshot_amount?: number;
    currency_snapshot?: string;
    payment_reference?: string;
    paid_at?: string;
    // Enrollment tracking
    enrolled_at?: string;
    source?: EnrollmentSource;
    created_at: string;
    updated_at: string;
    // Relations
    cohort?: Cohort;
    program?: Program;
}

export interface Milestone {
    id: string;
    program_id: string;
    name: string;
    criteria?: string;
    video_url?: string;
    // Organization
    order_index?: number;
    milestone_type?: MilestoneType;
    // Assessment
    rubric_json?: any;
    required_evidence?: RequiredEvidence;
    created_at: string;
    updated_at: string;
}

export interface StudentProgress {
    id: string;
    enrollment_id: string;
    milestone_id: string;
    status: ProgressStatus;
    achieved_at?: string;
    // Evidence & Review
    evidence_media_id?: string;  // Links to media service - can be file or external URL
    score?: number;
    reviewed_by_coach_id?: string;
    reviewed_at?: string;
    student_notes?: string;
    coach_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface MilestoneClaimRequest {
    evidence_media_id?: string;  // Upload file or external URL via media service
    student_notes?: string;
}

// --- Curriculum Types ---

export interface Skill {
    id: string;
    name: string;
    category: string; // "water_confidence", "stroke", "safety", "technique"
    description?: string;
    created_at: string;
}

export interface CurriculumLesson {
    id: string;
    week_id: string;
    title: string;
    description?: string;
    duration_minutes?: number;
    video_url?: string;
    order_index: number;
    skills: Skill[];
    created_at: string;
}

export interface CurriculumWeek {
    id: string;
    curriculum_id: string;
    week_number: number;
    theme: string;
    objectives?: string;
    order_index: number;
    lessons: CurriculumLesson[];
    created_at: string;
}

export interface ProgramCurriculum {
    id: string;
    program_id: string;
    version: number;
    is_active: boolean;
    weeks: CurriculumWeek[];
    created_at: string;
    updated_at: string;
}

export interface SkillCreate {
    name: string;
    category: string;
    description?: string;
}

export interface CurriculumWeekCreate {
    week_number: number;
    theme: string;
    objectives?: string;
}

export interface CurriculumLessonCreate {
    title: string;
    description?: string;
    duration_minutes?: number;
    video_url?: string;
    skill_ids?: string[];
}

export interface MemberBasicInfo {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

// --- API Functions ---
export const AcademyApi = {
    // Programs
    listPrograms: () => apiGet<Program[]>("/api/v1/academy/programs"),
    createProgram: (data: Partial<Program>) => apiPost<Program>("/api/v1/academy/programs", data, { auth: true }),
    getProgram: (id: string) => apiGet<Program>(`/api/v1/academy/programs/${id}`),
    updateProgram: (id: string, data: Partial<Program>) => apiPut<Program>(`/api/v1/academy/programs/${id}`, data, { auth: true }),
    deleteProgram: (id: string) => apiDelete<void>(`/api/v1/academy/programs/${id}`, { auth: true }),

    // Cohorts
    listCohorts: (programId?: string) => {
        const query = programId ? `?program_id=${programId}` : "";
        return apiGet<Cohort[]>(`/api/v1/academy/cohorts${query}`);
    },
    createCohort: (data: Partial<Cohort>) => apiPost<Cohort>("/api/v1/academy/cohorts", data, { auth: true }),
    getCohort: (id: string) => apiGet<Cohort>(`/api/v1/academy/cohorts/${id}`),
    updateCohort: (id: string, data: Partial<Cohort>) => apiPut<Cohort>(`/api/v1/academy/cohorts/${id}`, data, { auth: true }),
    deleteCohort: (id: string) => apiDelete<void>(`/api/v1/academy/cohorts/${id}`, { auth: true }),

    // Milestones
    listMilestones: (programId: string) => apiGet<Milestone[]>(`/api/v1/academy/programs/${programId}/milestones`),
    createMilestone: (data: Partial<Milestone>) => apiPost<Milestone>("/api/v1/academy/milestones", data, { auth: true }),

    // Enrollments
    enrollStudent: (data: { cohort_id?: string; program_id: string; member_id: string; preferences?: any }) =>
        apiPost<Enrollment>("/api/v1/academy/enrollments", data, { auth: true }),

    getEnrollment: (id: string) =>
        apiGet<Enrollment>(`/api/v1/academy/my-enrollments/${id}`, { auth: true }),

    listCohortEnrollments: (cohortId: string) =>
        apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/enrollments`, { auth: true }),

    getMyEnrollments: () =>
        apiGet<Enrollment[]>("/api/v1/academy/my-enrollments", { auth: true }),

    // Progress
    updateProgress: (enrollmentId: string, milestoneId: string, data: Partial<StudentProgress>) =>
        apiPost<StudentProgress>(
            `/api/v1/academy/progress?enrollment_id=${enrollmentId}&milestone_id=${milestoneId}`,
            data,
            { auth: true }
        ),

    getStudentProgress: (enrollmentId: string) =>
        apiGet<StudentProgress[]>(`/api/v1/academy/enrollments/${enrollmentId}/progress`),

    claimMilestone: (enrollmentId: string, milestoneId: string, data: MilestoneClaimRequest) =>
        apiPost<StudentProgress>(
            `/api/v1/academy/enrollments/${enrollmentId}/progress/${milestoneId}/claim`,
            data,
            { auth: true }
        ),

    // Open cohorts
    getOpenCohorts: () => apiGet<Cohort[]>("/api/v1/academy/cohorts/open"),

    /**
     * Request enrollment in a program or specific cohort.
     */
    selfEnroll: (data: { program_id?: string; cohort_id?: string; preferences?: any }) =>
        apiPost<Enrollment>(`/api/v1/academy/enrollments/me`, data, { auth: true }),

    listCohortStudents: (cohortId: string) =>
        apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/students`, { auth: true }),

    updateEnrollment: (id: string, data: Partial<Enrollment>) =>
        apiPatch<Enrollment>(`/api/v1/academy/enrollments/${id}`, data, { auth: true }),

    // Admin List
    listAllEnrollments: (status?: EnrollmentStatus) => {
        const query = status ? `?status=${status}` : "";
        return apiGet<Enrollment[]>(`/api/v1/academy/enrollments${query}`, { auth: true });
    },

    // --- Skills Library ---
    listSkills: (category?: string) => {
        const query = category ? `?category=${category}` : "";
        return apiGet<Skill[]>(`/api/v1/academy/skills${query}`);
    },
    createSkill: (data: SkillCreate) =>
        apiPost<Skill>("/api/v1/academy/skills", data, { auth: true }),
    updateSkill: (skillId: string, data: Partial<Skill>) =>
        apiPut<Skill>(`/api/v1/academy/skills/${skillId}`, data, { auth: true }),
    deleteSkill: (skillId: string) =>
        apiDelete<void>(`/api/v1/academy/skills/${skillId}`, { auth: true }),

    // --- Curriculum ---
    getCurriculum: (programId: string) =>
        apiGet<ProgramCurriculum>(`/api/v1/academy/programs/${programId}/curriculum`),
    createCurriculum: (programId: string) =>
        apiPost<ProgramCurriculum>(`/api/v1/academy/programs/${programId}/curriculum`, {}, { auth: true }),

    // --- Curriculum Weeks ---
    addWeek: (curriculumId: string, data: CurriculumWeekCreate) =>
        apiPost<CurriculumWeek>(`/api/v1/academy/curricula/${curriculumId}/weeks`, data, { auth: true }),
    updateWeek: (weekId: string, data: Partial<CurriculumWeek>) =>
        apiPut<CurriculumWeek>(`/api/v1/academy/curriculum-weeks/${weekId}`, data, { auth: true }),
    deleteWeek: (weekId: string) =>
        apiDelete<void>(`/api/v1/academy/curriculum-weeks/${weekId}`, { auth: true }),

    // --- Curriculum Lessons ---
    addLesson: (weekId: string, data: CurriculumLessonCreate) =>
        apiPost<CurriculumLesson>(`/api/v1/academy/curriculum-weeks/${weekId}/lessons`, data, { auth: true }),
    updateLesson: (lessonId: string, data: Partial<CurriculumLesson> & { skill_ids?: string[] }) =>
        apiPut<CurriculumLesson>(`/api/v1/academy/curriculum-lessons/${lessonId}`, data, { auth: true }),
    deleteLesson: (lessonId: string) =>
        apiDelete<void>(`/api/v1/academy/curriculum-lessons/${lessonId}`, { auth: true }),

    // --- Reordering ---
    reorderWeeks: (curriculumId: string, weekIds: string[]) =>
        apiPut<{ message: string }>(`/api/v1/academy/curricula/${curriculumId}/weeks/reorder`, weekIds, { auth: true }),
    reorderLessons: (weekId: string, lessonIds: string[]) =>
        apiPut<{ message: string }>(`/api/v1/academy/curriculum-weeks/${weekId}/lessons/reorder`, lessonIds, { auth: true }),
};
