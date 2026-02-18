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
  mid_entry_cutoff_week?: number;
  require_approval?: boolean; // If true, enrollment needs admin approval even after payment
  notes_internal?: string;
  // Relations
  program?: Program;
  created_at: string;
  updated_at: string;
}

export type CoachAssignmentRole = "lead" | "assistant" | "shadow" | "observer";

export interface CoachAssignmentInput {
  coach_id: string;
  role?: CoachAssignmentRole;
}

export interface CohortCreate extends Partial<Cohort> {
  program_id: string;
  coach_id?: string | null;
  coach_assignments?: CoachAssignmentInput[];
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
  video_media_id?: string;
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
  evidence_media_id?: string; // Links to media service - can be file or external URL
  score?: number;
  reviewed_by_coach_id?: string;
  reviewed_at?: string;
  student_notes?: string;
  coach_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneClaimRequest {
  evidence_media_id?: string; // Upload file or external URL via media service
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

// --- Cohort Complexity Scoring Types ---

export enum ProgramCategory {
  LEARN_TO_SWIM = "learn_to_swim",
  SPECIAL_POPULATIONS = "special_populations",
  INSTITUTIONAL = "institutional",
  COMPETITIVE_ELITE = "competitive_elite",
  CERTIFICATIONS = "certifications",
  SPECIALIZED_DISCIPLINES = "specialized_disciplines",
  ADJACENT_SERVICES = "adjacent_services",
}

export enum CoachGrade {
  GRADE_1 = "grade_1",
  GRADE_2 = "grade_2",
  GRADE_3 = "grade_3",
}

export interface DimensionScore {
  score: number; // 1-5
  rationale?: string;
}

export interface CohortComplexityScoreCreate {
  category: ProgramCategory;
  dimension_1: DimensionScore;
  dimension_2: DimensionScore;
  dimension_3: DimensionScore;
  dimension_4: DimensionScore;
  dimension_5: DimensionScore;
  dimension_6: DimensionScore;
  dimension_7: DimensionScore;
}

export interface CohortComplexityScoreResponse {
  id: string;
  cohort_id: string;
  category: ProgramCategory;
  dimension_1_score: number;
  dimension_1_rationale?: string;
  dimension_2_score: number;
  dimension_2_rationale?: string;
  dimension_3_score: number;
  dimension_3_rationale?: string;
  dimension_4_score: number;
  dimension_4_rationale?: string;
  dimension_5_score: number;
  dimension_5_rationale?: string;
  dimension_6_score: number;
  dimension_6_rationale?: string;
  dimension_7_score: number;
  dimension_7_rationale?: string;
  total_score: number;
  required_coach_grade: CoachGrade;
  pay_band_min: number;
  pay_band_max: number;
  scored_by_id: string;
  scored_at: string;
  reviewed_by_id?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplexityScoreCalculation {
  total_score: number;
  required_coach_grade: CoachGrade;
  pay_band_min: number;
  pay_band_max: number;
}

export interface EligibleCoach {
  member_id: string;
  name: string;
  email?: string;
  grade: CoachGrade;
  total_coaching_hours?: number;
  average_feedback_rating?: number;
}

export interface DimensionLabels {
  category: ProgramCategory;
  labels: string[];
}

type DimensionLabelsApiResponse = {
  category: ProgramCategory;
  labels: string[];
};

export interface NextSessionInfo {
  date?: string;
  location?: string;
  notes?: string;
}

// --- AI Scoring Types ---

export interface AIScoringRequest {
  category?: ProgramCategory;
  age_group?: string;
  skill_level?: string;
  special_needs?: string;
  location_type?: string;
  duration_weeks?: number;
  class_size?: number;
}

export interface AIDimensionSuggestion {
  dimension: string;
  label: string;
  score: number;
  rationale: string;
  confidence: number;
}

export interface AIScoringResponse {
  dimensions: AIDimensionSuggestion[];
  total_score: number;
  required_coach_grade: CoachGrade;
  pay_band_min: number;
  pay_band_max: number;
  overall_rationale: string;
  confidence: number;
  model_used: string;
  ai_request_id?: string;
}

export interface AICoachSuggestion {
  member_id: string;
  name: string;
  email?: string;
  grade: CoachGrade;
  total_coaching_hours?: number;
  average_feedback_rating?: number;
  match_score: number;
  rationale: string;
}

export interface AICoachSuggestionResponse {
  suggestions: AICoachSuggestion[];
  required_coach_grade: CoachGrade;
  category: ProgramCategory;
  model_used: string;
  ai_request_id?: string;
}

export interface OnboardingInfo {
  enrollment_id: string;
  program_name: string;
  cohort_name: string;
  start_date: string;
  end_date: string;
  location?: string;
  next_session?: NextSessionInfo;
  prep_materials?: any;
  dashboard_link: string;
  resources_link: string;
  sessions_link: string;
  coach_name?: string;
  total_milestones: number;
}

// --- API Functions ---
export const AcademyApi = {
  // Programs
  listPrograms: () => apiGet<Program[]>("/api/v1/academy/programs"),
  createProgram: (data: Partial<Program>) =>
    apiPost<Program>("/api/v1/academy/programs", data, { auth: true }),
  getProgram: (id: string) => apiGet<Program>(`/api/v1/academy/programs/${id}`),
  updateProgram: (id: string, data: Partial<Program>) =>
    apiPut<Program>(`/api/v1/academy/programs/${id}`, data, { auth: true }),
  deleteProgram: (id: string) =>
    apiDelete<void>(`/api/v1/academy/programs/${id}`, { auth: true }),

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
  deleteCohort: (id: string) =>
    apiDelete<void>(`/api/v1/academy/cohorts/${id}`, { auth: true }),
  listCohortsByCoach: (coachId: string) =>
    apiGet<Cohort[]>(`/api/v1/academy/cohorts/by-coach/${coachId}`),

  // Milestones
  listMilestones: (programId: string) =>
    apiGet<Milestone[]>(`/api/v1/academy/programs/${programId}/milestones`),
  createMilestone: (data: Partial<Milestone>) =>
    apiPost<Milestone>("/api/v1/academy/milestones", data, { auth: true }),

  // Enrollments
  enrollStudent: (data: {
    cohort_id?: string;
    program_id: string;
    member_id: string;
    preferences?: any;
  }) =>
    apiPost<Enrollment>("/api/v1/academy/enrollments", data, { auth: true }),

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

  getMyEnrollments: () =>
    apiGet<Enrollment[]>("/api/v1/academy/my-enrollments", { auth: true }),

  // Progress
  updateProgress: (
    enrollmentId: string,
    milestoneId: string,
    data: Partial<StudentProgress>,
  ) =>
    apiPost<StudentProgress>(
      `/api/v1/academy/progress?enrollment_id=${enrollmentId}&milestone_id=${milestoneId}`,
      data,
      { auth: true },
    ),

  getStudentProgress: (enrollmentId: string) =>
    apiGet<StudentProgress[]>(
      `/api/v1/academy/enrollments/${enrollmentId}/progress`,
    ),

  claimMilestone: (
    enrollmentId: string,
    milestoneId: string,
    data: MilestoneClaimRequest,
  ) =>
    apiPost<StudentProgress>(
      `/api/v1/academy/enrollments/${enrollmentId}/progress/${milestoneId}/claim`,
      data,
      { auth: true },
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
      { auth: true },
    ),

  /**
   * Request enrollment in a program or specific cohort.
   */
  selfEnroll: (data: {
    program_id?: string;
    cohort_id?: string;
    preferences?: any;
  }) =>
    apiPost<Enrollment>(`/api/v1/academy/enrollments/me`, data, { auth: true }),

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
    apiGet<ProgramCurriculum>(
      `/api/v1/academy/programs/${programId}/curriculum`,
    ),
  createCurriculum: (programId: string) =>
    apiPost<ProgramCurriculum>(
      `/api/v1/academy/programs/${programId}/curriculum`,
      {},
      { auth: true },
    ),

  // --- Curriculum Weeks ---
  addWeek: (curriculumId: string, data: CurriculumWeekCreate) =>
    apiPost<CurriculumWeek>(
      `/api/v1/academy/curricula/${curriculumId}/weeks`,
      data,
      { auth: true },
    ),
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
    apiPost<CurriculumLesson>(
      `/api/v1/academy/curriculum-weeks/${weekId}/lessons`,
      data,
      { auth: true },
    ),
  updateLesson: (
    lessonId: string,
    data: Partial<CurriculumLesson> & { skill_ids?: string[] },
  ) =>
    apiPut<CurriculumLesson>(
      `/api/v1/academy/curriculum-lessons/${lessonId}`,
      data,
      { auth: true },
    ),
  deleteLesson: (lessonId: string) =>
    apiDelete<void>(`/api/v1/academy/curriculum-lessons/${lessonId}`, {
      auth: true,
    }),

  // --- Reordering ---
  reorderWeeks: (curriculumId: string, weekIds: string[]) =>
    apiPut<{ message: string }>(
      `/api/v1/academy/curricula/${curriculumId}/weeks/reorder`,
      weekIds,
      { auth: true },
    ),
  reorderLessons: (weekId: string, lessonIds: string[]) =>
    apiPut<{ message: string }>(
      `/api/v1/academy/curriculum-weeks/${weekId}/lessons/reorder`,
      lessonIds,
      { auth: true },
    ),

  // --- Program Interest (Get Notified) ---
  registerProgramInterest: (programId: string) =>
    apiPost<{ message: string; registered: boolean }>(
      `/api/v1/academy/programs/${programId}/interest`,
      {},
      { auth: true },
    ),
  removeProgramInterest: (programId: string) =>
    apiDelete<{ message: string; registered: boolean }>(
      `/api/v1/academy/programs/${programId}/interest`,
      { auth: true },
    ),
  checkProgramInterest: (programId: string) =>
    apiGet<{ registered: boolean }>(
      `/api/v1/academy/programs/${programId}/interest`,
      { auth: true },
    ),

  // --- Cohort Complexity Scoring ---
  previewComplexityScore: (
    category: ProgramCategory,
    dimensionScores: number[],
  ) =>
    apiPost<ComplexityScoreCalculation>(
      `/api/v1/academy/scoring/calculate`,
      { category, dimension_scores: dimensionScores },
      { auth: true },
    ),

  getDimensionLabels: (category: ProgramCategory) =>
    apiGet<DimensionLabelsApiResponse>(
      `/api/v1/academy/scoring/dimensions/${category}`,
      { auth: true },
    ),

  getCohortComplexityScore: (cohortId: string) =>
    apiGet<CohortComplexityScoreResponse>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score`,
      { auth: true },
    ),

  createCohortComplexityScore: (
    cohortId: string,
    data: CohortComplexityScoreCreate,
  ) =>
    apiPost<CohortComplexityScoreResponse>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score`,
      data,
      { auth: true },
    ),

  updateCohortComplexityScore: (
    cohortId: string,
    data: Partial<CohortComplexityScoreCreate>,
  ) =>
    apiPut<CohortComplexityScoreResponse>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score`,
      data,
      { auth: true },
    ),

  deleteCohortComplexityScore: (cohortId: string) =>
    apiDelete<void>(`/api/v1/academy/cohorts/${cohortId}/complexity-score`, {
      auth: true,
    }),

  markComplexityScoreReviewed: (cohortId: string) =>
    apiPost<{ message: string }>(
      `/api/v1/academy/cohorts/${cohortId}/complexity-score/review`,
      {},
      { auth: true },
    ),

  getEligibleCoaches: (cohortId: string) =>
    apiGet<EligibleCoach[]>(
      `/api/v1/academy/cohorts/${cohortId}/eligible-coaches`,
      { auth: true },
    ),

  // --- AI-Assisted Scoring ---
  aiScoreCohort: (cohortId: string, data: AIScoringRequest = {}) =>
    apiPost<AIScoringResponse>(
      `/api/v1/academy/cohorts/${cohortId}/ai-score`,
      data,
      { auth: true },
    ),

  aiSuggestCoach: (cohortId: string) =>
    apiPost<AICoachSuggestionResponse>(
      `/api/v1/academy/cohorts/${cohortId}/ai-suggest-coach`,
      {},
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
    apiGet<CoachAssignment[]>(
      `/api/v1/academy/coach-assignments/cohort/${cohortId}`,
      { auth: true },
    ),

  listMyAssignments: () =>
    apiGet<CoachAssignment[]>("/api/v1/academy/coach-assignments/coach/me", {
      auth: true,
    }),

  listByCoach: (coachId: string) =>
    apiGet<CoachAssignment[]>(
      `/api/v1/academy/coach-assignments/coach/${coachId}`,
      { auth: true },
    ),

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
      { auth: true },
    ),

  listEvaluations: (assignmentId: string) =>
    apiGet<ShadowEvaluation[]>(
      `/api/v1/academy/coach-assignments/${assignmentId}/evaluations`,
      { auth: true },
    ),

  // Readiness
  getReadiness: (coachId: string, targetGrade: string = "grade_1") =>
    apiGet<CoachReadiness>(
      `/api/v1/academy/coach-assignments/readiness/${coachId}?target_grade=${targetGrade}`,
      { auth: true },
    ),
};
