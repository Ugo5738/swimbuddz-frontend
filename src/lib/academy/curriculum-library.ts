import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

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

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

export interface LinkedSkill {
  id: string;
  skill_id: string;
  name: string | null;
  category: string | null;
}

export interface LessonDrillLink {
  id: string;
  lesson_version_id: string;
  drill_version_id: string;
  drill_id: string | null;
  drill_code: string | null;
  drill_title: string | null;
  drill_version: number | null;
  primary_focal_cue: string | null;
  order_index: number;
  sets: number;
  distance_m: number | null;
  focal_cue_override: string | null;
}

export interface ModuleComposition {
  module_version_id: string;
  state: "draft" | "published";
  lessons: {
    id: string;
    lesson_version_id: string;
    code: string | null;
    title: string | null;
    version: number | null;
    order_index: number;
  }[];
  milestones: {
    id: string;
    milestone_version_id: string;
    code: string | null;
    title: string | null;
    version: number | null;
    safety_gate: boolean;
    required_for_completion: boolean;
    order_index: number;
  }[];
  quizzes: {
    id: string;
    quiz_version_id: string;
    code: string | null;
    title: string | null;
    version: number | null;
    required_for_completion: boolean;
  }[];
}

const base = "/api/v1/academy/admin/curriculum-library";

export const CurriculumLibraryApi = {
  definitions: (kind: CurriculumKind) =>
    apiGet<CurriculumDefinition[]>(`${base}/${kind}`, { auth: true }),
  createDefinition: (
    kind: CurriculumKind,
    data: { code: string; title: string; description?: string },
  ) => apiPost<CurriculumDefinition>(`${base}/${kind}`, data, { auth: true }),
  retireDefinition: (kind: CurriculumKind, id: string) =>
    apiPost<CurriculumDefinition>(`${base}/${kind}/${id}/retire`, {}, { auth: true }),
  versions: (kind: CurriculumKind, id: string) =>
    apiGet<CurriculumVersion[]>(`${base}/${kind}/${id}/versions`, { auth: true }),
  createVersion: (
    kind: CurriculumKind,
    id: string,
    content: Record<string, unknown>,
  ) =>
    apiPost<CurriculumVersion>(
      `${base}/${kind}/${id}/versions`,
      { content },
      { auth: true },
    ),
  updateDraftVersion: (
    kind: CurriculumKind,
    id: string,
    versionId: string,
    content: Record<string, unknown>,
  ) =>
    apiPatch<CurriculumVersion>(
      `${base}/${kind}/${id}/versions/${versionId}`,
      { content },
      { auth: true },
    ),
  publish: (kind: CurriculumKind, id: string, versionId: string) =>
    apiPost<CurriculumVersion>(
      `${base}/${kind}/${id}/versions/${versionId}/publish`,
      {},
      { auth: true },
    ),

  // Composition & skills
  listSkills: () => apiGet<CatalogSkill[]>(`${base}/skills`, { auth: true }),
  listLessonDrills: (lessonVersionId: string) =>
    apiGet<LessonDrillLink[]>(`${base}/lessons/${lessonVersionId}/drills`, {
      auth: true,
    }),
  attachLessonDrill: (
    lessonVersionId: string,
    input: {
      drill_version_id: string;
      order_index: number;
      sets: number;
      distance_m?: number | null;
      focal_cue_override?: string | null;
    },
  ) =>
    apiPost<{ id: string }>(`${base}/lessons/${lessonVersionId}/drills`, input, {
      auth: true,
    }),
  removeLessonDrill: (lessonVersionId: string, linkId: string) =>
    apiDelete<void>(`${base}/lessons/${lessonVersionId}/drills/${linkId}`, {
      auth: true,
    }),

  getModuleComposition: (moduleVersionId: string) =>
    apiGet<ModuleComposition>(`${base}/modules/${moduleVersionId}/composition`, {
      auth: true,
    }),
  attachModuleLesson: (
    moduleVersionId: string,
    input: { lesson_version_id: string; order_index: number },
  ) =>
    apiPost<{ id: string }>(`${base}/modules/${moduleVersionId}/lessons`, input, {
      auth: true,
    }),
  removeModuleLesson: (moduleVersionId: string, linkId: string) =>
    apiDelete<void>(`${base}/modules/${moduleVersionId}/lessons/${linkId}`, {
      auth: true,
    }),
  attachModuleQuiz: (
    moduleVersionId: string,
    input: { quiz_version_id: string; required_for_completion: boolean },
  ) =>
    apiPost<{ id: string }>(`${base}/modules/${moduleVersionId}/quizzes`, input, {
      auth: true,
    }),
  removeModuleQuiz: (moduleVersionId: string, linkId: string) =>
    apiDelete<void>(`${base}/modules/${moduleVersionId}/quizzes/${linkId}`, {
      auth: true,
    }),

  listEntitySkills: (entity: "milestones" | "drills", definitionId: string) =>
    apiGet<LinkedSkill[]>(`${base}/${entity}/${definitionId}/skills`, {
      auth: true,
    }),
  attachEntitySkill: (
    entity: "milestones" | "drills",
    definitionId: string,
    skillId: string,
  ) =>
    apiPost<{ id: string }>(
      `${base}/${entity}/${definitionId}/skills`,
      { skill_id: skillId },
      { auth: true },
    ),
  removeEntitySkill: (
    entity: "milestones" | "drills",
    definitionId: string,
    linkId: string,
  ) =>
    apiDelete<void>(`${base}/${entity}/${definitionId}/skills/${linkId}`, {
      auth: true,
    }),
};

export const starterContent: Record<CurriculumKind, Record<string, unknown>> = {
  milestone: {
    rubric_json: {
      goal: "Describe the observable pass standard",
      criteria: ["observable-pass-criterion"],
    },
    evidence_policy: "video",
    safety_gate: false,
    assessment_context_json: { validity_days: 365 },
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
    questions_json: [
      {
        id: "q1",
        prompt: "Write a safety or technique question here",
        options: ["Option A", "Option B"],
        correct_index: 0,
      },
    ],
    passing_percent: 80,
  },
  module: {
    outcomes_json: ["Describe the outcome learners will achieve"],
    completion_policy_json: { all_required_milestones: true },
  },
};
