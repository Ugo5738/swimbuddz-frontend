"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  CompetencyPassportApi,
  type DrillAssignmentStatus,
  type EnrollmentV2LearningPlan,
  type PublishedCoachingDrill,
  type V2PlanMilestone,
  extractRubricCriteriaCodes,
} from "@/lib/academy/competency-passport";

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : "The request could not be completed.";

export function CoachV2CompetencyPanel({ enrollmentId }: { enrollmentId: string }) {
  const [plan, setPlan] = useState<EnrollmentV2LearningPlan | null>(null);
  const [drills, setDrills] = useState<PublishedCoachingDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Active cohort V2 assessment form
  const [assessMilestone, setAssessMilestone] = useState<V2PlanMilestone | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [assessNotes, setAssessNotes] = useState("");

  // Custom drill prescription form
  const [pickDrillVersionId, setPickDrillVersionId] = useState("");
  const [drillSets, setDrillSets] = useState("4");
  const [drillDist, setDrillDist] = useState("12.5");
  const [focalNote, setFocalNote] = useState("");

  const reload = useCallback(async () => {
    try {
      const [nextPlan, nextDrills] = await Promise.all([
        CompetencyPassportApi.enrollmentV2Plan(enrollmentId),
        CompetencyPassportApi.listPublishedDrills().catch(() => []),
      ]);
      setPlan(nextPlan);
      setDrills(nextDrills);
      if (nextDrills[0]) setPickDrillVersionId((p) => p || nextDrills[0].drill_version_id);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openAssess = (milestone: V2PlanMilestone) => {
    const criteria = extractRubricCriteriaCodes(milestone.rubric_snapshot);
    const map: Record<string, boolean> = {};
    for (const c of criteria) map[c] = false;
    setCheckedCriteria(map);
    setVideoId(null);
    setAssessNotes("");
    setError("");
    setAssessMilestone(milestone);
  };

  const submitAssessment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assessMilestone || !videoId) return;
    const criteria = extractRubricCriteriaCodes(assessMilestone.rubric_snapshot);
    if (criteria.length === 0 || !criteria.every((c) => checkedCriteria[c])) return;
    setBusy(true);
    setError("");
    try {
      await CompetencyPassportApi.assessCohort({
        enrollment_id: enrollmentId,
        milestone_version_id: assessMilestone.version_id,
        evidence_media_id: videoId,
        evidence_uploaded_by: "assessor",
        criteria_passed: criteria,
        assessment_notes: assessNotes.trim(),
      });
      toast.success("V2 competency verification issued to swimmer passport");
      setAssessMilestone(null);
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const prescribeDrill = async (
    drillVersionId: string,
    milestoneDefinitionId?: string,
    tip?: string,
  ) => {
    setBusy(true);
    setError("");
    try {
      await CompetencyPassportApi.assignDrill({
        enrollment_id: enrollmentId,
        drill_version_id: drillVersionId,
        milestone_definition_id: milestoneDefinitionId,
        focal_cue_note: tip || focalNote.trim() || undefined,
        sets: Math.max(1, Number(drillSets) || 3),
        distance_m: drillDist.trim() ? Number(drillDist) : null,
      });
      setFocalNote("");
      toast.success("TI practice drill prescribed to swimmer");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const changeDrillStatus = async (
    assignmentId: string,
    status: DrillAssignmentStatus,
  ) => {
    setBusy(true);
    setError("");
    try {
      await CompetencyPassportApi.updateDrillStatus(assignmentId, { status });
      toast.success(`Drill marked ${status}`);
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !plan) return null;

  return (
    <Card className="space-y-6 p-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          V2 Competency Standards &amp; TI Practice Drills
        </h2>
        <p className="text-xs text-slate-600">
          Record video-backed competency verifications against this cohort&apos;s frozen
          V2 requirements and prescribe focused Total Immersion drills.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {!plan.has_frozen_requirements ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          This cohort does not have frozen V2 competency requirements yet. You can still
          prescribe published TI practice drills below.
        </p>
      ) : (
        <div className="space-y-3">
          {plan.milestones.map((ms) => {
            const criteria = extractRubricCriteriaCodes(ms.rubric_snapshot);
            const isOpen = assessMilestone?.version_id === ms.version_id;
            const canVerify =
              ms.passport_status !== "verified" &&
              (ms.evidence_policy === "video" || ms.evidence_policy === "time_trial");
            return (
              <div key={ms.version_id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{ms.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          ms.passport_status === "verified"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ms.passport_status === "verified"
                          ? ms.prior_credit
                            ? "Verified · Prior Credit"
                            : "Verified"
                          : ms.passport_status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {ms.code} · v{ms.version_number}
                      {ms.target_week ? ` · Target week ${ms.target_week}` : ""}
                      {ms.safety_gate ? " · Safety gate" : ""}
                    </p>
                  </div>
                  {canVerify && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => (isOpen ? setAssessMilestone(null) : openAssess(ms))}
                    >
                      {isOpen ? "Cancel" : "Record V2 Assessment"}
                    </Button>
                  )}
                </div>

                {ms.remedial_drills.length > 0 && ms.passport_status !== "verified" && (
                  <div className="rounded-lg bg-cyan-50/50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-cyan-900">
                      Recommended TI remedial drills
                    </p>
                    {ms.remedial_drills.map((drill) => (
                      <div key={drill.drill_id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-medium text-slate-900">{drill.title}</span>
                          <span className="text-slate-600"> — {drill.primary_focal_cue}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void prescribeDrill(
                              drill.drill_version_id,
                              ms.definition_id,
                              drill.coach_tip || undefined,
                            )
                          }
                        >
                          Prescribe drill
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && (
                  <form
                    onSubmit={(e) => void submitAssessment(e)}
                    className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50/30 p-3"
                  >
                    <MediaInput
                      purpose="milestone_evidence"
                      linkedId={`${enrollmentId}:${ms.version_id}`}
                      mode="upload-only"
                      accept="video/*"
                      value={videoId}
                      onChange={setVideoId}
                      onUploadingChange={setUploading}
                      label="Recorded assessment video"
                      showPreview={true}
                    />
                    <fieldset className="space-y-1.5 rounded border border-slate-200 bg-white p-2.5">
                      <legend className="text-xs font-semibold text-slate-800">
                        Attest rubric criteria ({criteria.length})
                      </legend>
                      {criteria.map((code) => (
                        <label key={code} className="flex items-center gap-2 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={checkedCriteria[code] === true}
                            onChange={(e) =>
                              setCheckedCriteria((prev) => ({ ...prev, [code]: e.target.checked }))
                            }
                          />
                          <code>{code}</code>
                        </label>
                      ))}
                    </fieldset>
                    <Textarea
                      label={`Coach assessment notes (${assessNotes.trim().length}/20 min chars)`}
                      required
                      minLength={20}
                      rows={2}
                      value={assessNotes}
                      onChange={(e) => setAssessNotes(e.target.value)}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        busy ||
                        uploading ||
                        !videoId ||
                        assessNotes.trim().length < 20 ||
                        !criteria.every((c) => checkedCriteria[c])
                      }
                    >
                      Verify &amp; Issue to Passport
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Prescribed drills list & custom assignment */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-base font-semibold text-slate-900">
          Prescribed TI Drills ({plan.drill_assignments.length})
        </h3>
        {plan.drill_assignments.length > 0 && (
          <ul className="space-y-2">
            {plan.drill_assignments.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900">
                    {item.drill_title} ({item.sets} sets
                    {item.distance_m ? ` × ${item.distance_m}m` : ""})
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {item.status}
                    </span>
                  </p>
                  <p className="text-cyan-900">
                    Focal cue: {item.focal_cue_note || item.primary_focal_cue}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {item.status !== "mastered" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void changeDrillStatus(item.id, "mastered")}
                    >
                      Mark mastered
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void changeDrillStatus(item.id, "archived")}
                  >
                    Archive
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {drills.length > 0 && (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
            <select
              value={pickDrillVersionId}
              onChange={(e) => setPickDrillVersionId(e.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              {drills.map((d) => (
                <option key={d.drill_version_id} value={d.drill_version_id}>
                  {d.title} ({d.code})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input label="Sets" type="number" min="1" value={drillSets} onChange={(e) => setDrillSets(e.target.value)} />
              <Input label="Dist (m)" type="number" min="1" step="0.5" value={drillDist} onChange={(e) => setDrillDist(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Personalized focal cue note (optional)"
                value={focalNote}
                onChange={(e) => setFocalNote(e.target.value)}
                placeholder="One clear TI cue for the swimmer's next practice..."
              />
            </div>
            <div>
              <Button
                type="button"
                size="sm"
                disabled={busy || !pickDrillVersionId}
                onClick={() => void prescribeDrill(pickDrillVersionId)}
              >
                Assign TI drill
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
