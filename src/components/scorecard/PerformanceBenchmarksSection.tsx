"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  BENCHMARK_TYPE_LABELS,
  CLUB_ONLY_BENCHMARK_TYPES,
  STROKE_LABELS,
  type BenchmarkItem,
  type BenchmarkStroke,
  type BenchmarkTrendSeries,
  type BenchmarkType,
  type CreateBenchmarkPayload,
  type PersonalBestRecord,
  type PoolOption,
  type StrokeLabSection,
  computeLivePacePer100m,
  computeLiveSwolf,
  createMyBenchmark,
  deleteMyBenchmark,
  fetchPartnerPoolsForBenchmark,
  formatBenchmarkSummary,
  formatPacePer100m,
  recordVerifiedBenchmark,
} from "@/lib/scorecard";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BenchmarkTrendChart } from "./BenchmarkTrendChart";
import { TrustBadge, VerificationStatusBadge } from "./TrustBadge";

type Props = {
  memberId: string;
  hasFullPerformanceAccess: boolean;
  canEditSelf: boolean;
  canVerify: boolean;
  preferredPoolLengthM?: number | null;
  personalBests: PersonalBestRecord[];
  benchmarks: BenchmarkItem[];
  trends: BenchmarkTrendSeries[];
  strokelab: StrokeLabSection;
  onUpdated: () => Promise<void> | void;
};

const ALL_STROKES: BenchmarkStroke[] = [
  "freestyle",
  "backstroke",
  "breaststroke",
  "butterfly",
  "medley",
  "open_water",
  "any",
];

const ALL_BENCHMARK_TYPES: BenchmarkType[] = [
  "max_distance",
  "time_trial",
  "spl",
  "stroke_rate",
  "swolf",
  "open_water",
];

