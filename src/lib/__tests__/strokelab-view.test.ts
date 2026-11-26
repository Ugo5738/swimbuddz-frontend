import { describe, expect, it } from "vitest";
import type { StrokeLabCoachFinding, StrokeLabCoachResult } from "../strokelab";
import { extractStrokeFixMeta, selectPrimaryCoachRead } from "../strokelab-view";

function makeFinding(
  overrides: Partial<StrokeLabCoachFinding> = {},
): StrokeLabCoachFinding {
  return {
    component: "aggregator",
    observation: "Your head lifts before breathing.",
    severity: "fix",
    confidence: 0.85,
    available: true,
    evidence_frames: [{ index: 2, timestamp_s: 1.4 }],
    extra: {},
    ...overrides,
  };
}

describe("selectPrimaryCoachRead", () => {
  it("returns empty defaults when coachResult is absent", () => {
    expect(selectPrimaryCoachRead(null)).toEqual({
      summary: null,
      comparison: null,
      findings: [],
    });
  });

  it("prefers aggregator findings over raw chunk_coach and strips internal components", () => {
    const coachResult: StrokeLabCoachResult = {
      input_profile: "side-on",
      gate_tier: "clean",
      refused: false,
      meta: {
        comparison: {
          previous_job_id: "prev-123",
          previous_completed_at: "2026-11-20T10:00:00Z",
          comparable: true,
          improved_count: 1,
          still_working_count: 1,
          maintained_count: 0,
          regressed_count: 0,
          headline: "1 area improved since your last swim.",
          caveat: null,
          aspects: [
            {
              aspect: "body_line",
              label: "Body line",
              status: "improved",
              previous_severity: "fix",
              current_severity: "strength",
              previous_verdict: "hips_low",
              current_verdict: "level",
              summary: "Body line improved from hips_low to level.",
            },
          ],
        },
      },
      results: [
        {
          component: "gate",
          error: null,
          findings: [
            makeFinding({
              component: "gate",
              severity: "info",
              observation: "Gate telemetry",
            }),
          ],
        },
        {
          component: "collate",
          error: null,
          findings: [
            makeFinding({
              component: "collate",
              severity: "info",
              observation: "Collate telemetry",
            }),
          ],
        },
        {
          component: "chunk_coach",
          error: null,
          findings: [
            makeFinding({
              component: "chunk_coach",
              severity: "fix",
              observation: "Raw chunk observation #1",
            }),
          ],
        },
        {
          component: "aggregator",
          error: null,
          meta: {
            summary: "Steady balance overall; focus on keeping one goggle in the water when breathing.",
          },
          findings: [
            makeFinding({
              component: "aggregator",
              severity: "strength",
              observation: "Calm, horizontal body line between breaths.",
            }),
            makeFinding({
              component: "aggregator",
              severity: "fix",
              observation: "Head lifts slightly right before turning to breathe.",
            }),
            makeFinding({
              component: "aggregator",
              severity: "unavailable",
              available: false,
              observation: "Should be ignored",
            }),
          ],
        },
      ],
    };

    const read = selectPrimaryCoachRead(coachResult);
    expect(read.summary).toBe(
      "Steady balance overall; focus on keeping one goggle in the water when breathing.",
    );
    expect(read.comparison?.previous_job_id).toBe("prev-123");
    expect(read.comparison?.improved_count).toBe(1);
    expect(read.findings).toHaveLength(2);
    // Fixes come before strengths
    expect(read.findings[0].severity).toBe("fix");
    expect(read.findings[1].severity).toBe("strength");
    expect(read.findings.every((f) => f.component === "aggregator")).toBe(true);
  });

  it("falls back to non-internal findings when aggregator did not run (legacy holistic)", () => {
    const coachResult: StrokeLabCoachResult = {
      input_profile: "side-on",
      gate_tier: "clean",
      refused: false,
      results: [
        {
          component: "gate",
          error: null,
          findings: [
            makeFinding({
              component: "gate",
              severity: "info",
              observation: "Internal gate note",
            }),
          ],
        },
        {
          component: "holistic_coach",
          error: null,
          findings: [
            makeFinding({
              component: "holistic_coach",
              severity: "info",
              observation: "General note",
            }),
            makeFinding({
              component: "holistic_coach",
              severity: "fix",
              observation: "Drop the lead arm slightly less on breath.",
            }),
          ],
        },
      ],
    };

    const read = selectPrimaryCoachRead(coachResult);
    expect(read.summary).toBeNull();
    expect(read.comparison).toBeNull();
    expect(read.findings.map((f) => f.severity)).toEqual(["fix", "info"]);
  });

  it("ignores non-comparable longitudinal comparison payloads", () => {
    const coachResult: StrokeLabCoachResult = {
      input_profile: "side-on",
      gate_tier: "clean",
      refused: false,
      meta: {
        comparison: {
          previous_job_id: "prev-1",
          comparable: false,
          headline: "Not comparable",
          aspects: [],
        },
      },
      results: [],
    };
    expect(selectPrimaryCoachRead(coachResult).comparison).toBeNull();
  });
});

describe("extractStrokeFixMeta", () => {
  it("extracts curated TI drill metadata, stroke support, and second-opinion adjudication", () => {
    const finding = makeFinding({
      extra: {
        why_it_matters: "Lifting your head drops your hips and increases drag.",
        drill: "Roll onto your side with one goggle resting in the water.",
        drill_title: "Sweet Spot / Side-Balance Breathing",
        primary_focal_point: "Keep one goggle in the water while breathing",
        safety_note: "Stop and stand up if water enters your mouth; practice in shallow water first.",
        academy_ref: "F3-balance-breathing",
        stroke_support: {
          count: 3,
          total_chunks: 4,
          consistent: true,
          single_stroke_only: false,
        },
        adjudication: {
          status: "confirmed",
          model: "gpt-5.4-mini",
          confidence: 0.9,
          reason: "Head clearly rises above the waterline on breath turns.",
        },
      },
    });

    const meta = extractStrokeFixMeta(finding);
    expect(meta.why).toBe("Lifting your head drops your hips and increases drag.");
    expect(meta.drillTitle).toBe("Sweet Spot / Side-Balance Breathing");
    expect(meta.primaryFocalPoint).toBe("Keep one goggle in the water while breathing");
    expect(meta.safetyNote).toContain("shallow water");
    expect(meta.academyRef).toBe("F3-balance-breathing");
    expect(meta.strokeSupport).toEqual({
      count: 3,
      total_chunks: 4,
      consistent: true,
      single_stroke_only: false,
    });
    expect(meta.adjudication).toEqual({
      status: "confirmed",
      model: "gpt-5.4-mini",
      confidence: 0.9,
      reason: "Head clearly rises above the waterline on breath turns.",
    });
  });

  it("handles missing or malformed extra metadata gracefully", () => {
    const meta = extractStrokeFixMeta(
      makeFinding({
        extra: {
          drill: "   ",
          stroke_support: { count: "bad" },
          adjudication: {},
        },
      }),
    );
    expect(meta.why).toBeNull();
    expect(meta.drill).toBeNull();
    expect(meta.drillTitle).toBeNull();
    expect(meta.strokeSupport).toBeNull();
    expect(meta.adjudication).toBeNull();
  });
});
