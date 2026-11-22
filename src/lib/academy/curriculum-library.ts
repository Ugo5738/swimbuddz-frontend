import { apiGet, apiPost } from "@/lib/api";

export type CurriculumKind = "milestone" | "drill" | "lesson" | "quiz" | "module";

export const curriculumKinds: { id: CurriculumKind; title: string; description: string }[] = [
  { id: "milestone", title: "Milestones", description: "Evidence-backed measurable outcomes" },
  { id: "drill", title: "Drills", description: "Exercises and coaching cues" },
  { id: "lesson", title: "Lessons", description: "Reusable teaching plans" },
  { id: "quiz", title: "Quizzes", description: "Theory and safety checks" },
  { id: "module", title: "Modules", description: "Stackable learning units" },
];

export interface CurriculumDefinition {
  id: string;
  code: string;
  title: string;
  description: string | null;
  is_retired: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurriculumVersion {
  id: string;
  version: number;
  state: "draft" | "published";
  published_at: string | null;
  created_at: string;
  content: Record<string, unknown>;
}

const base = "/api/v1/academy/admin/curriculum-library";

export const CurriculumLibraryApi = {
  definitions: (kind: CurriculumKind) =>
    apiGet<CurriculumDefinition[]>(`${base}/${kind}`, { auth: true }),
  createDefinition: (kind: CurriculumKind, data: { code: string; title: string; description?: string }) =>
    apiPost<CurriculumDefinition>(`${base}/${kind}`, data, { auth: true }),
  versions: (kind: CurriculumKind, id: string) =>
    apiGet<CurriculumVersion[]>(`${base}/${kind}/${id}/versions`, { auth: true }),
  createVersion: (kind: CurriculumKind, id: string, content: Record<string, unknown>) =>
    apiPost<CurriculumVersion>(`${base}/${kind}/${id}/versions`, { content }, { auth: true }),
  publish: (kind: CurriculumKind, id: string, versionId: string) =>
    apiPost<CurriculumVersion>(`${base}/${kind}/${id}/versions/${versionId}/publish`, {}, { auth: true }),
};

export const starterContent: Record<CurriculumKind, Record<string, unknown>> = {
  milestone: {
    rubric_json: { goal: "Describe the observable pass standard", criteria: [] },
    evidence_policy: "video",
    safety_gate: false,
    assessment_context_json: {},
  },
  drill: {
    steps_json: ["Describe how to perform the drill"],
    primary_focal_cue: "One coaching cue",
    requires_supervision: true,
    safety_json: {},
  },
  lesson: {
    duration_minutes: 60,
    blocks_json: [{ duration_minutes: 10, activity: "Warmup" }],
    safety_json: {},
  },
  quiz: {
    questions_json: [{ id: "q1", prompt: "Write a question here" }],
    passing_percent: 90,
  },
  module: {
    outcomes_json: ["Describe the outcome learners will achieve"],
    completion_policy_json: {},
  },
};
