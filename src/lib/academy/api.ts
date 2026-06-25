// AcademyApi HTTP client. Extracted from `src/lib/academy.ts` during the
// file-size sweep.

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../api";

import type {
  AICoachSuggestion,
  AICoachSuggestionResponse,
  AIDimensionSuggestion,
  AIScoringRequest,
  AIScoringResponse,
  CoachAssignmentInput,
  CoachAssignmentRole,
  Cohort,
  CohortComplexityScoreCreate,
  CohortComplexityScoreResponse,
  CohortCreate,
  CohortExtensionRequest,
  CohortRideConfigEntry,
  CohortTimelineSessionImpact,
  CohortTimelineShiftLog,
  CohortTimelineShiftPreview,
  CohortTimelineShiftRequest,
  CohortTimelineShiftResult,
  ComplexityScoreCalculation,
  CurriculumLesson,
  CurriculumLessonCreate,
  CurriculumWeek,
  CurriculumWeekCreate,
  DimensionLabels,
  DimensionScore,
  EligibleCoach,
  Enrollment,
  EnrollmentInstallment,
  EnrollmentPauseResult,
  MemberBasicInfo,
  Milestone,
  MilestoneClaimRequest,
  NextSessionInfo,
  OnboardingInfo,
  Program,
  ProgramCurriculum,
  PublicAcademyStats,
  Skill,
  SkillCreate,
  StudentProgress,
  WithdrawEnrollmentResponse,
} from "./types";

import {
  BillingType,
  CoachGrade,
  CohortStatus,
  EnrollmentSource,
  EnrollmentStatus,
  InstallmentStatus,
  LocationType,
  MilestoneType,
  PaymentStatus,
  ProgramCategory,
  ProgramLevel,
  ProgressStatus,
  RequiredEvidence,
} from "./types";


// Private helper type — only used by the dimension-labels lookup below.
type DimensionLabelsApiResponse = {
  category: ProgramCategory;
  labels: string[];
};

// Suppress "imported enum is unused" for enums kept for the value-side
// re-export through the barrel even when this file doesn't reference
// them directly.
void BillingType;
void CoachGrade;
void CohortStatus;
void EnrollmentSource;
void EnrollmentStatus;
void InstallmentStatus;
void LocationType;
void MilestoneType;
void PaymentStatus;
void ProgramCategory;
void ProgramLevel;
void ProgressStatus;
void RequiredEvidence;

