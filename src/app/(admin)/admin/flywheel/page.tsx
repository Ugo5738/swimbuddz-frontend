"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import type {
  CohortFillSnapshot,
  FlywheelOverview,
  FunnelConversionSnapshot,
  RefreshFlywheelResponse,
} from "@/lib/types/flywheel";
import { AlertTriangle, GraduationCap, RefreshCw, TrendingUp, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Format a 0.0–1.0 rate as a percentage string, or em-dash if null. */
function formatPct(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Color a fill-rate cell: red <30%, amber <50%, green ≥50%. */
function fillRateClass(rate: number): string {
  if (rate < 0.3) return "bg-red-100 text-red-700";
  if (rate < 0.5) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

/** Whether a cohort is in danger zone: ≤14 days out and <50% full. */
function isDangerCohort(c: CohortFillSnapshot): boolean {
  return c.days_until_start != null && c.days_until_start <= 14 && c.fill_rate < 0.5;
}

export default function AdminFlywheelPage() {
  const [overview, setOverview] = useState<FlywheelOverview | null>(null);
  const [cohorts, setCohorts] = useState<CohortFillSnapshot[]>([]);
  const [funnel, setFunnel] = useState<FunnelConversionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, cohortsResult, funnelResult] = await Promise.allSettled([
        apiGet<FlywheelOverview>("/api/v1/admin/reports/flywheel/overview", {
          auth: true,
        }),
        apiGet<CohortFillSnapshot[]>("/api/v1/admin/reports/flywheel/cohorts?sort=fill_rate_asc", {
          auth: true,
        }),
        apiGet<FunnelConversionSnapshot[]>("/api/v1/admin/reports/flywheel/funnel?limit=20", {
          auth: true,
        }),
      ]);

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
      } else {
        // 404 / no snapshot yet: leave overview null and let the empty state render.
        setOverview(null);
      }
      if (cohortsResult.status === "fulfilled") {
        setCohorts(cohortsResult.value || []);
      } else {
        setCohorts([]);
      }
      if (funnelResult.status === "fulfilled") {
        setFunnel(funnelResult.value || []);
      } else {
        setFunnel([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load flywheel data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await apiPost<RefreshFlywheelResponse>(
        "/api/v1/admin/reports/flywheel/refresh",
        undefined,
        { auth: true }
      );
      toast.success(
        result?.message || "Flywheel refresh enqueued. Snapshots update in 1-2 minutes."
      );
      // Wait briefly, then refetch — the worker may not be done, but at least
      // the UI re-pulls the latest available state.
      await new Promise((r) => setTimeout(r, 1500));
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to enqueue flywheel refresh");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading flywheel metrics..." />
      </div>
    );
  }

  // Latest snapshot per stage for the funnel diagram.
  const latestByStage = new Map<string, FunnelConversionSnapshot>();
  for (const snap of funnel) {
    const existing = latestByStage.get(snap.funnel_stage);
    if (!existing || snap.snapshot_taken_at > existing.snapshot_taken_at) {
      latestByStage.set(snap.funnel_stage, snap);
    }
  }
  const funnelStages = Array.from(latestByStage.values());

  const noData = !overview && cohorts.length === 0 && funnel.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Flywheel Metrics</h1>
          <p className="text-sm sm:text-base text-slate-600">
            Is the SwimBuddz ecosystem actually flowing?
          </p>
          {overview?.last_refreshed_at && (
            <p className="text-xs text-slate-500">
              Last refreshed {new Date(overview.last_refreshed_at).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && <Card className="p-4 bg-red-50 text-red-700 text-sm">{error}</Card>}

      {/* Stale banner */}
      {overview?.is_stale && (
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Data is stale</p>
            <p className="text-amber-700 mt-0.5">
              No flywheel snapshot in the last 36 hours. Click{" "}
              <span className="font-medium">Refresh</span> above to recompute.
            </p>
          </div>
        </Card>
      )}

      {noData ? (
        <Card className="p-8 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">No flywheel data yet</h2>
          <p className="text-sm text-slate-500 mt-2">
            Click <span className="font-medium">Refresh</span> to compute the first snapshot.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
              bg="bg-purple-50"
              label="Cohort fill avg"
              value={formatPct(overview?.cohort_fill_avg ?? null)}
              secondary={
                overview
                  ? `${overview.open_cohorts_count} open cohorts, ${overview.open_cohorts_at_risk_count} at risk`
                  : null
              }
            />
            <KpiCard
              icon={<Users className="h-5 w-5 text-cyan-600" />}
              bg="bg-cyan-50"
              label="Community → Club"
              value={formatPct(overview?.community_to_club_rate ?? null)}
              secondary={overview?.community_to_club_period || null}
            />
            <KpiCard
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              bg="bg-blue-50"
              label="Club → Academy"
              value={formatPct(overview?.club_to_academy_rate ?? null)}
              secondary={overview?.club_to_academy_period || null}
            />
            <KpiCard
              icon={<Wallet className="h-5 w-5 text-emerald-600" />}
              bg="bg-emerald-50"
              label="Wallet cross-service"
              value={formatPct(overview?.wallet_cross_service_rate ?? null)}
              secondary={overview ? `${overview.wallet_active_users} active wallet users` : null}
            />
          </div>

          {/* Cohorts table */}
          <CohortsSection cohorts={cohorts} />

          {/* Funnel */}
          <FunnelSection stages={funnelStages} />
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  bg,
  label,
  value,
  secondary,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  secondary: string | null;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
          {secondary ? <p className="text-xs text-slate-500 mt-1 truncate">{secondary}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function CohortsSection({ cohorts }: { cohorts: CohortFillSnapshot[] }) {
  if (cohorts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="font-semibold text-slate-900 mb-1">Cohorts</h2>
        <p className="text-sm text-slate-500">No cohort fill snapshots available yet.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Cohorts ({cohorts.length})</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sorted by fill rate (lowest first) — act on cold cohorts first.
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cohort</th>
              <th className="px-4 py-3 text-left font-medium">Program</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Capacity</th>
              <th className="px-4 py-3 text-right font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Pending</th>
              <th className="px-4 py-3 text-right font-medium">Fill rate</th>
              <th className="px-4 py-3 text-right font-medium">Days to start</th>
              <th className="px-4 py-3 text-left font-medium">Starts at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cohorts.map((c) => {
              const danger = isDangerCohort(c);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/admin/academy/cohorts/${c.cohort_id}`}
                      className="hover:text-cyan-700 hover:underline"
                    >
                      {c.cohort_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.program_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                      {c.cohort_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{c.capacity}</td>
                  <td className="px-4 py-3 text-right">{c.active_enrollments}</td>
                  <td className="px-4 py-3 text-right">{c.pending_approvals}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${fillRateClass(c.fill_rate)}`}
                    >
                      {formatPct(c.fill_rate)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${danger ? "text-red-700 font-semibold" : "text-slate-600"}`}
                  >
                    {c.days_until_start != null ? c.days_until_start : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.starts_at
                      ? new Date(c.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {cohorts.map((c) => {
          const danger = isDangerCohort(c);
          return (
            <Link
              key={c.id}
              href={`/admin/academy/cohorts/${c.cohort_id}`}
              className="block p-4 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.cohort_name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.program_name || "—"}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${fillRateClass(c.fill_rate)}`}
                >
                  {formatPct(c.fill_rate)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-2">
                <div>
                  <span className="block text-slate-400">Capacity</span>
                  {c.active_enrollments}/{c.capacity}
                </div>
                <div>
                  <span className="block text-slate-400">Pending</span>
                  {c.pending_approvals}
                </div>
                <div>
                  <span className="block text-slate-400">Days</span>
                  <span className={danger ? "text-red-700 font-semibold" : ""}>
                    {c.days_until_start != null ? c.days_until_start : "—"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function FunnelSection({ stages }: { stages: FunnelConversionSnapshot[] }) {
  if (stages.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="font-semibold text-slate-900 mb-1">Funnel</h2>
        <p className="text-sm text-slate-500">No funnel snapshots available yet.</p>
      </Card>
    );
  }

  // Stable order: c→c, c→a, then anything else (e.g. wallet_cross_service).
  const stageOrder = ["community_to_club", "club_to_academy", "wallet_cross_service"];
  const sorted = [...stages].sort((a, b) => {
    const ia = stageOrder.indexOf(a.funnel_stage);
    const ib = stageOrder.indexOf(b.funnel_stage);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // Max source_count for shared bar scaling.
  const maxSource = Math.max(...sorted.map((s) => s.source_count), 1);

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="font-semibold text-slate-900 mb-1">Funnel</h2>
      <p className="text-xs text-slate-500 mb-4">
        Latest snapshot per stage — bars scaled to the largest source pool.
      </p>
      <ul className="space-y-4">
        {sorted.map((s) => {
          const sourcePct = (s.source_count / maxSource) * 100;
          const convertedPct = s.source_count > 0 ? (s.converted_count / maxSource) * 100 : 0;
          return (
            <li key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900 capitalize">
                  {s.funnel_stage.replace(/_/g, " ")}
                </span>
                <span className="text-slate-600">
                  {s.converted_count.toLocaleString()} / {s.source_count.toLocaleString()}{" "}
                  <span className="text-slate-400">({formatPct(s.conversion_rate)})</span>
                </span>
              </div>
              <div
                className="relative h-6 w-full rounded-md bg-slate-100 overflow-hidden"
                role="img"
                aria-label={`${s.funnel_stage}: ${s.converted_count} of ${s.source_count} converted`}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-cyan-200"
                  style={{ width: `${sourcePct}%` }}
                />
                <div
                  className="absolute left-0 top-0 h-full bg-cyan-600"
                  style={{ width: `${convertedPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{s.cohort_period}</span>
                <span>{s.observation_window_days}-day observation window</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-cyan-200" />
          Source
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-cyan-600" />
          Converted
        </span>
      </div>
    </Card>
  );
}
