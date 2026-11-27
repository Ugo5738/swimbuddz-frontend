"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
  BENCHMARK_TYPE_LABELS,
  PROFICIENCY_LABELS,
  STROKE_LABELS,
  type BatchBenchmarkEntryPayload,
  type BenchmarkStroke,
  type BenchmarkType,
  type MemberScorecard,
  type PoolOption,
  type ScorecardReviewQueue,
  type ScorecardRosterMember,
  fetchMemberScorecard,
  fetchPartnerPoolsForBenchmark,
  fetchReviewQueue,
  fetchScorecardRoster,
  formatBenchmarkSummary,
  recordBatchBenchmarkDay,
  reviewMemberBenchmark,
  verifyMemberSkill,
} from "@/lib/scorecard";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Search,
  ShieldCheck,
  Timer,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsistencyCommunityStrip } from "./ConsistencyCommunityStrip";
import { PerformanceBenchmarksSection } from "./PerformanceBenchmarksSection";
import { ScorecardOverviewHero } from "./ScorecardOverviewHero";
import { SkillsMatrixSection } from "./SkillsMatrixSection";
import { ProficiencyBadge, SafetyGateBadge } from "./TrustBadge";

type WorkspaceTab = "queue" | "benchmark_day" | "roster";

type BatchRowDraft = {
  key: string;
  member_id: string;
  stroke: BenchmarkStroke;
  benchmark_type: BenchmarkType;
  distance_m: string;
  duration_seconds: string;
  stroke_count: string;
  stroke_rate_spm: string;
  swolf_score: string;
  verifier_notes: string;
};

type Props = {
  title: string;
  subtitle: string;
  podId?: string;
};

function makeEmptyDraft(memberId = ""): BatchRowDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    member_id: memberId,
    stroke: "freestyle",
    benchmark_type: "spl",
    distance_m: "",
    duration_seconds: "",
    stroke_count: "",
    stroke_rate_spm: "",
    swolf_score: "",
    verifier_notes: "",
  };
}