export function PerformanceBenchmarksSection({
  memberId,
  hasFullPerformanceAccess,
  canEditSelf,
  canVerify,
  preferredPoolLengthM,
  personalBests,
  benchmarks,
  trends,
  strokelab,
  onUpdated,
}: Props) {
  const [activeTrendKey, setActiveTrendKey] = useState<string>("max_distance");
  const [logOpen, setLogOpen] = useState(false);
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [benchmarkType, setBenchmarkType] = useState<BenchmarkType>("max_distance");
  const [stroke, setStroke] = useState<BenchmarkStroke>("freestyle");
  const [recordedDate, setRecordedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [distanceM, setDistanceM] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [strokeCount, setStrokeCount] = useState("");
  const [strokeRateSpm, setStrokeRateSpm] = useState("");
  const [swolfScore, setSwolfScore] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [poolName, setPoolName] = useState("");
  const [poolLengthM, setPoolLengthM] = useState(
    preferredPoolLengthM ? String(preferredPoolLengthM) : "25",
  );
  const [benchmarkDayLabel, setBenchmarkDayLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [requestVerification, setRequestVerification] = useState(false);

  useEffect(() => {
    if (!logOpen || pools.length > 0) return;
    fetchPartnerPoolsForBenchmark().then(setPools);
  }, [logOpen, pools.length]);

  const activeSeries = useMemo(() => {
    return (
      trends.find((t) => t.metric_key === activeTrendKey) ??
      trends[0] ?? {
        metric_key: "max_distance",
        title: "Continuous Distance Progression",
        unit: "m",
        higher_is_better: true,
        points: [],
      }
    );
  }, [trends, activeTrendKey]);

  const livePace = computeLivePacePer100m(
    distanceM ? Number(distanceM) : undefined,
    durationSeconds ? Number(durationSeconds) : undefined,
  );
  const liveSwolf =
    benchmarkType === "spl" || benchmarkType === "swolf"
      ? computeLiveSwolf(
          durationSeconds ? Number(durationSeconds) : undefined,
          strokeCount ? Number(strokeCount) : undefined,
        )
      : null;

  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    const matched = pools.find((p) => p.id === poolId);
    if (matched) {
      setPoolName(matched.name);
      if (matched.pool_length_m) {
        setPoolLengthM(String(matched.pool_length_m));
      }
    }
  };

  const resetForm = () => {
    setBenchmarkType("max_distance");
    setStroke("freestyle");
    setDistanceM("");
    setDurationSeconds("");
    setStrokeCount("");
    setStrokeRateSpm("");
    setSwolfScore("");
    setSelectedPoolId("");
    setPoolName("");
    setPoolLengthM(preferredPoolLengthM ? String(preferredPoolLengthM) : "25");
    setBenchmarkDayLabel("");
    setNotes("");
    setRequestVerification(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateBenchmarkPayload = {
      stroke: benchmarkType === "open_water" ? "open_water" : stroke,
      benchmark_type: benchmarkType,
      recorded_at: recordedDate ? new Date(`${recordedDate}T12:00:00Z`).toISOString() : undefined,
      distance_m: distanceM ? Number(distanceM) : undefined,
      duration_seconds: durationSeconds ? Number(durationSeconds) : undefined,
      stroke_count: strokeCount ? Number(strokeCount) : undefined,
      stroke_rate_spm: strokeRateSpm ? Number(strokeRateSpm) : undefined,
      swolf_score: swolfScore ? Number(swolfScore) : undefined,
      pool_length_m: poolLengthM ? Number(poolLengthM) : undefined,
      pool_id: selectedPoolId || undefined,
      pool_name: poolName.trim() || undefined,
      benchmark_day_label: benchmarkDayLabel.trim() || undefined,
      notes: notes.trim() || undefined,
      request_verification: canVerify ? false : requestVerification,
    };

    setSubmitting(true);
    try {
      if (canVerify && !canEditSelf) {
        await recordVerifiedBenchmark(memberId, payload);
        toast.success("Recorded Coach / Pod-verified benchmark.");
      } else {
        await createMyBenchmark(payload);
        toast.success(
          requestVerification
            ? "Benchmark logged and submitted for verification."
            : "Benchmark logged to your Scorecard.",
        );
      }
      setLogOpen(false);
      resetForm();
      await onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log benchmark");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (benchmarkId: string) => {
    if (!confirm("Delete this self-logged benchmark?")) return;
    setDeletingId(benchmarkId);
    try {
      await deleteMyBenchmark(benchmarkId);
      toast.success("Benchmark deleted.");
      await onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete benchmark");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Performance &amp; Efficiency Benchmarks
          </h2>
          <p className="text-sm text-slate-500">
            Distance covered, Strokes Per Length (SPL), Stroke Rate (SPM), SWOLF, and
            timed swims — always tagged with pool length so venues never mix.
          </p>
        </div>
        {(canEditSelf || canVerify) && (
          <Button onClick={() => setLogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {canVerify && !canEditSelf ? "Log Verified Benchmark" : "Log Benchmark"}
          </Button>
        )}
      </div>

      {/* Progressive Club Perk Banner for non-Club members */}
      {!hasFullPerformanceAccess && canEditSelf && (
        <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-950">
                <Lock className="h-4 w-4 text-cyan-700" />
                Full Performance Benchmarks &amp; Verified Benchmark Days are a Club Perk
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                You can log your <strong>Max Continuous Distance</strong> right now and see
                your <strong>Stroke Lab AI</strong> snapshots below. Join Weekly Club to unlock
                SPL, SWOLF, Stroke Rate, Time Trials, Open Water tracking, trend charts, and
                Coach/Pod-verified Benchmark Days.
              </p>
            </div>
            <Link
              href="/upgrade/club/readiness"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition"
            >
              Explore Club
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}

      {/* Personal Bests Grid */}
      {personalBests.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {personalBests.map((pb) => (
            <Card key={pb.key} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{pb.label}</span>
                </div>
                <TrustBadge source={pb.verification_source} compact />
              </div>
              <p className="text-2xl font-bold text-slate-900">{pb.display_value}</p>
              <p className="text-xs text-slate-500">
                {new Date(pb.recorded_at).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {pb.pool_name ? ` · ${pb.pool_name}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Stroke Lab AI Mechanics Strip */}
      <Card className="p-5 space-y-3 border-cyan-100 bg-gradient-to-r from-white to-cyan-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-cyan-100 p-2 text-cyan-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Stroke Lab AI Mechanics
              </h3>
              <p className="text-xs text-slate-500">
                Synced automatically from your completed video analyses (private to you &amp; coaches)
              </p>
            </div>
          </div>
          {canEditSelf && (
            <a
              href="https://analyzer.swimbuddz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Open Stroke Lab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {strokelab.available && strokelab.total_analyses > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <p className="text-[11px] text-slate-500">Stroke Rate (SPM)</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {strokelab.latest_stroke_rate_spm != null
                    ? `${strokelab.latest_stroke_rate_spm.toFixed(1)}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <p className="text-[11px] text-slate-500">Body Roll Proxy</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {strokelab.latest_body_roll_degrees != null
                    ? `${strokelab.latest_body_roll_degrees.toFixed(0)}°`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <p className="text-[11px] text-slate-500">Left Breath Share</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {strokelab.latest_breath_balance_left_ratio != null
                    ? `${Math.round(strokelab.latest_breath_balance_left_ratio * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <p className="text-[11px] text-slate-500">Analyses Completed</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {strokelab.total_analyses}
                </p>
              </div>
            </div>
            {strokelab.latest_summary_text && (
              <p className="rounded-lg bg-white/90 p-3 text-xs text-slate-700 ring-1 ring-cyan-100">
                <span className="font-semibold text-cyan-800">Latest TI takeaway:</span>{" "}
                {strokelab.latest_summary_text}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {strokelab.available
              ? "No completed Stroke Lab analyses yet. Upload a 10–20s side-view swim clip in Stroke Lab to automatically populate your stroke rate and mechanics here."
              : "Stroke Lab mechanics will appear here once synced."}
          </p>
        )}
      </Card>

      {/* Progression Trend Charts */}
      {(hasFullPerformanceAccess ||
        trends.some((t) => t.metric_key === "max_distance" && t.points.length > 0)) && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-600" />
              Progression Over Time
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {trends
                .filter(
                  (t) => hasFullPerformanceAccess || t.metric_key === "max_distance",
                )
                .map((t) => (
                  <button
                    key={t.metric_key}
                    type="button"
                    onClick={() => setActiveTrendKey(t.metric_key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      activeSeries.metric_key === t.metric_key
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.title.split(" ")[0] === "Continuous"
                      ? "Distance"
                      : t.title.split(" ")[0]}
                    {t.points.length > 0 ? ` (${t.points.length})` : ""}
                  </button>
                ))}
            </div>
          </div>

          <BenchmarkTrendChart series={activeSeries} />
        </Card>
      )}

      {/* Benchmark History Table */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Benchmark History</h3>
        {benchmarks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No swim benchmarks logged yet. Log your longest continuous swim or record a
            Club Benchmark Day entry to start tracking progress.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {benchmarks.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {STROKE_LABELS[b.stroke]} · {BENCHMARK_TYPE_LABELS[b.benchmark_type]}
                    </span>
                    <TrustBadge source={b.verification_source} compact />
                    <VerificationStatusBadge status={b.verification_status} />
                    {b.benchmark_day_label && (
                      <Badge variant="info">{b.benchmark_day_label}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-cyan-800">
                    {formatBenchmarkSummary(b)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(b.recorded_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {b.pool_name ? ` · ${b.pool_name}` : ""}
                    {b.verified_by_name ? ` · Verified by ${b.verified_by_name}` : ""}
                  </p>
                  {b.notes && (
                    <p className="text-xs text-slate-600 italic">&ldquo;{b.notes}&rdquo;</p>
                  )}
                  {b.verifier_notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">
                      Feedback: {b.verifier_notes}
                    </p>
                  )}
                </div>

                {canEditSelf &&
                  !(
                    b.verification_source === "coach_verified" &&
                    b.verification_status === "verified"
                  ) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === b.id}
                      onClick={() => void handleDelete(b.id)}
                      className="text-slate-400 hover:text-rose-600 self-start sm:self-center"
                      aria-label="Delete benchmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Benchmark Modal */}
      <Modal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        title={
          canVerify && !canEditSelf
            ? "Record Verified Swim Benchmark"
            : "Log Swim Benchmark"
        }
        size="wide"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Benchmark type"
              value={benchmarkType}
              onChange={(e) => setBenchmarkType(e.target.value as BenchmarkType)}
              required
            >
              {ALL_BENCHMARK_TYPES.map((bt) => {
                const locked =
                  canEditSelf &&
                  !canVerify &&
                  !hasFullPerformanceAccess &&
                  CLUB_ONLY_BENCHMARK_TYPES.includes(bt);
                return (
                  <option key={bt} value={bt} disabled={locked}>
                    {BENCHMARK_TYPE_LABELS[bt]}
                    {locked ? " (Club Perk)" : ""}
                  </option>
                );
              })}
            </Select>

            {benchmarkType !== "open_water" && (
              <Select
                label="Stroke"
                value={stroke}
                onChange={(e) => setStroke(e.target.value as BenchmarkStroke)}
                required
              >
                {ALL_STROKES.map((st) => (
                  <option key={st} value={st}>
                    {STROKE_LABELS[st]}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              required
            />

            {benchmarkType !== "open_water" && (
              <Select
                label="SwimBuddz partner pool (optional)"
                value={selectedPoolId}
                onChange={(e) => handleSelectPool(e.target.value)}
              >
                <option value="">Other / manual pool entry</option>
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.pool_length_m ? ` (${p.pool_length_m}m)` : ""}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={benchmarkType === "open_water" ? "Venue / Beach" : "Pool name"}
              placeholder={
                benchmarkType === "open_water"
                  ? "e.g. Landmark Beach / Tarkwa Bay"
                  : "e.g. Rowe Park / Oduduwa House"
              }
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
            />

            {benchmarkType !== "open_water" && (
              <Input
                label="Pool length (meters)"
                type="number"
                step="0.5"
                min={5}
                max={100}
                required={benchmarkType === "spl" || benchmarkType === "swolf"}
                placeholder="e.g. 25"
                hint="Required for SPL & SWOLF so 15m/20m/25m pools never mix."
                value={poolLengthM}
                onChange={(e) => setPoolLengthM(e.target.value)}
              />
            )}
          </div>

          {/* Metric-specific quantitative inputs */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(benchmarkType === "max_distance" ||
              benchmarkType === "time_trial" ||
              benchmarkType === "open_water") && (
              <Input
                label="Distance (meters)"
                type="number"
                min={1}
                max={50000}
                required
                placeholder="e.g. 100, 400, 1000"
                value={distanceM}
                onChange={(e) => setDistanceM(e.target.value)}
              />
            )}

            {(benchmarkType === "time_trial" ||
              benchmarkType === "max_distance" ||
              benchmarkType === "open_water" ||
              benchmarkType === "spl" ||
              benchmarkType === "swolf") && (
              <Input
                label={
                  benchmarkType === "spl" || benchmarkType === "swolf"
                    ? "Single-length time (seconds)"
                    : "Duration (seconds)"
                }
                type="number"
                step="0.1"
                min={1}
                required={benchmarkType === "time_trial"}
                placeholder={
                  benchmarkType === "spl" || benchmarkType === "swolf"
                    ? "e.g. 22.5 (auto-computes SWOLF)"
                    : "e.g. 115"
                }
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
              />
            )}

            {(benchmarkType === "spl" || benchmarkType === "swolf") && (
              <Input
                label="Strokes in one length (SPL)"
                type="number"
                min={1}
                max={500}
                required={benchmarkType === "spl"}
                placeholder="e.g. 18"
                value={strokeCount}
                onChange={(e) => setStrokeCount(e.target.value)}
              />
            )}

            {benchmarkType === "stroke_rate" && (
              <Input
                label="Stroke Rate (SPM)"
                type="number"
                step="0.5"
                min={10}
                max={180}
                required
                placeholder="e.g. 54"
                value={strokeRateSpm}
                onChange={(e) => setStrokeRateSpm(e.target.value)}
              />
            )}

            {benchmarkType === "swolf" && (
              <Input
                label="Direct SWOLF score (optional if time + strokes entered)"
                type="number"
                step="0.5"
                min={5}
                max={500}
                placeholder="e.g. 39.5"
                value={swolfScore}
                onChange={(e) => setSwolfScore(e.target.value)}
              />
            )}
          </div>

          {/* Live Server-Matched Formula Preview */}
          {(livePace !== null || liveSwolf !== null) && (
            <Alert variant="info">
              <div className="flex flex-wrap gap-4 text-xs font-medium">
                {livePace !== null && (
                  <span>
                    Calculated Pace: <strong>{formatPacePer100m(livePace)}</strong>
                  </span>
                )}
                {liveSwolf !== null && (
                  <span>
                    Calculated SWOLF: <strong>{liveSwolf}</strong> (time + strokes)
                  </span>
                )}
              </div>
            </Alert>
          )}

          {canVerify && !canEditSelf && (
            <Input
              label="Benchmark Day label (optional)"
              placeholder="e.g. Q4 2026 Club Benchmark Day"
              value={benchmarkDayLabel}
              onChange={(e) => setBenchmarkDayLabel(e.target.value)}
            />
          )}

          <Textarea
            label={
              benchmarkType === "open_water"
                ? "Conditions & notes (chop, current, buoy loop)"
                : "Session notes (private)"
            }
            placeholder="Optional context (smartwatch source, relaxed vs. race pace, feel in water)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          {canEditSelf && !canVerify && (
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={requestVerification}
                onChange={(e) => setRequestVerification(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span>
                <span className="font-semibold text-slate-900 block">
                  Request Coach / Pod Lead verification
                </span>
                <span className="text-xs text-slate-500">
                  Flag this benchmark for your Coach or Pod Lead to confirm if they witnessed it.
                </span>
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Benchmark"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
