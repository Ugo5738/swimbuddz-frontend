"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CompetencyPassportApi,
  type EnrollmentV2LearningPlan,
  SOURCE_TYPE_LABELS,
} from "@/lib/academy/competency-passport";

export function LearnerV2PlanPanel({ enrollmentId }: { enrollmentId: string }) {
  const [plan, setPlan] = useState<EnrollmentV2LearningPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPlan(await CompetencyPassportApi.enrollmentV2Plan(enrollmentId));
    } catch {
      setPlan(null);
    }
  }, [enrollmentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!plan || (!plan.has_frozen_requirements && plan.drill_assignments.length === 0)) {
    return null;
  }

  const markPracticed = async (assignmentId: string) => {
    setBusyId(assignmentId);
    try {
      await CompetencyPassportApi.markMyDrillPracticed(assignmentId);
      toast.success("Logged as practiced — your coach will review in class!");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update drill");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Competency Plan &amp; Practice Drills
          </h2>
          <p className="text-xs text-slate-600">
            Verified competencies carry across pathways. Practice your recommended
            Total Immersion drills between classes.
          </p>
        </div>
        <Link
          href="/account/academy/passport"
          className="text-xs font-semibold text-cyan-700 hover:underline"
        >
          View Competency Passport →
        </Link>
      </div>

      {plan.has_frozen_requirements && plan.milestones.length > 0 && (
        <ul className="space-y-3">
          {plan.milestones.map((ms) => (
            <li
              key={ms.version_id}
              className="space-y-2 rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{ms.title}</p>
                  <p className="text-xs text-slate-500">
                    {ms.code}
                    {ms.target_week ? ` · Target week ${ms.target_week}` : ""}
                    {ms.verified_source_type
                      ? ` · ${SOURCE_TYPE_LABELS[ms.verified_source_type]}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    ms.passport_status === "verified"
                      ? "bg-emerald-100 text-emerald-900"
                      : ms.passport_status === "unverified"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {ms.passport_status === "verified"
                    ? ms.prior_credit
                      ? "Prior Credit ✓"
                      : "Verified ✓"
                    : ms.passport_status === "unverified"
                      ? "In Progress"
                      : ms.passport_status.replaceAll("_", " ")}
                </span>
              </div>

              {ms.remedial_drills.length > 0 && (
                <details className="rounded-lg bg-cyan-50/50 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-cyan-900">
                    Recommended TI practice drills ({ms.remedial_drills.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {ms.remedial_drills.map((drill) => (
                      <div key={drill.drill_id} className="rounded bg-white p-2.5 border border-cyan-100">
                        <p className="font-semibold text-slate-900">{drill.title}</p>
                        <p className="text-cyan-900">
                          <strong>Primary focal cue:</strong> {drill.primary_focal_cue}
                        </p>
                        {drill.coach_tip && (
                          <p className="text-slate-600">{drill.coach_tip}</p>
                        )}
                        {drill.steps_json.length > 0 && (
                          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-slate-700">
                            {drill.steps_json.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {plan.drill_assignments.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-base font-semibold text-slate-900">
            My Prescribed Practice Drills
          </h3>
          <ul className="space-y-2">
            {plan.drill_assignments.map((drill) => (
              <li
                key={drill.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{drill.drill_title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        drill.status === "mastered"
                          ? "bg-emerald-100 text-emerald-900"
                          : drill.status === "practiced"
                            ? "bg-cyan-100 text-cyan-900"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {drill.status}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Prescription: {drill.sets} sets
                    {drill.distance_m ? ` × ${drill.distance_m}m` : ""}
                  </p>
                  <p className="text-cyan-900">
                    <strong>Focal cue:</strong>{" "}
                    {drill.focal_cue_note || drill.primary_focal_cue}
                  </p>
                </div>
                {drill.status === "assigned" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === drill.id}
                    onClick={() => void markPracticed(drill.id)}
                  >
                    Mark as practiced
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
