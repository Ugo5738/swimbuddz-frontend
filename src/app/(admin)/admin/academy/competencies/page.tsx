"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DiagnosticAssessmentPanel } from "@/components/academy/DiagnosticAssessmentPanel";
import { GraduationParityPanel } from "@/components/academy/GraduationParityPanel";
import { IssuedVerificationsPanel } from "@/components/academy/IssuedVerificationsPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AcademyApi, type Cohort } from "@/lib/academy";
import {
  type CompetencyEvidenceRecord,
  CompetencyPassportApi,
  type LegacyPromotionCandidate,
  extractRubricCriteriaCodes,
} from "@/lib/academy/competency-passport";
import {
  AcademyRequirementsApi,
  type EffectiveMilestone,
  type FrozenRequirements,
} from "@/lib/academy/requirements";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminAcademyCompetenciesPage() {
  const [tab, setTab] = useState<"promote" | "diagnostic" | "verifications" | "parity">("promote");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [memberAuthFilter, setMemberAuthFilter] = useState("");
  const [includeCredited, setIncludeCredited] = useState(false);

  const [frozen, setFrozen] = useState<FrozenRequirements | null>(null);
  const [candidates, setCandidates] = useState<LegacyPromotionCandidate[]>([]);
  const [verifications, setVerifications] = useState<CompetencyEvidenceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [targetMilestoneVersionId, setTargetMilestoneVersionId] = useState("");
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [equivalenceReason, setEquivalenceReason] = useState("");

  const refresh = useCallback(() => setRefreshKey((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    AcademyApi.listCohorts()
      .then((list) => {
        if (!active) return;
        setCohorts(list);
        if (list[0]) setCohortId((current) => current || list[0].id);
      })
      .catch((err) => active && setError(errorText(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setError("");
    const memberAuth = memberAuthFilter.trim() || undefined;
    const cohortParam = cohortId || undefined;

    Promise.allSettled([
      cohortParam ? AcademyRequirementsApi.frozen(cohortParam) : Promise.resolve(null),
      CompetencyPassportApi.adminLegacyCandidates({
        cohort_id: cohortParam,
        member_auth_id: memberAuth,
        include_credited: includeCredited,
      }),
      CompetencyPassportApi.adminVerifications({
        cohort_id: cohortParam,
        member_auth_id: memberAuth,
      }),
    ]).then(([frozenRes, candidatesRes, verificationsRes]) => {
      if (!active) return;
      setFrozen(frozenRes.status === "fulfilled" ? frozenRes.value : null);
      if (candidatesRes.status === "fulfilled") {
        setCandidates(candidatesRes.value);
      } else {
        setCandidates([]);
        setError(errorText(candidatesRes.reason));
      }
      setVerifications(
        verificationsRes.status === "fulfilled" ? verificationsRes.value : [],
      );
    });
    return () => {
      active = false;
    };
  }, [cohortId, memberAuthFilter, includeCredited, refreshKey]);

  const portableFrozenMilestones: EffectiveMilestone[] = useMemo(() => {
    if (!frozen) return [];
    return frozen.requirements.milestones.filter(
      (m) => m.evidence_policy === "video" || m.evidence_policy === "time_trial",
    );
  }, [frozen]);

  useEffect(() => {
    if (!portableFrozenMilestones.some((m) => m.version_id === targetMilestoneVersionId)) {
      setTargetMilestoneVersionId(portableFrozenMilestones[0]?.version_id || "");
    }
  }, [portableFrozenMilestones, targetMilestoneVersionId]);

  const selectedMilestone = portableFrozenMilestones.find(
    (m) => m.version_id === targetMilestoneVersionId,
  );
  const requiredCriteria = useMemo(
    () => extractRubricCriteriaCodes(selectedMilestone?.rubric_snapshot),
    [selectedMilestone],
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const code of requiredCriteria) next[code] = false;
    setCheckedCriteria(next);
  }, [requiredCriteria, selectedCandidateId]);

  const allCriteriaAttested =
    requiredCriteria.length > 0 &&
    requiredCriteria.every((code) => checkedCriteria[code] === true);
  const selectedCandidate = candidates.find(
    (c) => c.source_progress_id === selectedCandidateId,
  );

  const submitPromotion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCandidate || !targetMilestoneVersionId || !allCriteriaAttested) return;
    setBusy(true);
    setError("");
    try {
      await CompetencyPassportApi.promoteLegacy({
        source_progress_id: selectedCandidate.source_progress_id,
        milestone_version_id: targetMilestoneVersionId,
        criteria_passed: requiredCriteria,
        equivalence_reason: equivalenceReason.trim(),
      });
      toast.success("Competency verification issued to member passport");
      setSelectedCandidateId(null);
      setEquivalenceReason("");
      refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (verificationId: string, reason: string) => {
    if (
      !window.confirm(
        "Revoke this competency verification? Revocations are permanent and append-only.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await CompetencyPassportApi.revoke(verificationId, reason);
      toast.success("Competency verification revoked");
      refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p role="status" className="p-6 text-sm text-slate-600">Loading competency administration...</p>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 md:px-6">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/academy" className="text-cyan-700 hover:underline">Back to Academy</Link>
          <Link href="/admin/academy/curriculum-library" className="text-cyan-700 hover:underline">Curriculum Library</Link>
          <Link href="/admin/academy/requirements" className="text-cyan-700 hover:underline">Programme & Cohort Requirements</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Competency Verification & Passport Admin
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Human administrators verify legacy Academy video achievements against a
          cohort&apos;s frozen V2 assessment standard, or formally revoke previously
          issued credentials. Legacy progress is never automatically promoted.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Cohort
          <select
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              setSelectedCandidateId(null);
            }}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All cohorts</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
            ))}
          </select>
        </label>
        <Input label="Member Auth ID (optional filter)" name="member-auth-filter" value={memberAuthFilter} onChange={(e) => setMemberAuthFilter(e.target.value)} placeholder="Supabase auth UUID" />
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={includeCredited} onChange={(e) => setIncludeCredited(e.target.checked)} />
            Show already-credited legacy records
          </label>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("promote")}
          aria-pressed={tab === "promote"}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab === "promote" ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Promote legacy achievements ({candidates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("diagnostic")}
          aria-pressed={tab === "diagnostic"}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab === "diagnostic" ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Diagnostic clinic assessment
        </button>
        <button
          type="button"
          onClick={() => setTab("verifications")}
          aria-pressed={tab === "verifications"}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab === "verifications" ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Issued verifications & revocations ({verifications.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("parity")}
          aria-pressed={tab === "parity"}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab === "parity" ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Graduation parity (shadow)
        </button>
      </nav>

      {tab === "promote" ? (
        <div className="space-y-4">
          {cohortId && !frozen && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                This cohort does not have a <strong>frozen V2 requirements snapshot</strong> yet.
                Assign published V2 milestones and freeze the cohort before promoting legacy achievements.
              </p>
              <Link href="/admin/academy/requirements" className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800">
                Configure & Freeze Requirements →
              </Link>
            </div>
          )}

          {candidates.length === 0 ? (
            <Card className="p-6 text-sm text-slate-600">
              No achieved legacy milestone records match the current filter.
            </Card>
          ) : (
            <ul className="space-y-3">
              {candidates.map((candidate) => {
                const isSelected = selectedCandidateId === candidate.source_progress_id;
                return (
                  <li key={candidate.source_progress_id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{candidate.legacy_milestone_name}</p>
                        <p className="text-xs text-slate-600">
                          Member Auth: <code>{candidate.member_auth_id ?? "—"}</code> · Reviewed{" "}
                          {formatDate(candidate.reviewed_at)} · Evidence:{" "}
                          {candidate.evidence_media_id ? (
                            <code>{candidate.evidence_media_id.slice(0, 8)}…</code>
                          ) : (
                            <span className="text-rose-700">None</span>
                          )}
                        </p>
                        {candidate.coach_notes && (
                          <p className="text-xs text-slate-600">Coach notes: {candidate.coach_notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {candidate.already_credited ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">Already credited</span>
                        ) : candidate.eligible ? (
                          <Button type="button" size="sm" onClick={() => setSelectedCandidateId(isSelected ? null : candidate.source_progress_id)}>
                            {isSelected ? "Close review" : "Review & Promote"}
                          </Button>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Not eligible yet</span>
                        )}
                      </div>
                    </div>

                    {candidate.eligibility_blockers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.eligibility_blockers.map((blocker) => (
                          <span key={blocker} className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                            {blocker}
                          </span>
                        ))}
                      </div>
                    )}

                    {isSelected && candidate.eligible && (
                      <form onSubmit={(event) => void submitPromotion(event)} className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4">
                        <h3 className="text-sm font-semibold text-slate-900">Issue Evidence-Backed Competency Verification</h3>
                        {!frozen || portableFrozenMilestones.length === 0 ? (
                          <p className="text-xs text-amber-800">
                            Select the specific cohort above to load its frozen video-eligible V2 milestones.
                          </p>
                        ) : (
                          <>
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                              Target frozen V2 milestone standard
                              <select value={targetMilestoneVersionId} onChange={(e) => setTargetMilestoneVersionId(e.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                                {portableFrozenMilestones.map((item) => (
                                  <option key={item.version_id} value={item.version_id}>
                                    {item.title} ({item.code} · v{item.version_number}){item.safety_gate ? " [Safety gate]" : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <fieldset className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                              <legend className="text-xs font-semibold text-slate-800">
                                Attest every published rubric criterion ({requiredCriteria.length})
                              </legend>
                              {requiredCriteria.length === 0 ? (
                                <p className="text-xs text-rose-700">This milestone version has no rubric criteria codes.</p>
                              ) : (
                                requiredCriteria.map((code) => (
                                  <label key={code} className="flex items-center gap-2 text-xs text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={checkedCriteria[code] === true}
                                      onChange={(e) => setCheckedCriteria((prev) => ({ ...prev, [code]: e.target.checked }))}
                                    />
                                    <code>{code}</code>
                                  </label>
                                ))
                              )}
                            </fieldset>
                            <Textarea
                              label={`Equivalence & evidence review explanation (${equivalenceReason.trim().length}/30 min chars)`}
                              name="equivalence-reason"
                              required
                              minLength={30}
                              rows={3}
                              value={equivalenceReason}
                              onChange={(e) => setEquivalenceReason(e.target.value)}
                              placeholder="Document why the reviewed video evidence satisfies every published criterion..."
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button type="submit" disabled={busy || !allCriteriaAttested || equivalenceReason.trim().length < 30}>
                                Confirm & Issue Verification
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => setSelectedCandidateId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </>
                        )}
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : tab === "diagnostic" ? (
        <DiagnosticAssessmentPanel
          onIssued={() => {
            refresh();
            setTab("verifications");
          }}
          onError={setError}
        />
      ) : tab === "verifications" ? (
        <IssuedVerificationsPanel verifications={verifications} busy={busy} onRevoke={handleRevoke} />
      ) : (
        <GraduationParityPanel
          cohortId={cohortId}
          refreshKey={refreshKey}
          onJumpToPromote={(memberAuth) => {
            setMemberAuthFilter(memberAuth);
            setTab("promote");
          }}
        />
      )}
    </main>
  );
}