export const AcademyApi = {
  // Programs
  listPrograms: () => apiGet<Program[]>("/api/v1/academy/programs"),
  listPublishedPrograms: () => apiGet<Program[]>("/api/v1/academy/programs?published_only=true"),

  // Public stats (no auth)
  getPublicStats: () => apiGet<PublicAcademyStats>("/api/v1/academy/stats/public"),
  createProgram: (data: Partial<Program>) =>
    apiPost<Program>("/api/v1/academy/programs", data, { auth: true }),
  getProgram: (id: string) => apiGet<Program>(`/api/v1/academy/programs/${id}`),
  updateProgram: (id: string, data: Partial<Program>) =>
    apiPut<Program>(`/api/v1/academy/programs/${id}`, data, { auth: true }),
  deleteProgram: (id: string) => apiDelete<void>(`/api/v1/academy/programs/${id}`, { auth: true }),

  // Cohorts
  listCohorts: (programId?: string) => {
    const query = programId ? `?program_id=${programId}` : "";
    return apiGet<Cohort[]>(`/api/v1/academy/cohorts${query}`);
  },
  createCohort: (data: CohortCreate) =>
    apiPost<Cohort>("/api/v1/academy/cohorts", data, { auth: true }),
  getCohort: (id: string) => apiGet<Cohort>(`/api/v1/academy/cohorts/${id}`),
  updateCohort: (id: string, data: Partial<Cohort>) =>
    apiPut<Cohort>(`/api/v1/academy/cohorts/${id}`, data, { auth: true }),
  previewCohortTimelineShift: (id: string, data: CohortTimelineShiftRequest) =>
    apiPost<CohortTimelineShiftPreview>(
      `/api/v1/academy/cohorts/${id}/timeline-shifts/preview`,
      data,
      { auth: true }
    ),
  applyCohortTimelineShift: (id: string, data: CohortTimelineShiftRequest) =>
    apiPost<CohortTimelineShiftResult>(`/api/v1/academy/cohorts/${id}/timeline-shifts`, data, {
      auth: true,
    }),
  listCohortTimelineShiftLogs: (id: string, limit = 20) =>
    apiGet<CohortTimelineShiftLog[]>(
      `/api/v1/academy/cohorts/${id}/timeline-shifts?limit=${limit}`,
      { auth: true }
    ),
  deleteCohort: (id: string) => apiDelete<void>(`/api/v1/academy/cohorts/${id}`, { auth: true }),
  listCohortsByCoach: (coachId: string) =>
    apiGet<Cohort[]>(`/api/v1/academy/cohorts/by-coach/${coachId}`),

  // Milestones
  listMilestones: (programId: string) =>
    apiGet<Milestone[]>(`/api/v1/academy/programs/${programId}/milestones`),
  createMilestone: (data: Partial<Milestone>) =>
    apiPost<Milestone>("/api/v1/academy/milestones", data, { auth: true }),

  // Enrollments. `preferences` is a free-form JSONB bag (e.g. preferred
  // session time, language) — see Enrollment.preferences in ./types.
  enrollStudent: (data: {
    cohort_id?: string;
    program_id: string;
    member_id: string;
    preferences?: Record<string, unknown>;
  }) => apiPost<Enrollment>("/api/v1/academy/enrollments", data, { auth: true }),

  getEnrollment: (id: string) =>
    apiGet<Enrollment>(`/api/v1/academy/my-enrollments/${id}`, { auth: true }),

  getEnrollmentOnboarding: (id: string) =>
    apiGet<OnboardingInfo>(`/api/v1/academy/my-enrollments/${id}/onboarding`, {
      auth: true,
    }),

  listCohortEnrollments: (cohortId: string) =>
    apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/enrollments`, {
      auth: true,
    }),

  getMyEnrollments: () => apiGet<Enrollment[]>("/api/v1/academy/my-enrollments", { auth: true }),

  /**
   * Voluntary withdrawal from an active cohort.
   * Refund policy: 90% before cohort start, 50% of unused portion in mid-entry
   * window, 0 after the cutoff. Remaining installments are always waived.
   * Refund (if any) is disbursed manually by admin — this endpoint records the
   * obligation against the relevant payments.
   */
  withdrawEnrollment: (id: string, body?: { reason?: string }) =>
    apiPost<WithdrawEnrollmentResponse>(
      `/api/v1/academy/my-enrollments/${id}/withdraw`,
      body ?? {},
      { auth: true }
    ),

  // Temporary, resumable pause. While paused the student is off the attendance
  // roster and the coach earns nothing for them from the pause date.
  pauseMyEnrollment: (id: string) =>
    apiPost<EnrollmentPauseResult>(
      `/api/v1/academy/my-enrollments/${id}/pause`,
      {},
      { auth: true }
    ),
  resumeMyEnrollment: (id: string) =>
    apiPost<EnrollmentPauseResult>(
      `/api/v1/academy/my-enrollments/${id}/resume`,
      {},
      { auth: true }
    ),
  adminPauseEnrollment: (id: string) =>
    apiPost<EnrollmentPauseResult>(
      `/api/v1/academy/enrollments/${id}/pause`,
      {},
      { auth: true }
    ),
  adminResumeEnrollment: (id: string) =>
    apiPost<EnrollmentPauseResult>(
      `/api/v1/academy/enrollments/${id}/resume`,
      {},
      { auth: true }
    ),

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
  getEnrollableCohorts: (programId?: string) => {
    const query = programId ? `?program_id=${programId}` : "";
    return apiGet<Cohort[]>(`/api/v1/academy/cohorts/enrollable${query}`);
  },

  // Admin tasks
  triggerCohortStatusTransitions: () =>
    apiPost<{ message: string }>(
      "/api/v1/academy/admin/tasks/transition-cohort-statuses",
      {},
      { auth: true }
    ),

  /**
   * Request enrollment in a program or specific cohort.
   */
  selfEnroll: (data: {
    program_id?: string;
    cohort_id?: string;
    preferences?: Record<string, unknown>;
  }) => apiPost<Enrollment>(`/api/v1/academy/enrollments/me`, data, { auth: true }),

  listCohortStudents: (cohortId: string) =>
    apiGet<Enrollment[]>(`/api/v1/academy/cohorts/${cohortId}/students`, {
      auth: true,
    }),

  updateEnrollment: (id: string, data: Partial<Enrollment>) =>
    apiPatch<Enrollment>(`/api/v1/academy/enrollments/${id}`, data, {
      auth: true,
    }),

  // Admin List
  listAllEnrollments: (status?: EnrollmentStatus) => {
    const query = status ? `?status=${status}` : "";
    return apiGet<Enrollment[]>(`/api/v1/academy/enrollments${query}`, {
      auth: true,
    });
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
    apiPost<ProgramCurriculum>(
      `/api/v1/academy/programs/${programId}/curriculum`,
      {},
      { auth: true }
    ),

  // --- Curriculum Weeks ---
  addWeek: (curriculumId: string, data: CurriculumWeekCreate) =>
    apiPost<CurriculumWeek>(`/api/v1/academy/curricula/${curriculumId}/weeks`, data, {
      auth: true,
    }),
  updateWeek: (weekId: string, data: Partial<CurriculumWeek>) =>
    apiPut<CurriculumWeek>(`/api/v1/academy/curriculum-weeks/${weekId}`, data, {
      auth: true,
    }),
  deleteWeek: (weekId: string) =>
    apiDelete<void>(`/api/v1/academy/curriculum-weeks/${weekId}`, {
      auth: true,
    }),

  // --- Curriculum Lessons ---
  addLesson: (weekId: string, data: CurriculumLessonCreate) =>
    apiPost<CurriculumLesson>(`/api/v1/academy/curriculum-weeks/${weekId}/lessons`, data, {
      auth: true,
    }),
  updateLesson: (lessonId: string, data: Partial<CurriculumLesson> & { skill_ids?: string[] }) =>
    apiPut<CurriculumLesson>(`/api/v1/academy/curriculum-lessons/${lessonId}`, data, {
      auth: true,
    }),
  deleteLesson: (lessonId: string) =>
    apiDelete<void>(`/api/v1/academy/curriculum-lessons/${lessonId}`, {
      auth: true,
    }),

  // --- Reordering ---
  reorderWeeks: (curriculumId: string, weekIds: string[]) =>
    apiPut<{ message: string }>(
      `/api/v1/academy/curricula/${curriculumId}/weeks/reorder`,
      weekIds,
      { auth: true }
    ),
  reorderLessons: (weekId: string, lessonIds: string[]) =>
    apiPut<{ message: string }>(
      `/api/v1/academy/curriculum-weeks/${weekId}/lessons/reorder`,
      lessonIds,
      { auth: true }
    ),

  // --- Program Interest (Get Notified) ---
  registerProgramInterest: (programId: string) =>
    apiPost<{ message: string; registered: boolean }>(
      `/api/v1/academy/programs/${programId}/interest`,
      {},
      { auth: true }
    ),
  removeProgramInterest: (programId: string) =>
    apiDelete<{ message: string; registered: boolean }>(
      `/api/v1/academy/programs/${programId}/interest`,
      { auth: true }
    ),
  checkProgramInterest: (programId: string) =>
    apiGet<{ registered: boolean }>(`/api/v1/academy/programs/${programId}/interest`, {
      auth: true,
    }),

  // --- Cohort Complexity Scoring ---
  previewComplexityScore: (category: ProgramCategory, dimensionScores: number[]) =>
    apiPost<ComplexityScoreCalculation>(
      `/api/v1/academy/scoring/calculate`,
      { category, dimension_scores: dimensionScores },
      { auth: true }
    ),

  getDimensionLabels: (category: ProgramCategory) =>
    apiGet<DimensionLabelsApiResponse>(`/api/v1/academy/scoring/dimensions/${category}`, {
      auth: true,
    }),

  getCohortComplexityScore: (cohortId: string) =>
    apiGet<CohortComplexityScoreResponse>(`/api/v1/academy/cohorts/${cohortId}/complexity-score`, {
      auth: true,
    }),

  createCohortComplexityScore: (cohortId: string, data: CohortComplexityScoreCreate) =>
    apiPost<CohortComplexityScoreResponse>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score`,
      data,
      { auth: true }
    ),

  updateCohortComplexityScore: (cohortId: string, data: Partial<CohortComplexityScoreCreate>) =>
    apiPut<CohortComplexityScoreResponse>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score`,
      data,
      { auth: true }
    ),

  deleteCohortComplexityScore: (cohortId: string) =>
    apiDelete<void>(`/api/v1/academy/cohorts/${cohortId}/complexity-score`, {
      auth: true,
    }),

  markComplexityScoreReviewed: (cohortId: string) =>
    apiPost<{ message: string }>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score/review`,
      {},
      { auth: true }
    ),

  getEligibleCoaches: (cohortId: string) =>
    apiGet<EligibleCoach[]>(`/api/v1/academy/cohorts/${cohortId}/eligible-coaches`, { auth: true }),

  // --- AI-Assisted Scoring ---
  aiScoreCohort: (cohortId: string, data: AIScoringRequest = {}) =>
    apiPost<AIScoringResponse>(`/api/v1/academy/cohorts/${cohortId}/ai-score`, data, {
      auth: true,
    }),

  aiSuggestCoach: (cohortId: string) =>
    apiPost<AICoachSuggestionResponse>(
      `/api/v1/academy/cohorts/${cohortId}/ai-suggest-coach`,
      {},
      { auth: true }
    ),
};

