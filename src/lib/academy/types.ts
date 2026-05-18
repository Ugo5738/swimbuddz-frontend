// Type, enum, and interface declarations for the academy module.
// Extracted from `src/lib/academy.ts` during the file-size sweep.
// Originally lived alongside the AcademyApi HTTP client in one 994-line
// file; split into two for navigability while preserving every named
// export through the `index.ts` barrel.

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
  DROPOUT_PENDING = "dropout_pending",
}

export enum InstallmentStatus {
  PENDING = "pending",
  PAID = "paid",
  MISSED = "missed",
  WAIVED = "waived",
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

export interface PublicAcademyStats {
  cohorts_enrolling: number;
  cohorts_active: number;
  total_seats_open: number;
  graduates_all_time: number;
  graduates_last_90_days: number;
  completion_rate: number | null;
}

export interface Program {
  id: string;
  name: string;
  slug?: string | null;
  description?: string;
  cover_image_url?: string;
  cover_image_media_id?: string | null;
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

/**
 * A single ride-area entry stored on a cohort's `default_ride_configs`.
 * When sessions are generated for this cohort, each entry is materialised
 * as a SessionRideConfig on the new session via the transport service.
 */
export interface CohortRideConfigEntry {
  ride_area_id: string;
  /** Cost in naira (major unit). Backend converts to kobo on store. */
  cost: number;
  capacity: number;
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
  /** Preferred: links cohort to a pool in the pools registry (pools_service). */
  pool_id?: string | null;
  // Coach
  coach_id?: string | null;
  // Pricing
  price_override?: number;
  // ── Session defaults (applied to every generated session) ──
  /** Default pool fee in naira. Used to populate pool_fee on each session. */
  default_pool_fee?: number | null;
  /** Default ride-area configurations copied to each generated session. */
  default_ride_configs?: CohortRideConfigEntry[] | null;
  // Status
  status: CohortStatus;
  allow_mid_entry?: boolean;
  mid_entry_cutoff_week?: number;
  require_approval?: boolean; // If true, enrollment needs admin approval even after payment
  admin_dropout_approval?: boolean; // If true, missed-installment dropout requires admin confirmation
  notes_internal?: string;
  // ── Installment billing ──────────────────────────────────────────────────
  /** Whether members can choose to pay in installments at checkout. */
  installment_plan_enabled?: boolean;
  /** Override for auto-computed installment count (duration_weeks / 4). */
  installment_count?: number | null;
  /** Override for first installment amount in ₦. If null, auto-split evenly. */
  installment_deposit_amount?: number | null;
  // Relations
  program?: Program;
  /** Live enrolment count (ENROLLED + PENDING_APPROVAL). Only populated by
   *  list endpoints that annotate it: /cohorts/open and /cohorts/enrollable. */
  enrolled_count?: number;
  /** True when enrolled_count has reached capacity; new enrolments would land
   *  on the waitlist. Only populated by the list endpoints above. */
  is_full?: boolean;
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

export interface CohortTimelineShiftRequest {
  new_start_date: string;
  new_end_date: string;
  expected_updated_at?: string;
  idempotency_key?: string;
  reason?: string;
  shift_sessions?: boolean;
  shift_installments?: boolean;
  reset_start_reminders?: boolean;
  notify_members?: boolean;
  set_status_to_open_if_future?: boolean;
}

export interface CohortTimelineSessionImpact {
  session_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  new_starts_at: string;
  new_ends_at: string;
  will_shift: boolean;
}

export interface CohortTimelineShiftPreview {
  cohort_id: string;
  old_start_date: string;
  old_end_date: string;
  new_start_date: string;
  new_end_date: string;
  delta_seconds: number;
  already_applied: boolean;
  sessions_total: number;
  sessions_shiftable: number;
  sessions_blocked: number;
  pending_installments: number;
  reminder_resets_possible: number;
  session_impacts: CohortTimelineSessionImpact[];
}

export interface CohortTimelineShiftResult {
  cohort_id: string;
  old_start_date: string;
  old_end_date: string;
  new_start_date: string;
  new_end_date: string;
  delta_seconds: number;
  already_applied: boolean;
  sessions_shifted: number;
  sessions_skipped: number;
  pending_installments_shifted: number;
  reminder_resets_applied: number;
  notification_attempts: number;
  notification_sent: number;
  warnings: string[];
}

export interface CohortTimelineShiftLog {
  id: string;
  cohort_id: string;
  idempotency_key?: string;
  actor_auth_id?: string;
  actor_member_id?: string;
  reason?: string;
  old_start_date: string;
  old_end_date: string;
  new_start_date: string;
  new_end_date: string;
  delta_seconds: number;
  options_json: Record<string, unknown>;
  results_json: Record<string, unknown>;
  warnings: string[];
  created_at: string;
}

export interface EnrollmentInstallment {
  id: string;
  installment_number: number;
  /** Amount in kobo (minor NGN unit). */
  amount: number;
  due_at: string;
  status: InstallmentStatus;
  paid_at?: string | null;
  payment_reference?: string | null;
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
  // Installment tracking
  total_installments?: number;
  paid_installments_count?: number;
  missed_installments_count?: number;
  access_suspended?: boolean;
  // Enrollment tracking
  enrolled_at?: string;
  source?: EnrollmentSource;
  created_at: string;
  updated_at: string;
  // Relations
  cohort?: Cohort;
  program?: Program;
  installments?: EnrollmentInstallment[];
}

export type WithdrawWindow = "before_start" | "mid_entry_window" | "after_cutoff";

export interface WithdrawEnrollmentResponse {
  enrollment_id: string;
  status: string;
  window: WithdrawWindow;
  refund_kobo: number;
  refund_percent: number;
  paid_kobo: number;
  waived_installment_count: number;
  payment_references: string[];
  refund_note: string;
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

/** A coach's request to extend a cohort's end date (admin approves/rejects).
 * Mirrors backend `CohortExtensionRequestResponse`. */
export interface CohortExtensionRequest {
  id: string;
  cohort_id: string;
  coach_id: string;
  weeks_requested: number;
  reason: string;
  current_end_date: string;
  proposed_end_date: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_id?: string | null;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

