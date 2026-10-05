export const EMPTY_ACADEMY_ASSESSMENT = {
  canFloat: false,
  headUnderwater: false,
  deepWaterComfort: false,
  canSwim25m: false,
};

export function normalizeAcademyAssessment(assessment?: Record<string, boolean> | null) {
  return { ...EMPTY_ACADEMY_ASSESSMENT, ...assessment };
}

export function hasAcademyReadiness(membership?: {
  academy_skill_assessment?: Record<string, boolean> | null;
  academy_goals?: string | null;
  academy_preferred_coach_gender?: string | null;
  academy_lesson_preference?: string | null;
} | null): boolean {
  // An empty assessment is the legacy representation of all unchecked boxes.
  // A beginner answering "no" to every skill has still completed readiness.
  return Boolean(
    membership?.academy_skill_assessment &&
      membership.academy_goals?.trim() &&
      membership.academy_preferred_coach_gender?.trim() &&
      membership.academy_lesson_preference?.trim()
  );
}