// ============================================================================
// COHORT EXTENSION REQUESTS (admin approval queue)
// ============================================================================

export const ExtensionRequestApi = {
  /** All pending extension requests across cohorts (admin only). */
  listPending: () =>
    apiGet<CohortExtensionRequest[]>(
      "/api/v1/academy/extension-requests/pending",
      { auth: true },
    ),

  /** Approve a request — backend also extends the cohort end date and
   * propagates the new date to enrolled members' academy access. */
  approve: (requestId: string, adminNotes?: string) =>
    apiPost<CohortExtensionRequest>(
      `/api/v1/academy/extension-requests/${requestId}/approve`,
      { admin_notes: adminNotes?.trim() ? adminNotes.trim() : null },
      { auth: true },
    ),

  reject: (requestId: string, adminNotes?: string) =>
    apiPost<CohortExtensionRequest>(
      `/api/v1/academy/extension-requests/${requestId}/reject`,
      { admin_notes: adminNotes?.trim() ? adminNotes.trim() : null },
      { auth: true },
    ),
};

// ============================================================================
// COACH ASSIGNMENT TYPES & API
// ============================================================================

export interface CoachAssignment {
  id: string;
  cohort_id: string;
  coach_id: string;
  role: "lead" | "assistant" | "shadow" | "observer";
  start_date: string;
  end_date?: string;
  assigned_by_id: string;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  is_session_override: boolean;
  session_date?: string;
  created_at: string;
  updated_at: string;
  coach_name?: string;
  cohort_name?: string;
  program_name?: string;
}

