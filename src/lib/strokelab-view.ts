import type {
  StrokeAdjudication,
  StrokeLabCoachFinding,
  StrokeLabCoachResult,
  StrokeLabComparison,
  StrokeSupport,
} from "./strokelab";

export type PrimaryCoachRead = {
  summary: string | null;
  comparison: StrokeLabComparison | null;
  findings: StrokeLabCoachFinding[];
};

export type StrokeFixMeta = {
  why: string | null;
  drill: string | null;
  drillTitle: string | null;
  primaryFocalPoint: string | null;
  safetyNote: string | null;
  academyRef: string | null;
  strokeSupport: StrokeSupport | null;
  adjudication: StrokeAdjudication | null;
};

const INTERNAL_COMPONENTS = new Set([
  "gate",
  "collate",
  "phase_segment",
  "pose_recovery",
]);

const SEVERITY_ORDER: Record<string, number> = {
  fix: 0,
  strength: 1,
  info: 2,
};

/**
 * Select the clean top-line coaching findings for the member Stroke Lab result page.
 *
 * When the chunk-engine `aggregator` ran, prefer its synthesized findings instead
 * of repeating raw per-chunk observations or internal `gate`/`collate` telemetry.
 */
export function selectPrimaryCoachRead(
  coachResult: StrokeLabCoachResult | null | undefined,
): PrimaryCoachRead {
  if (!coachResult) {
    return { summary: null, comparison: null, findings: [] };
  }

  const aggComponent = coachResult.results.find(
    (c) => c.component === "aggregator",
  );
  const rawSummary = aggComponent?.meta?.summary;
  const summary =
    typeof rawSummary === "string" && rawSummary.trim()
      ? rawSummary.trim()
      : null;

  const rawComp = coachResult.meta?.comparison;
  let comparison: StrokeLabComparison | null = null;
  if (rawComp && typeof rawComp === "object") {
    const c = rawComp as Partial<StrokeLabComparison>;
    if (
      c.comparable &&
      typeof c.headline === "string" &&
      Array.isArray(c.aspects)
    ) {
      comparison = c as StrokeLabComparison;
    }
  }

  const allUserFindings = coachResult.results
    .filter((c) => !INTERNAL_COMPONENTS.has(c.component))
    .flatMap((c) => c.findings)
    .filter(
      (f) =>
        f.available && ["fix", "strength", "info"].includes(f.severity),
    );

  const hasAggregatorFindings = allUserFindings.some(
    (f) => f.component === "aggregator",
  );
  const primary = hasAggregatorFindings
    ? allUserFindings.filter((f) => f.component === "aggregator")
    : allUserFindings;

  const findings = [...primary].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    return sa - sb;
  });

  return { summary, comparison, findings };
}

export function extractStrokeFixMeta(
  finding: StrokeLabCoachFinding,
): StrokeFixMeta {
  const extra = finding.extra ?? {};
  const str = (key: string): string | null =>
    typeof extra[key] === "string" && (extra[key] as string).trim()
      ? (extra[key] as string).trim()
      : null;

  let strokeSupport: StrokeSupport | null = null;
  if (extra.stroke_support && typeof extra.stroke_support === "object") {
    const s = extra.stroke_support as Partial<StrokeSupport>;
    if (typeof s.count === "number" && typeof s.total_chunks === "number") {
      strokeSupport = {
        count: s.count,
        total_chunks: s.total_chunks,
        consistent: Boolean(s.consistent),
        single_stroke_only: Boolean(s.single_stroke_only),
      };
    }
  }

  let adjudication: StrokeAdjudication | null = null;
  if (extra.adjudication && typeof extra.adjudication === "object") {
    const a = extra.adjudication as Partial<StrokeAdjudication>;
    if (typeof a.status === "string" && a.status) {
      adjudication = {
        status: a.status,
        model: typeof a.model === "string" ? a.model : undefined,
        confidence: typeof a.confidence === "number" ? a.confidence : undefined,
        reason: typeof a.reason === "string" ? a.reason : undefined,
      };
    }
  }

  return {
    why: str("why_it_matters"),
    drill: str("drill"),
    drillTitle: str("drill_title"),
    primaryFocalPoint: str("primary_focal_point"),
    safetyNote: str("safety_note"),
    academyRef: str("academy_ref"),
    strokeSupport,
    adjudication,
  };
}
