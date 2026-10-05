import { describe, expect, it } from "vitest";
import { hasAcademyReadiness, normalizeAcademyAssessment } from "../academy-readiness";

const completed = {
  academy_skill_assessment: {},
  academy_goals: "Learn to swim",
  academy_preferred_coach_gender: "any",
  academy_lesson_preference: "group",
};

describe("Academy readiness completion", () => {
  it("accepts saved beginner answers even when every checkbox was unchecked", () => {
    expect(hasAcademyReadiness(completed)).toBe(true);
    expect(hasAcademyReadiness({ ...completed, academy_skill_assessment: normalizeAcademyAssessment({}) })).toBe(true);
  });
  it("does not mistake an unsubmitted or partial form for completion", () => {
    expect(hasAcademyReadiness(null)).toBe(false);
    expect(hasAcademyReadiness({ ...completed, academy_skill_assessment: null })).toBe(false);
    expect(hasAcademyReadiness({ ...completed, academy_goals: "  " })).toBe(false);
    expect(hasAcademyReadiness({ ...completed, academy_lesson_preference: "" })).toBe(false);
  });
  it("normalizes old drafts without changing affirmative answers", () => {
    expect(normalizeAcademyAssessment({ canFloat: true })).toEqual({
      canFloat: true, headUnderwater: false, deepWaterComfort: false, canSwim25m: false,
    });
  });
});