export interface CoachAssignmentCreate {
  cohort_id: string;
  coach_id: string;
  role: "lead" | "assistant" | "shadow" | "observer";
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_session_override?: boolean;
  session_date?: string;
}

export interface ShadowEvaluation {
  id: string;
  assignment_id: string;
  evaluator_id: string;
  session_date: string;
  scores: Record<string, number>;
  feedback?: string;
  recommendation: string;
  created_at: string;
  evaluator_name?: string;
}

export interface ShadowEvaluationCreate {
  session_date: string;
  scores: Record<string, number>;
  feedback?: string;
  recommendation: "continue_shadow" | "ready_for_assistant" | "ready_for_lead";
}

export interface ReadinessCheck {
  name: string;
  description: string;
  status: "passed" | "pending" | "failed";
  required: boolean;
  details?: string;
}

export interface CoachReadiness {
  coach_id: string;
  coach_name?: string;
  target_grade: string;
  is_ready: boolean;
  checks: ReadinessCheck[];
  missing_requirements: string[];
  recommendations: string[];
}

export const CoachAssignmentApi = {
  listByCohort: (cohortId: string) =>
    apiGet<CoachAssignment[]>(`/api/v1/academy/coach-assignments/cohort/${cohortId}`, {
      auth: true,
    }),

  listMyAssignments: () =>
    apiGet<CoachAssignment[]>("/api/v1/academy/coach-assignments/coach/me", {
      auth: true,
    }),

  listByCoach: (coachId: string) =>
    apiGet<CoachAssignment[]>(`/api/v1/academy/coach-assignments/coach/${coachId}`, { auth: true }),

  create: (data: CoachAssignmentCreate) =>
    apiPost<CoachAssignment>("/api/v1/academy/coach-assignments/", data, {
      auth: true,
    }),

  update: (id: string, data: Partial<CoachAssignment>) =>
    apiPatch<CoachAssignment>(`/api/v1/academy/coach-assignments/${id}`, data, {
      auth: true,
    }),

  cancel: (id: string) =>
    apiDelete<void>(`/api/v1/academy/coach-assignments/${id}`, { auth: true }),

  // Shadow evaluations
  createEvaluation: (assignmentId: string, data: ShadowEvaluationCreate) =>
    apiPost<ShadowEvaluation>(
      `/api/v1/academy/coach-assignments/${assignmentId}/evaluations`,
      data,
      { auth: true }
    ),

  listEvaluations: (assignmentId: string) =>
    apiGet<ShadowEvaluation[]>(`/api/v1/academy/coach-assignments/${assignmentId}/evaluations`, {
      auth: true,
    }),

  // Readiness
  getReadiness: (coachId: string, targetGrade: string = "grade_1") =>
    apiGet<CoachReadiness>(
      `/api/v1/academy/coach-assignments/readiness/${coachId}?target_grade=${targetGrade}`,
      { auth: true }
    ),
};
