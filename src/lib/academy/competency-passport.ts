import { apiGet, apiPatch, apiPost } from "@/lib/api";

export type CompetencyStatus = "verified" | "expired" | "recheck_required" | "revoked";
export type VerificationSourceType =
  | "legacy_promotion"
  | "cohort_v2"
  | "diagnostic_assessment";
export type DrillAssignmentStatus = "assigned" | "practiced" | "mastered" | "archived";

export interface CompetencySummary {
  milestone_definition_id: string;
  code: string | null;
  title: string;
  status: CompetencyStatus;
  supporting_verification_ids: string[];
}

export interface CompetencyEvidenceRecord {
  id: string;
  member_id?: string;
  member_auth_id?: string;
  source_type?: VerificationSourceType;
  assessor_role?: "coach" | "admin";
  milestone_definition_id: string;
  milestone_version_id: string;
  code: string | null;
  title: string;
  source_enrollment_id: string | null;
  source_progress_id?: string | null;
  source_review_event_id: string | null;
  evidence_media_id: string;
  verified_by_auth_id?: string;
  review_notes?: string;
  verified_at: string;
  expires_at: string | null;
  status: CompetencyStatus;
  status_reason: string | null;
  revoked_at?: string | null;
  revoked_by_auth_id?: string | null;
  criteria_passed: string[];
}

export interface CompetencyPassport {
  member_auth_id: string;
  competencies: CompetencySummary[];
  verifications: CompetencyEvidenceRecord[];
}

export interface LegacyPromotionCandidate {
  source_progress_id: string;
  enrollment_id: string;
  cohort_id: string | null;
  program_id: string;
  member_id: string;
  member_auth_id: string | null;
  legacy_milestone_id: string;
  legacy_milestone_name: string;
  achieved_at: string | null;
  reviewed_at: string | null;
  evidence_media_id: string | null;
  coach_notes: string | null;
  has_frozen_snapshot: boolean;
  has_human_approved_review: boolean;
  has_claim_provenance: boolean;
  already_credited: boolean;
  existing_verification_id: string | null;
  eligible: boolean;
  eligibility_blockers: string[];
}

export interface PromoteLegacyInput {
  source_progress_id: string;
  milestone_version_id: string;
  criteria_passed: string[];
  equivalence_reason: string;
}

export interface CohortV2AssessmentInput {
  enrollment_id: string;
  milestone_version_id: string;
  evidence_media_id: string;
  evidence_uploaded_by?: "assessor" | "member";
  criteria_passed: string[];
  assessment_notes: string;
}

export interface DiagnosticAssessmentInput {
  member_id: string;
  member_auth_id?: string;
  milestone_version_id: string;
  evidence_media_id: string;
  evidence_uploaded_by?: "assessor" | "member";
  criteria_passed: string[];
  assessment_notes: string;
  clinic_label?: string;
}

export interface PublishedCoachingDrill {
  drill_id: string;
  drill_version_id: string;
  code: string;
  title: string;
  description: string | null;
  version: number;
  primary_focal_cue: string;
  steps_json: string[];
  requires_supervision: boolean;
}

export interface RemedialDrillSuggestion {
  drill_id: string;
  drill_version_id: string;
  code: string;
  title: string;
  version: number;
  primary_focal_cue: string;
  steps_json: string[];
  requires_supervision: boolean;
  coach_tip: string | null;
  priority_order: number;
}

