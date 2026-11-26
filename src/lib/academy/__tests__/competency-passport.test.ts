import { describe, expect, it } from "vitest";

import {
  CLUB_ADVISORY_SIGNAL_LABELS,
  PARITY_STATUS_LABELS,
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

  it("maps every Phase 5A graduation parity status and Club advisory signal to a clear label", () => {
    expect(PARITY_STATUS_LABELS.aligned_eligible).toBe("Aligned — Eligible");
    expect(PARITY_STATUS_LABELS.aligned_ineligible).toBe("Aligned — In Progress");
    expect(PARITY_STATUS_LABELS.legacy_only_eligible).toBe("Legacy-Only Eligible");
    expect(PARITY_STATUS_LABELS.v2_only_eligible).toBe("V2-Only Eligible");
    expect(PARITY_STATUS_LABELS.no_frozen_snapshot).toBe("No Frozen Snapshot");
    expect(PARITY_STATUS_LABELS.snapshot_integrity_error).toBe(
      "Snapshot Integrity Error",
    );

    expect(CLUB_ADVISORY_SIGNAL_LABELS.meets_club_safety_profile).toContain("Advisory");
    expect(CLUB_ADVISORY_SIGNAL_LABELS.partial_evidence).toContain("Partial");
    expect(CLUB_ADVISORY_SIGNAL_LABELS.renewal_or_recheck_needed).toContain("Renewal");
    expect(CLUB_ADVISORY_SIGNAL_LABELS.no_v2_evidence).toContain("No Academy V2");
  });
});