export function ScorecardReviewWorkspace({ title, subtitle, podId }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>("queue");
  const [queue, setQueue] = useState<ScorecardReviewQueue | null>(null);
  const [roster, setRoster] = useState<ScorecardRosterMember[]>([]);
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-item review notes for quick queue approve/reject
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Selected swimmer detail inspector
  const [selectedScorecard, setSelectedScorecard] = useState<MemberScorecard | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Batch Benchmark Day form state
  const [dayLabel, setDayLabel] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()} Club Benchmark Day`;
  });
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayPoolId, setDayPoolId] = useState("");
  const [dayPoolName, setDayPoolName] = useState("");
  const [dayPoolLengthM, setDayPoolLengthM] = useState("25");
  const [batchRows, setBatchRows] = useState<BatchRowDraft[]>([makeEmptyDraft()]);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [qData, rData, poolData] = await Promise.all([
        fetchReviewQueue(podId),
        fetchScorecardRoster({ pod_id: podId, search: search.trim() || undefined, limit: 100 }),
        fetchPartnerPoolsForBenchmark(),
      ]);
      setQueue(qData);
      setRoster(rData);
      setPools(poolData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scorecard workspace");
    } finally {
      setLoading(false);
    }
  }, [podId, search]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openSwimmerDetail = async (memberId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchMemberScorecard(memberId);
      if ("domains" in detail) {
        setSelectedScorecard(detail);
      } else {
        toast.error("Full scorecard view is not available for this member.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load swimmer scorecard");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleQueueSkillAction = async (
    progressId: string,
    memberId: string,
    skillCode: string,
    action: "verify" | "reject",
    claimedProficiency: "not_started" | "learning" | "confident" | "mastered",
  ) => {
    const note = (notesByItem[progressId] || "").trim();
    if (action === "reject" && !note) {
      toast.error("Please add a brief technique tip before requesting more practice.");
      return;
    }
    setBusyId(progressId);
    try {
      await verifyMemberSkill(memberId, skillCode, {
        action,
        proficiency: action === "verify" ? claimedProficiency : undefined,
        verifier_notes: note || undefined,
      });
      toast.success(
        action === "verify" ? "Skill verified." : "Feedback sent to swimmer.",
      );
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleQueueBenchmarkAction = async (
    benchmarkId: string,
    action: "verify" | "reject",
  ) => {
    const note = (notesByItem[benchmarkId] || "").trim();
    if (action === "reject" && !note) {
      toast.error("Please add a brief note before rejecting a benchmark.");
      return;
    }
    setBusyId(benchmarkId);
    try {
      await reviewMemberBenchmark(benchmarkId, {
        action,
        verifier_notes: note || undefined,
      });
      toast.success(action === "verify" ? "Benchmark verified." : "Benchmark rejected.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleBatchPoolSelect = (poolId: string) => {
    setDayPoolId(poolId);
    const matched = pools.find((p) => p.id === poolId);
    if (matched) {
      setDayPoolName(matched.name);
      if (matched.pool_length_m) setDayPoolLengthM(String(matched.pool_length_m));
    }
  };

  const updateBatchRow = (key: string, patch: Partial<BatchRowDraft>) => {
    setBatchRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchRows.filter((r) => r.member_id);
    if (validRows.length === 0) {
      toast.error("Select at least one swimmer to record benchmarks.");
      return;
    }

    const entries: BatchBenchmarkEntryPayload[] = validRows.map((r) => ({
      member_id: r.member_id,
      stroke: r.benchmark_type === "open_water" ? "open_water" : r.stroke,
      benchmark_type: r.benchmark_type,
      distance_m: r.distance_m ? Number(r.distance_m) : undefined,
      duration_seconds: r.duration_seconds ? Number(r.duration_seconds) : undefined,
      stroke_count: r.stroke_count ? Number(r.stroke_count) : undefined,
      stroke_rate_spm: r.stroke_rate_spm ? Number(r.stroke_rate_spm) : undefined,
      swolf_score: r.swolf_score ? Number(r.swolf_score) : undefined,
      verifier_notes: r.verifier_notes.trim() || undefined,
    }));

    setSubmittingBatch(true);
    try {
      const res = await recordBatchBenchmarkDay({
        benchmark_day_label: dayLabel.trim(),
        recorded_at: dayDate ? new Date(`${dayDate}T10:00:00Z`).toISOString() : undefined,
        pool_id: dayPoolId || undefined,
        pool_name: dayPoolName.trim() || undefined,
        pool_length_m: dayPoolLengthM ? Number(dayPoolLengthM) : undefined,
        entries,
      });
      toast.success(
        `Recorded ${res.recorded_count} verified benchmark${res.recorded_count === 1 ? "" : "s"} for "${res.benchmark_day_label}".`,
      );
      setBatchRows([makeEmptyDraft()]);
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save batch benchmarks");
    } finally {
      setSubmittingBatch(false);
    }
  };

  if (loading) return <LoadingCard text="Loading Swim Scorecard workspace…" />;

  // Full swimmer inspector drill-in view
  if (selectedScorecard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedScorecard(null);
              void loadAll();
            }}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Button>
          <Badge variant="info">
            Reviewing as {selectedScorecard.viewer_audience === "pod_lead" ? "Pod Lead" : "Coach / Admin"}
          </Badge>
        </div>

        <ScorecardOverviewHero scorecard={selectedScorecard} />

        <SkillsMatrixSection
          memberId={selectedScorecard.member_id}
          domains={selectedScorecard.domains}
          canEditSelf={false}
          canVerify={selectedScorecard.can_verify}
          hasClubAccess={selectedScorecard.has_club_access}
          onUpdated={() => openSwimmerDetail(selectedScorecard.member_id)}
        />

        <PerformanceBenchmarksSection
          memberId={selectedScorecard.member_id}
          hasFullPerformanceAccess={true}
          canEditSelf={false}
          canVerify={selectedScorecard.can_verify}
          personalBests={selectedScorecard.personal_bests}
          benchmarks={selectedScorecard.benchmarks}
          trends={selectedScorecard.trends}
          strokelab={selectedScorecard.strokelab}
          onUpdated={() => openSwimmerDetail(selectedScorecard.member_id)}
        />

        <ConsistencyCommunityStrip
          academy={selectedScorecard.academy}
          consistency={selectedScorecard.consistency}
          showReportsLink={false}
        />
      </div>
    );
  }

  const totalPending =
    (queue?.pending_skills.length ?? 0) + (queue?.pending_benchmarks.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {queue && (
          <Badge variant="info" className="capitalize">
            Role: {queue.actor_role.replace("_", " ")}
          </Badge>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Tab switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("queue")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "queue"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Verification Queue
          {totalPending > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                tab === "queue" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-900"
              }`}
            >
              {totalPending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("benchmark_day")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "benchmark_day"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Timer className="h-4 w-4" />
          Benchmark Day Recorder
        </button>

        <button
          type="button"
          onClick={() => setTab("roster")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "roster"
              ? "bg-cyan-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Swimmer Roster ({roster.length})
        </button>
      </div>

      {/* TAB 1: VERIFICATION QUEUE */}
      {tab === "queue" && (
        <div className="space-y-6">
          {totalPending === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Verification queue is clear
              </h2>
              <p className="text-sm text-slate-500">
                No swimmers have pending skill or benchmark verification requests right now.
                Use <strong>Benchmark Day Recorder</strong> or <strong>Swimmer Roster</strong>{" "}
                to record verified progress proactively.
              </p>
            </Card>
          ) : (
            <>
              {(queue?.pending_skills.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Pending Skill Claims ({queue!.pending_skills.length})
                  </h2>
                  {queue!.pending_skills.map((item) => (
                    <Card key={item.progress_id} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void openSwimmerDetail(item.member_id)}
                              className="text-sm font-bold text-cyan-700 hover:underline"
                            >
                              {item.member_name}
                            </button>
                            {item.pod_name && <Badge>{item.pod_name}</Badge>}
                            {item.is_safety_gate && <SafetyGateBadge cleared={false} />}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.skill_title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>Claimed:</span>
                            <ProficiencyBadge proficiency={item.claimed_proficiency} />
                            {item.verified_proficiency && (
                              <span>
                                · Previous verified:{" "}
                                <strong>{PROFICIENCY_LABELS[item.verified_proficiency]}</strong>
                              </span>
                            )}
                          </div>
                          {item.member_notes && (
                            <p className="text-xs text-slate-600 italic">
                              &ldquo;{item.member_notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          placeholder="Optional approval note, or required TI cue if requesting more practice..."
                          value={notesByItem[item.progress_id] ?? ""}
                          onChange={(e) =>
                            setNotesByItem((prev) => ({
                              ...prev,
                              [item.progress_id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            disabled={busyId === item.progress_id}
                            onClick={() =>
                              void handleQueueSkillAction(
                                item.progress_id,
                                item.member_id,
                                item.skill_code,
                                "verify",
                                item.claimed_proficiency,
                              )
                            }
                            className="gap-1 !bg-emerald-600 hover:!bg-emerald-500"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.progress_id}
                            onClick={() =>
                              void handleQueueSkillAction(
                                item.progress_id,
                                item.member_id,
                                item.skill_code,
                                "reject",
                                item.claimed_proficiency,
                              )
                            }
                            className="gap-1 !text-rose-700 !border-rose-200 hover:!bg-rose-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Needs Practice
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {(queue?.pending_benchmarks.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Pending Benchmark Verifications ({queue!.pending_benchmarks.length})
                  </h2>
                  {queue!.pending_benchmarks.map((item) => (
                    <Card key={item.benchmark_id} className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openSwimmerDetail(item.member_id)}
                            className="text-sm font-bold text-cyan-700 hover:underline"
                          >
                            {item.member_name}
                          </button>
                          {item.pod_name && <Badge>{item.pod_name}</Badge>}
                          <Badge variant="info">
                            {STROKE_LABELS[item.stroke]} ·{" "}
                            {BENCHMARK_TYPE_LABELS[item.benchmark_type]}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatBenchmarkSummary(item)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.recorded_at).toLocaleDateString("en-NG")}
                          {item.pool_name ? ` · ${item.pool_name}` : ""}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-slate-600 italic">&ldquo;{item.notes}&rdquo;</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          placeholder="Verification note (required if rejecting)..."
                          value={notesByItem[item.benchmark_id] ?? ""}
                          onChange={(e) =>
                            setNotesByItem((prev) => ({
                              ...prev,
                              [item.benchmark_id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            disabled={busyId === item.benchmark_id}
                            onClick={() =>
                              void handleQueueBenchmarkAction(item.benchmark_id, "verify")
                            }
                            className="gap-1 !bg-emerald-600 hover:!bg-emerald-500"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.benchmark_id}
                            onClick={() =>
                              void handleQueueBenchmarkAction(item.benchmark_id, "reject")
                            }
                            className="gap-1 !text-rose-700 !border-rose-200 hover:!bg-rose-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: CLUB BENCHMARK DAY BATCH RECORDER */}
      {tab === "benchmark_day" && (
        <Card className="p-5">
          <form onSubmit={handleSubmitBatch} className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Record Club Benchmark Day (Batch Verified)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Log SPL, SWOLF, Distance, Time Trials, or Stroke Rate for multiple swimmers in
                one session. Every row saves immediately as{" "}
                <strong>Coach / Pod Verified</strong> with shared pool length.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Benchmark Day label"
                value={dayLabel}
                onChange={(e) => setDayLabel(e.target.value)}
                required
              />
              <Input
                label="Date"
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                required
              />
              <Select
                label="Partner pool"
                value={dayPoolId}
                onChange={(e) => handleBatchPoolSelect(e.target.value)}
              >
                <option value="">Manual pool entry</option>
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.pool_length_m ? ` (${p.pool_length_m}m)` : ""}
                  </option>
                ))}
              </Select>
              <Input
                label="Pool length (m)"
                type="number"
                step="0.5"
                min={5}
                max={100}
                value={dayPoolLengthM}
                onChange={(e) => setDayPoolLengthM(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              {batchRows.map((row, idx) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Entry #{idx + 1}
                    </span>
                    {batchRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBatchRows((prev) => prev.filter((r) => r.key !== row.key))
                        }
                        className="text-xs text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                      label="Swimmer"
                      value={row.member_id}
                      onChange={(e) => updateBatchRow(row.key, { member_id: e.target.value })}
                      required
                    >
                      <option value="">Select swimmer…</option>
                      {roster.map((m) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.member_name}
                          {m.pod_name ? ` (${m.pod_name})` : ""}
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Metric"
                      value={row.benchmark_type}
                      onChange={(e) =>
                        updateBatchRow(row.key, {
                          benchmark_type: e.target.value as BenchmarkType,
                        })
                      }
                    >
                      {(Object.keys(BENCHMARK_TYPE_LABELS) as BenchmarkType[]).map((bt) => (
                        <option key={bt} value={bt}>
                          {BENCHMARK_TYPE_LABELS[bt]}
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Stroke"
                      value={row.stroke}
                      onChange={(e) =>
                        updateBatchRow(row.key, {
                          stroke: e.target.value as BenchmarkStroke,
                        })
                      }
                    >
                      {(Object.keys(STROKE_LABELS) as BenchmarkStroke[]).map((st) => (
                        <option key={st} value={st}>
                          {STROKE_LABELS[st]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    {(row.benchmark_type === "max_distance" ||
                      row.benchmark_type === "time_trial" ||
                      row.benchmark_type === "open_water") && (
                      <Input
                        label="Distance (m)"
                        type="number"
                        min={1}
                        required
                        value={row.distance_m}
                        onChange={(e) => updateBatchRow(row.key, { distance_m: e.target.value })}
                      />
                    )}
                    {(row.benchmark_type === "time_trial" ||
                      row.benchmark_type === "spl" ||
                      row.benchmark_type === "swolf" ||
                      row.benchmark_type === "open_water" ||
                      row.benchmark_type === "max_distance") && (
                      <Input
                        label="Time (s)"
                        type="number"
                        step="0.1"
                        min={1}
                        required={row.benchmark_type === "time_trial"}
                        value={row.duration_seconds}
                        onChange={(e) =>
                          updateBatchRow(row.key, { duration_seconds: e.target.value })
                        }
                      />
                    )}
                    {(row.benchmark_type === "spl" || row.benchmark_type === "swolf") && (
                      <Input
                        label="Strokes (SPL)"
                        type="number"
                        min={1}
                        required={row.benchmark_type === "spl"}
                        value={row.stroke_count}
                        onChange={(e) =>
                          updateBatchRow(row.key, { stroke_count: e.target.value })
                        }
                      />
                    )}
                    {row.benchmark_type === "stroke_rate" && (
                      <Input
                        label="Stroke Rate (SPM)"
                        type="number"
                        step="0.5"
                        min={10}
                        required
                        value={row.stroke_rate_spm}
                        onChange={(e) =>
                          updateBatchRow(row.key, { stroke_rate_spm: e.target.value })
                        }
                      />
                    )}
                    <Input
                      label="Coaching note (optional)"
                      value={row.verifier_notes}
                      onChange={(e) =>
                        updateBatchRow(row.key, { verifier_notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchRows((prev) => [...prev, makeEmptyDraft()])}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Another Swimmer Row
              </Button>
              <Button type="submit" disabled={submittingBatch}>
                {submittingBatch
                  ? "Recording..."
                  : `Save ${batchRows.length} Verified ${batchRows.length === 1 ? "Entry" : "Entries"}`}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: SWIMMER ROSTER & DETAIL INSPECTOR */}
      {tab === "roster" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search swimmer by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {loadingDetail && <LoadingCard text="Opening swimmer scorecard…" />}

          {roster.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-500">
              No swimmers matched your current scope.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {roster.map((m) => (
                <Card
                  key={m.member_id}
                  className="p-4 flex flex-col justify-between gap-3 hover:border-cyan-300 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{m.member_name}</p>
                        {m.pod_name && (
                          <p className="text-xs text-slate-500">Pod: {m.pod_name}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.is_club_ready && <Badge variant="success">Club Ready</Badge>}
                        {m.pending_reviews_count > 0 && (
                          <Badge variant="warning">
                            {m.pending_reviews_count} pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>
                        Verified skills:{" "}
                        <strong>
                          {m.verified_skills_count}/{m.total_skills}
                        </strong>
                      </span>
                      {m.top_distance_m && (
                        <span>
                          Top distance: <strong>{m.top_distance_m}m</strong>
                        </span>
                      )}
                    </div>

                    {m.verified_strokes_unlocked.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {m.verified_strokes_unlocked.map((st) => (
                          <Badge key={st} variant="info">
                            ✓ {st}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void openSwimmerDetail(m.member_id)}
                    >
                      Open Scorecard &amp; Verify
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
