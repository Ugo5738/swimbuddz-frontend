import { apiGet, apiPost } from "@/lib/api";

export type EffectiveMilestone = {
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
};

export type CohortRequirements = {
  schema_version: number;
  cohort_id: string;
  program_id: string;
  milestones: EffectiveMilestone[];
};

export type RequirementsPreview = {
  sha256: string;
  requirements: CohortRequirements;
};

export type FrozenRequirements = RequirementsPreview & {
  id: string;
  created_by_auth_id: string;
  created_at: string;
};

const base = "/api/v1/academy/admin";

export const AcademyRequirementsApi = {
  assignProgramMilestone: (
    programId: string,
    input: {
      milestone_version_id: string;
      required_for_completion: boolean;
      target_week: number | null;
    },
  ) =>
    apiPost<{ id: string }>(
      `${base}/programs/${programId}/curriculum/milestones`,
      input,
      { auth: true },
    ),

  assignCohortMilestone: (
    cohortId: string,
    input: {
      milestone_version_id: string;
      target_week: number | null;
      override_reason: string;
    },
  ) =>
    apiPost<{ id: string }>(
      `${base}/cohorts/${cohortId}/curriculum/milestones`,
      input,
      { auth: true },
    ),

  assignModuleMilestone: (
    moduleVersionId: string,
    input: {
      milestone_version_id: string;
      required_for_completion: boolean;
      order_index: number;
    },
  ) =>
    apiPost<{ id: string }>(
      `${base}/modules/${moduleVersionId}/curriculum/milestones`,
      input,
      { auth: true },
    ),

  assignProgramModule: (
    programId: string,
    input: { module_version_id: string; order_index: number },
  ) =>
    apiPost<{ id: string }>(
      `${base}/programs/${programId}/curriculum/modules`,
      input,
      { auth: true },
    ),

  preview: (cohortId: string) =>
    apiGet<RequirementsPreview>(
      `${base}/cohorts/${cohortId}/curriculum/requirements/preview`,
      { auth: true },
    ),

  frozen: (cohortId: string) =>
    apiGet<FrozenRequirements>(
      `${base}/cohorts/${cohortId}/curriculum/requirements/frozen`,
      { auth: true },
    ),

  freeze: (cohortId: string) =>
    apiPost<FrozenRequirements>(
      `${base}/cohorts/${cohortId}/curriculum/requirements/freeze`,
      {},
      { auth: true },
    ),
};
