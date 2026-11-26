"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AssignedRequirementsPanel } from "@/components/academy/AssignedRequirementsPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AcademyApi, type Cohort, type Program } from "@/lib/academy";
import {
  CurriculumLibraryApi,
  type CurriculumDefinition,
  type CurriculumVersion,
} from "@/lib/academy/curriculum-library";
import {
  AcademyRequirementsApi,
  type CohortAssignments,
  type FrozenRequirements,
  type ProgramAssignments,
  type RequirementsPreview,
} from "@/lib/academy/requirements";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

export default function AcademyRequirementsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [milestones, setMilestones] = useState<CurriculumDefinition[]>([]);
  const [modules, setModules] = useState<CurriculumDefinition[]>([]);
  const [programId, setProgramId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [milestoneVersionId, setMilestoneVersionId] = useState("");
  const [milestoneVersions, setMilestoneVersions] = useState<CurriculumVersion[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [moduleVersionId, setModuleVersionId] = useState("");
  const [moduleVersions, setModuleVersions] = useState<CurriculumVersion[]>([]);
  const [scope, setScope] = useState<"program" | "cohort">("program");
  const [required, setRequired] = useState(true);
  const [targetWeek, setTargetWeek] = useState("");
  const [reason, setReason] = useState("");
  const [moduleOrder, setModuleOrder] = useState("0");
  const [moduleMilestoneOrder, setModuleMilestoneOrder] = useState("0");
  const [programAssignments, setProgramAssignments] = useState<ProgramAssignments | null>(null);
  const [cohortAssignments, setCohortAssignments] = useState<CohortAssignments | null>(null);
  const [preview, setPreview] = useState<RequirementsPreview | null>(null);
  const [frozen, setFrozen] = useState<FrozenRequirements | null>(null);
  const [previewProblem, setPreviewProblem] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const relatedCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.program_id === programId),
    [cohorts, programId],
  );
  const currentMilestoneVersion = milestoneVersions.find((v) => v.id === milestoneVersionId);
  const currentModuleVersion = moduleVersions.find((v) => v.id === moduleVersionId);
  const selectedSafetyGate = currentMilestoneVersion?.content.safety_gate === true;

  useEffect(() => {
    let active = true;
    Promise.all([
      AcademyApi.listPrograms(),
      AcademyApi.listCohorts(),
      CurriculumLibraryApi.definitions("milestone"),
      CurriculumLibraryApi.definitions("module"),
    ])
      .then(([nextPrograms, nextCohorts, nextMilestones, nextModules]) => {
        if (!active) return;
        setPrograms(nextPrograms);
        setCohorts(nextCohorts);
        setMilestones(nextMilestones);
        setModules(nextModules);
        setProgramId((current) => current || nextPrograms[0]?.id || "");
        setMilestoneId((current) => current || nextMilestones[0]?.id || "");
        setModuleId((current) => current || nextModules[0]?.id || "");
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!relatedCohorts.some((cohort) => cohort.id === cohortId)) {
      setCohortId(relatedCohorts[0]?.id || "");
    }
  }, [cohortId, relatedCohorts]);

  useEffect(() => {
    if (!programId) {
      setProgramAssignments(null);
      return;
    }
    let active = true;
    AcademyRequirementsApi.listProgramAssignments(programId)
      .then((res) => active && setProgramAssignments(res))
      .catch(() => active && setProgramAssignments(null));
    return () => {
      active = false;
    };
  }, [programId, refreshKey]);

  useEffect(() => {
    if (!milestoneId) {
      setMilestoneVersions([]);
      setMilestoneVersionId("");
      return;
    }
    let active = true;
    CurriculumLibraryApi.versions("milestone", milestoneId)
      .then((items) => {
        if (!active) return;
        setMilestoneVersions(items);
        setMilestoneVersionId(items.find((item) => item.state === "published")?.id || "");
      })
      .catch((err) => active && setError(errorText(err)));
    return () => {
      active = false;
    };
  }, [milestoneId]);

  useEffect(() => {
    if (!moduleId) {
      setModuleVersions([]);
      setModuleVersionId("");
      return;
    }
    let active = true;
    CurriculumLibraryApi.versions("module", moduleId)
      .then((items) => {
        if (!active) return;
        setModuleVersions(items);
        setModuleVersionId(items[0]?.id || "");
      })
      .catch((err) => active && setError(errorText(err)));
    return () => {
      active = false;
    };
  }, [moduleId]);

  useEffect(() => {
    if (!cohortId) {
      setPreview(null);
      setFrozen(null);
      setCohortAssignments(null);
      setPreviewProblem("");
      return;
    }
    let active = true;
    Promise.allSettled([
      AcademyRequirementsApi.preview(cohortId),
      AcademyRequirementsApi.frozen(cohortId),
      AcademyRequirementsApi.listCohortAssignments(cohortId),
    ]).then(([liveResult, frozenResult, cohortAssignmentsResult]) => {
      if (!active) return;
      if (liveResult.status === "fulfilled") {
        setPreview(liveResult.value);
        setPreviewProblem("");
      } else {
        setPreview(null);
        setPreviewProblem(errorText(liveResult.reason));
      }
      setFrozen(frozenResult.status === "fulfilled" ? frozenResult.value : null);
      setCohortAssignments(
        cohortAssignmentsResult.status === "fulfilled" ? cohortAssignmentsResult.value : null,
      );
    });
    return () => {
      active = false;
    };
  }, [cohortId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  const runAction = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      toast.success(message);
      refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const submitMilestone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!milestoneVersionId || !programId) return;
    await runAction(async () => {
      const week = targetWeek ? Number(targetWeek) : null;
      if (scope === "program") {
        await AcademyRequirementsApi.assignProgramMilestone(programId, {
          milestone_version_id: milestoneVersionId,
          required_for_completion: selectedSafetyGate ? true : required,
          target_week: week,
        });
      } else {
        if (!cohortId) throw new Error("Select a cohort");
        await AcademyRequirementsApi.assignCohortMilestone(cohortId, {
          milestone_version_id: milestoneVersionId,
          target_week: week,
          override_reason: reason.trim(),
        });
      }
      setReason("");
    }, "Milestone assigned");
  };

  const freeze = async () => {
    if (!cohortId || !preview || frozen) return;
    if (
      !window.confirm(
        "Freeze these learning requirements for this cohort? Published requirements cannot be edited.",
      )
    ) {
      return;
    }
    await runAction(() => AcademyRequirementsApi.freeze(cohortId).then(() => undefined), "Cohort requirements frozen");
  };

  if (loading) {
    return <p role="status" className="p-6 text-sm text-slate-600">Loading Academy curriculum...</p>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 md:px-6">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/academy/curriculum-library" className="text-cyan-700 hover:underline">
            Back to Curriculum Library
          </Link>
          <Link href="/admin/academy/competencies" className="text-emerald-700 hover:underline">
            Competency Verification Admin
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Programme & Cohort Requirements</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Reuse approved milestones across pathways, manage programme defaults and
          pre-freeze cohort overrides, and freeze each cohort&apos;s assessment standard.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Programme
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
            {programs.length === 0 && <option value="">No programmes</option>}
            {programs.map((program) => (<option key={program.id} value={program.id}>{program.name}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Cohort (for preview and overrides)
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
            {relatedCohorts.length === 0 && <option value="">No cohorts</option>}
            {relatedCohorts.map((cohort) => (<option key={cohort.id} value={cohort.id}>{cohort.name}</option>))}
          </select>
        </label>
      </section>

      <AssignedRequirementsPanel
        cohortId={cohortId}
        busy={busy}
        programAssignments={programAssignments}
        cohortAssignments={cohortAssignments}
        onRemoveProgramModule={(id) =>
          void runAction(() => AcademyRequirementsApi.removeProgramModule(programId, id), "Module removed")
        }
        onRemoveProgramMilestone={(id) =>
          void runAction(() => AcademyRequirementsApi.removeProgramMilestone(programId, id), "Milestone removed")
        }
        onRemoveCohortMilestone={(id) =>
          void runAction(() => AcademyRequirementsApi.removeCohortMilestone(cohortId, id), "Cohort override removed")
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Assign an approved milestone</h2>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Milestone
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
              {milestones.length === 0 && <option value="">No milestones</option>}
              {milestones.map((item) => (<option key={item.id} value={item.id}>{item.title} ({item.code})</option>))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Published assessment version
            <select value={milestoneVersionId} onChange={(e) => setMilestoneVersionId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
              {!milestoneVersionId && <option value="">Select a published version</option>}
              {milestoneVersions.filter((item) => item.state === "published").map((item) => (
                <option key={item.id} value={item.id}>Version {item.version}</option>
              ))}
            </select>
          </label>
          {selectedSafetyGate && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Safety milestone: this requirement must remain mandatory.
            </p>
          )}
          <form onSubmit={(event) => void submitMilestone(event)} className="space-y-3">
            <fieldset className="space-y-2 text-sm text-slate-700">
              <legend className="font-semibold">Assign to</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="assignment-scope" checked={scope === "program"} onChange={() => setScope("program")} />
                All future unfrozen cohorts in this programme
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="assignment-scope" checked={scope === "cohort"} onChange={() => setScope("cohort")} />
                This cohort only
              </label>
            </fieldset>
            <Input label="Target week (optional)" name="target-week" type="number" min="1" value={targetWeek} onChange={(e) => setTargetWeek(e.target.value)} />
            {scope === "cohort" ? (
              <Textarea label="Reason for cohort assignment" name="override-reason" minLength={10} required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            ) : (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selectedSafetyGate || required} disabled={selectedSafetyGate} onChange={(e) => setRequired(e.target.checked)} />
                Required for completion
              </label>
            )}
            <Button type="submit" disabled={busy || !milestoneVersionId || !programId || (scope === "cohort" && (!cohortId || Boolean(frozen)))}>
              Assign milestone
            </Button>
          </form>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Cohort requirements preview</h2>
          {!cohortId ? (
            <p className="text-sm text-slate-500">Choose a cohort to preview its requirements.</p>
          ) : !preview ? (
            <p className="text-sm text-slate-600">{previewProblem || "No published requirements assigned yet."}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{preview.requirements.milestones.length} milestones</span>
                <span className="text-xs text-slate-500">Version-pinned preview</span>
              </div>
              <ul className="space-y-2">
                {preview.requirements.milestones.map((item) => (
                  <li key={item.version_id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">
                      {item.code} · v{item.version_number} · {item.evidence_policy.replaceAll("_", " ")}
                      {item.target_week ? ` · Target week ${item.target_week}` : ""}
                    </p>
                    <p className="text-xs text-slate-600">
                      {item.required_for_completion ? "Required" : "Optional"}
                      {item.safety_gate ? " · Safety gate" : ""} · Sources: {item.sources.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {frozen ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">Frozen cohort standard</p>
              <p className="text-xs text-slate-600">
                {frozen.requirements.milestones.length} milestones · frozen {new Date(frozen.created_at).toLocaleDateString()}
              </p>
              {preview?.sha256 !== frozen.sha256 && (
                <p className="text-xs font-medium text-amber-800">
                  The current draft requirements differ. This cohort keeps its frozen standard.
                </p>
              )}
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer text-cyan-700">View audit hash</summary>
                <code className="break-all">{frozen.sha256}</code>
              </details>
            </div>
          ) : (
            <Button type="button" onClick={() => void freeze()} disabled={busy || !preview}>
              Freeze cohort requirements
            </Button>
          )}
        </section>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Build modules from reusable content</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Module
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
              {modules.length === 0 && <option value="">No modules</option>}
              {modules.map((item) => (<option key={item.id} value={item.id}>{item.title}</option>))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Module version
            <select value={moduleVersionId} onChange={(e) => setModuleVersionId(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2">
              {moduleVersions.length === 0 && <option value="">No module versions</option>}
              {moduleVersions.map((item) => (<option key={item.id} value={item.id}>v{item.version} ({item.state})</option>))}
            </select>
          </label>
          <div className="space-y-2">
            <Input label="Milestone order within module" name="module-milestone-order" type="number" min="0" value={moduleMilestoneOrder} onChange={(e) => setModuleMilestoneOrder(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !milestoneVersionId || currentModuleVersion?.state !== "draft"}
              onClick={() =>
                void runAction(
                  () =>
                    AcademyRequirementsApi.assignModuleMilestone(moduleVersionId, {
                      milestone_version_id: milestoneVersionId,
                      required_for_completion: selectedSafetyGate ? true : required,
                      order_index: Number(moduleMilestoneOrder),
                    }).then(() => undefined),
                  "Milestone added to draft module",
                )
              }
            >
              Add selected milestone
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
          <div className="w-40">
            <Input label="Module order in programme" name="module-program-order" type="number" min="0" value={moduleOrder} onChange={(e) => setModuleOrder(e.target.value)} />
          </div>
          <Button
            type="button"
            disabled={busy || !programId || currentModuleVersion?.state !== "published"}
            onClick={() =>
              void runAction(
                () =>
                  AcademyRequirementsApi.assignProgramModule(programId, {
                    module_version_id: moduleVersionId,
                    order_index: Number(moduleOrder),
                  }).then(() => undefined),
                "Published module linked to programme",
              )
            }
          >
            Link published module to programme
          </Button>
        </div>
      </section>
    </main>
  );
}
