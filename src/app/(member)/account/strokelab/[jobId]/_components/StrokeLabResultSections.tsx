"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CompetencyPassportApi } from "@/lib/academy/competency-passport";
import type {
  AnalysisResultPayload,
  Observation,
  StrokeLabComparison,
} from "@/lib/strokelab";
import {
  type PrimaryCoachRead,
  extractStrokeFixMeta,
} from "@/lib/strokelab-view";
import {
  AlertTriangle,
  ArrowUpRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Lightbulb,
  Play,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const COMPARISON_STATUS_META: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "info" | "danger" | "default";
  }
> = {
  improved: { label: "Improved", variant: "success" },
  maintained: { label: "Maintained", variant: "info" },
  still_working: { label: "Still working", variant: "warning" },
  regressed: { label: "Needs attention", variant: "danger" },
  newly_observed: { label: "New observation", variant: "default" },
};

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function ProgressSinceLastSwimCard({
  comparison,
}: {
  comparison: StrokeLabComparison;
}) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-700" />
          <h2 className="text-base font-semibold text-slate-900">
            Progress since your last swim
          </h2>
        </div>
        {comparison.previous_job_id ? (
          <Link
            href={`/account/strokelab/${comparison.previous_job_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
          >
            View previous swim
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      <p className="mt-2 text-sm font-medium text-slate-800">
        {comparison.headline}
      </p>

      {comparison.caveat ? (
        <p className="mt-1 text-xs text-amber-700">{comparison.caveat}</p>
      ) : null}

      {comparison.aspects.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {comparison.aspects.map((item) => {
            const statusMeta = COMPARISON_STATUS_META[item.status] ?? {
              label: item.status.replace(/_/g, " "),
              variant: "default" as const,
            };
            return (
              <li
                key={item.aspect}
                className="flex flex-wrap items-start justify-between gap-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">
                    {item.label}:
                  </span>{" "}
                  <span className="text-slate-600">{item.summary}</span>
                </div>
                <Badge
                  variant={statusMeta.variant}
                  className="shrink-0 px-2 py-0.5 text-[11px]"
                >
                  {statusMeta.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

export function CoachReviewCard({
  result,
  coachRead,
  jobId,
  onJump,
}: {
  result: AnalysisResultPayload;
  coachRead: PrimaryCoachRead;
  jobId?: string;
  onJump: (seconds: number) => void;
}) {
  const [savingRef, setSavingRef] = useState<string | null>(null);
  const [savedRefs, setSavedRefs] = useState<Record<string, boolean>>({});

  if (!result.coach_result) return null;

  const saveDrillToAcademy = async (
    academyRef: string,
    focalPoint: string | null,
  ) => {
    setSavingRef(academyRef);
    try {
      const saved = await CompetencyPassportApi.saveStrokeLabDrill({
        academy_ref: academyRef,
        strokelab_job_id: jobId,
        focal_cue_note: focalPoint ?? undefined,
      });
      setSavedRefs((prev) => ({ ...prev, [academyRef]: true }));
      toast.success(
        saved.already_assigned
          ? `${saved.drill_title} is already in your Academy drills.`
          : `Added "${saved.drill_title}" to your Academy practice drills.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not save this drill to your Academy practice list right now.",
      );
    } finally {
      setSavingRef(null);
    }
  };

  return (
    <Card className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">
        Your freestyle technique review
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Automated observations based on the visible footage, not a measured
        stroke rate or a substitute for your coach.
      </p>
      {coachRead.summary ? (
        <div className="mb-4 rounded-lg border border-cyan-100 bg-cyan-50/60 p-3.5 text-sm text-slate-800">
          {coachRead.summary}
        </div>
      ) : null}
      {result.coach_result.gate_tier === "borderline" ? (
        <Alert variant="info" className="mb-4">
          The camera angle limits what Stroke Lab can verify. For more reliable
          feedback, record from the side.
        </Alert>
      ) : null}
      {coachRead.findings.length === 0 ? (
        <p className="text-sm text-slate-600">
          No reliable technique observations were available from this clip. Try
          a clearer side-on freestyle video.
        </p>
      ) : (
        <div className="space-y-4">
          {coachRead.findings.map((finding, index) => {
            const evidence = finding.evidence_frames[0];
            const evidenceKey = evidence
              ? `${finding.component}:${evidence.index}`
              : null;
            const photo = evidenceKey
              ? result.coach_evidence_urls?.[evidenceKey]
              : null;
            const meta = extractStrokeFixMeta(finding);
            const hasDrillBox = Boolean(
              meta.drillTitle || meta.drill || meta.primaryFocalPoint,
            );
            return (
              <div
                key={`${finding.component}-${finding.area ?? index}-${index}`}
                className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {finding.severity === "fix"
                      ? "Work on this"
                      : finding.severity === "strength"
                        ? "What is working"
                        : "Observation"}
                  </span>
                  {meta.strokeSupport && meta.strokeSupport.total_chunks > 1 ? (
                    <Badge
                      variant={
                        meta.strokeSupport.consistent ? "info" : "warning"
                      }
                      className="px-2 py-0.5 text-[11px]"
                    >
                      {meta.strokeSupport.single_stroke_only
                        ? "Single-stroke cue"
                        : `Seen in ${meta.strokeSupport.count}/${meta.strokeSupport.total_chunks} strokes`}
                    </Badge>
                  ) : null}
                  {meta.adjudication?.status === "confirmed" ? (
                    <Badge
                      variant="success"
                      className="gap-1 px-2 py-0.5 text-[11px]"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-1.5 text-sm font-medium text-slate-900">
                  {finding.observation}
                </p>

                {evidence ? (
                  <button
                    type="button"
                    onClick={() => onJump(evidence.timestamp_s)}
                    className="mt-1 text-xs font-medium text-cyan-700 underline"
                  >
                    View at {evidence.timestamp_s.toFixed(1)} seconds
                  </button>
                ) : null}

                {photo ? (
                  <Image
                    src={photo}
                    alt="Video frame supporting the observation"
                    unoptimized
                    width={320}
                    height={180}
                    className="mt-2 max-h-48 rounded-lg object-contain"
                  />
                ) : null}

                {meta.why ? (
                  <p className="mt-2 text-sm text-slate-600">{meta.why}</p>
                ) : null}

                {hasDrillBox ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                        {meta.drillTitle
                          ? `Try next: ${meta.drillTitle}`
                          : "Drill to try"}
                      </p>
                      {meta.academyRef ? (
                        <Link
                          href="/academy"
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-cyan-700 hover:underline"
                        >
                          SwimBuddz Academy
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                    {meta.primaryFocalPoint ? (
                      <p className="mt-1 text-xs font-medium text-slate-800">
                        Focal point: {meta.primaryFocalPoint}
                      </p>
                    ) : null}
                    {meta.drill ? (
                      <p className="mt-1 text-sm text-slate-700">
                        {meta.drill}
                      </p>
                    ) : null}
                    {meta.safetyNote ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Water safety: {meta.safetyNote}
                      </p>
                    ) : null}
                    {meta.academyRef ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2.5">
                        {savedRefs[meta.academyRef] ? (
                          <Link
                            href="/account/academy/passport"
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                          >
                            <BookmarkCheck className="h-3.5 w-3.5" />
                            Saved in Academy Drills · View Passport
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingRef === meta.academyRef}
                            onClick={() =>
                              void saveDrillToAcademy(
                                meta.academyRef!,
                                meta.primaryFocalPoint,
                              )
                            }
                            className="h-7 gap-1.5 px-2.5 text-xs"
                          >
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            {savingRef === meta.academyRef
                              ? "Saving..."
                              : "Add to My Academy Drills"}
                          </Button>
                        )}
                        <span className="text-[11px] text-slate-500">
                          Practice suggestion only — does not award practical
                          credentials.
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function ObservationRow({
  obs,
  onJump,
}: {
  obs: Observation;
  onJump: (seconds: number) => void;
}) {
  const Icon =
    obs.severity === "good"
      ? CheckCircle2
      : obs.severity === "unavailable"
        ? AlertTriangle
        : Lightbulb;
  const iconColor =
    obs.severity === "good"
      ? "text-emerald-600"
      : obs.severity === "unavailable"
        ? "text-slate-400"
        : "text-amber-600";

  return (
    <li className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">{obs.title}</p>
            {obs.timestamp_s != null ? (
              <button
                onClick={() => onJump(obs.timestamp_s as number)}
                className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
              >
                <Play className="h-3 w-3" /> Jump to {fmtTime(obs.timestamp_s)}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">{obs.detail}</p>

          {obs.drill ? (
            <div className="mt-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Drill to try: {obs.drill.title}
              </p>
              <p className="mt-1 text-xs text-slate-600">{obs.drill.how}</p>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
