import { apiGet } from "@/lib/api";

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
  milestone_definition_id: string;
  milestone_version_id: string;
  code: string | null;
  title: string;
  source_enrollment_id: string;
  source_review_event_id: string;
  evidence_media_id: string;
  verified_at: string;
  expires_at: string | null;
  status: CompetencyStatus;
  status_reason: string | null;
  criteria_passed: string[];
}

export interface CompetencyPassport {
  member_auth_id: string;
  competencies: CompetencySummary[];
  verifications: CompetencyEvidenceRecord[];
}

export const CompetencyPassportApi = {
  me: () =>
    apiGet<CompetencyPassport>("/api/v1/academy/competencies/me", { auth: true }),
};
