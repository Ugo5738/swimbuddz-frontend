import { apiGet, apiPost } from "@/lib/api";

export type CompetencyStatus = "verified" | "expired" | "recheck_required" | "revoked";

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
  milestone_definition_id: string;
  milestone_version_id: string;
  code: string | null;
  title: string;
  source_enrollment_id: string;
  source_progress_id?: string;
  source_review_event_id: string;
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

  adminLegacyCandidates: (params: {
    cohort_id?: string;
    member_auth_id?: string;
    include_credited?: boolean;
    limit?: number;
  } = {}) =>
    apiGet<LegacyPromotionCandidate[]>(
      `${base}/admin/legacy-candidates${buildQuery(params)}`,
      { auth: true },
    ),

  adminVerifications: (params: {
    cohort_id?: string;
    member_auth_id?: string;
    limit?: number;
  } = {}) =>
    apiGet<CompetencyEvidenceRecord[]>(
      `${base}/admin/verifications${buildQuery(params)}`,
      { auth: true },
    ),

  promoteLegacy: (input: PromoteLegacyInput) =>
    apiPost<CompetencyEvidenceRecord>(`${base}/admin/verify-legacy`, input, {
      auth: true,
    }),

  revoke: (verificationId: string, reason: string) =>
    apiPost<{ verification_id: string; revocation_id: string; status: "revoked" }>(
      `${base}/admin/${verificationId}/revoke`,
      { reason },
      { auth: true },
    ),
};

export function extractRubricCriteriaCodes(rubric: Record<string, unknown> | null | undefined): string[] {
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