export interface StudentDrillAssignment {
  id: string;
  member_id: string;
  member_auth_id: string;
  enrollment_id: string | null;
  drill_version_id: string;
  drill_id: string | null;
  drill_code: string | null;
  drill_title: string;
  drill_version: number | null;
  primary_focal_cue: string | null;
  steps_json: string[];
  requires_supervision: boolean;
  milestone_definition_id: string | null;
  milestone_code: string | null;
  milestone_title: string | null;
  assigned_by_auth_id: string;
  assigned_by_role: "coach" | "admin" | "strokelab_ai";
  focal_cue_note: string | null;
  sets: number;
  distance_m: number | null;
  status: DrillAssignmentStatus;
  practiced_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface V2PlanMilestone {
  definition_id: string;
  code: string;
  title: string;
  version_id: string;
  version_number: number;
  rubric_snapshot: Record<string, unknown>;
  evidence_policy: "video" | "time_trial" | "observation";
  assessment_context_snapshot: Record<string, unknown>;
  safety_gate: boolean;
  required_for_completion: boolean;
  target_week: number | null;
  sources: string[];
  passport_status: CompetencyStatus | "unverified";
  prior_credit: boolean;
  supporting_verification_id: string | null;
  verified_source_type: VerificationSourceType | null;
  verified_at: string | null;
  expires_at: string | null;
  remedial_drills: RemedialDrillSuggestion[];
}

export interface EnrollmentV2LearningPlan {
  enrollment_id: string;
  cohort_id: string | null;
  has_frozen_requirements: boolean;
  snapshot_sha256: string | null;
  milestones: V2PlanMilestone[];
  drill_assignments: StudentDrillAssignment[];
}

const base = "/api/v1/academy/competencies";

function buildQuery(params: Record<string, string | boolean | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const CompetencyPassportApi = {
  me: () => apiGet<CompetencyPassport>(`${base}/me`, { auth: true }),

  adminMemberPassport: (memberAuthId: string) =>
    apiGet<CompetencyPassport>(`${base}/admin/members/${encodeURIComponent(memberAuthId)}`, {
      auth: true,
    }),

  adminLegacyCandidates: (
    params: {
      cohort_id?: string;
      member_auth_id?: string;
      include_credited?: boolean;
      limit?: number;
    } = {},
  ) =>
    apiGet<LegacyPromotionCandidate[]>(
      `${base}/admin/legacy-candidates${buildQuery(params)}`,
      { auth: true },
    ),

  adminVerifications: (
    params: {
      cohort_id?: string;
      member_auth_id?: string;
      limit?: number;
    } = {},
  ) =>
    apiGet<CompetencyEvidenceRecord[]>(
      `${base}/admin/verifications${buildQuery(params)}`,
      { auth: true },
    ),

  promoteLegacy: (input: PromoteLegacyInput) =>
    apiPost<CompetencyEvidenceRecord>(`${base}/admin/verify-legacy`, input, {
      auth: true,
    }),

  assessCohort: (input: CohortV2AssessmentInput) =>
    apiPost<CompetencyEvidenceRecord>(`${base}/coach/assess-cohort`, input, {
      auth: true,
    }),

  assessDiagnostic: (input: DiagnosticAssessmentInput) =>
    apiPost<CompetencyEvidenceRecord>(`${base}/admin/assess-diagnostic`, input, {
      auth: true,
    }),

  revoke: (verificationId: string, reason: string) =>
    apiPost<{ verification_id: string; revocation_id: string; status: "revoked" }>(
      `${base}/admin/${verificationId}/revoke`,
      { reason },
      { auth: true },
    ),

  enrollmentV2Plan: (enrollmentId: string) =>
    apiGet<EnrollmentV2LearningPlan>(`${base}/enrollments/${enrollmentId}/v2-plan`, {
      auth: true,
    }),

  listPublishedDrills: () =>
    apiGet<PublishedCoachingDrill[]>(`${base}/drills/published`, { auth: true }),

  myDrills: (includeArchived = false) =>
    apiGet<StudentDrillAssignment[]>(
      `${base}/me/drills${buildQuery({ include_archived: includeArchived || undefined })}`,
      { auth: true },
    ),

  markMyDrillPracticed: (assignmentId: string) =>
    apiPost<StudentDrillAssignment>(
      `${base}/me/drills/${assignmentId}/practiced`,
      {},
      { auth: true },
    ),

  assignDrill: (input: {
    drill_version_id: string;
    enrollment_id?: string;
    member_id?: string;
    member_auth_id?: string;
    milestone_definition_id?: string;
    focal_cue_note?: string;
    sets?: number;
    distance_m?: number | null;
  }) =>
    apiPost<StudentDrillAssignment>(`${base}/coach/drills/assign`, input, {
      auth: true,
    }),

  updateDrillStatus: (
    assignmentId: string,
    input: { status: DrillAssignmentStatus; focal_cue_note?: string },
  ) =>
    apiPatch<StudentDrillAssignment>(
      `${base}/coach/drills/${assignmentId}/status`,
      input,
      { auth: true },
    ),
};

export const SOURCE_TYPE_LABELS: Record<VerificationSourceType, string> = {
  cohort_v2: "Cohort Assessment",
  diagnostic_assessment: "Diagnostic Clinic",
  legacy_promotion: "Verified Legacy Record",
};

export function extractRubricCriteriaCodes(
  rubric: Record<string, unknown> | null | undefined,
): string[] {
  const raw = rubric?.criteria;
  if (!Array.isArray(raw)) return [];
  const codes: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      codes.push(item.trim());
    } else if (
      item &&
      typeof item === "object" &&
      "code" in item &&
      typeof (item as { code?: unknown }).code === "string" &&
      (item as { code: string }).code.trim()
    ) {
      codes.push((item as { code: string }).code.trim());
    }
  }
  return codes;
}
