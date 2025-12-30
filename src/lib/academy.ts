import { apiDelete, apiGet, apiPost, apiPut } from "./api";

// Note: ProgramResponse, CohortResponse, EnrollmentResponse are not in gateway OpenAPI spec
// These types are defined locally below as the academy service isn't proxied through gateway

// --- Types ---

export enum ProgramLevel {
    BEGINNER_1 = "beginner_1",
    BEGINNER_2 = "beginner_2",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced",
    SPECIALTY = "specialty",
}

export enum CohortStatus {
    OPEN = "open",
    ACTIVE = "active",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

export enum EnrollmentStatus {
    PENDING_APPROVAL = "pending_approval",
    ENROLLED = "enrolled",
    WAITLIST = "waitlist",
    DROPPED = "dropped",
    GRADUATED = "graduated",
}

export enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    WAIVED = "waived",
}

export enum ProgressStatus {
    PENDING = "pending",
    ACHIEVED = "achieved",
}

export interface Program {
    id: string;
    name: string;
    description?: string;
    level: ProgramLevel;
    duration_weeks: number;
    price?: number;
    curriculum_json?: any;
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
    status: CohortStatus;
    coach_id?: string | null;
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
    created_at: string;
    updated_at: string;
    cohort?: Cohort; // Added for eager loading
    program?: Program; // Added for eager loading
}

export interface Milestone {
    id: string;
    program_id: string;
    name: string;
    criteria?: string;
    video_url?: string;
    created_at: string;
    updated_at: string;
}

export interface StudentProgress {
    id: string;
    enrollment_id: string;
    milestone_id: string;
    status: ProgressStatus;
    achieved_at?: string;
    coach_notes?: string;
    created_at: string;
    updated_at: string;
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
        apiGet<Enrollment>(`/api/v1/academy/enrollments/${id}`, { auth: true }),

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

    // New Methods
    getOpenCohorts: () => apiGet<Cohort[]>("/api/v1/academy/cohorts/open"),

    /**
     * Request enrollment in a program or specific cohort.
     */
    selfEnroll: (data: { program_id?: string; cohort_id?: string; preferences?: any }) =>
        apiPost<Enrollment>(`/api/v1/academy/enrollments/me`, data, { auth: true }),

    listCohortStudents: (cohortId: string) =>
        apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/students`, { auth: true }),

    updateEnrollment: (id: string, data: Partial<Enrollment>) =>
        apiPut<Enrollment>(`/api/v1/academy/enrollments/${id}`, data, { auth: true }),

    // Admin List
    listAllEnrollments: (status?: EnrollmentStatus) => {
        const query = status ? `?status=${status}` : "";
        return apiGet<Enrollment[]>(`/api/v1/academy/enrollments${query}`, { auth: true });
    },
};
