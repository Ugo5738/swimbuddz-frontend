import { apiGet, apiPost, apiPut, apiDelete } from "./api";

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
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    id: string;
    cohort_id: string;
    member_id: string;
    status: EnrollmentStatus;
    payment_status: PaymentStatus;
    created_at: string;
    updated_at: string;
    cohort?: Cohort; // Added for eager loading
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
    email: string;
}

export interface EnrollmentWithStudent extends Enrollment {
    member: MemberBasicInfo;
    progress_records: StudentProgress[];
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
    enrollStudent: (data: { cohort_id: string; member_id: string }) =>
        apiPost<Enrollment>("/api/v1/academy/enrollments", data, { auth: true }),

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

    selfEnroll: (cohortId: string) =>
        apiPost<Enrollment>(`/api/v1/academy/enrollments/me`, { cohort_id: cohortId }, { auth: true }),

    listCohortStudents: (cohortId: string) =>
        apiGet<EnrollmentWithStudent[]>(`/api/v1/academy/cohorts/${cohortId}/students`, { auth: true }),
};
