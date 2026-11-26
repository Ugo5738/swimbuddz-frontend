import { describe, expect, it } from "vitest";

import {
  SOURCE_TYPE_LABELS,
  extractRubricCriteriaCodes,
} from "@/lib/academy/competency-passport";
import { starterContent } from "@/lib/academy/curriculum-library";

describe("Academy V2 competency passport helpers & starter contracts", () => {
  it("extracts criteria codes from strings and objects while skipping invalid entries", () => {
    expect(
      extractRubricCriteriaCodes({
        criteria: [
          "continuous-25m",
          { code: "side-breathing", label: "Side breathing" },
          "",
          { label: "missing code" },
          "  calm-finish  ",
        ],
      }),
    ).toEqual(["continuous-25m", "side-breathing", "calm-finish"]);
  });

  it("returns empty list when rubric has no criteria array", () => {
    expect(extractRubricCriteriaCodes(null)).toEqual([]);
    expect(extractRubricCriteriaCodes({})).toEqual([]);
  });

  it("starter milestone template satisfies publish-time rubric and validity contracts", () => {
    const milestoneStarter = starterContent.milestone;
    const rubric = milestoneStarter.rubric_json as Record<string, unknown>;
    const context = milestoneStarter.assessment_context_json as Record<string, unknown>;
    const criteria = extractRubricCriteriaCodes(rubric);

    expect(criteria.length).toBeGreaterThan(0);
    expect(typeof context.validity_days).toBe("number");
    expect((context.validity_days as number) > 0).toBe(true);
  });

  it("maps every V2 verification provenance source_type to a human-readable label", () => {
    expect(SOURCE_TYPE_LABELS.cohort_v2).toBe("Cohort Assessment");
    expect(SOURCE_TYPE_LABELS.diagnostic_assessment).toBe("Diagnostic Clinic");
    expect(SOURCE_TYPE_LABELS.legacy_promotion).toBe("Verified Legacy Record");
  });
});
