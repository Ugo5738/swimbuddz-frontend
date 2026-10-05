"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  BarChart3,
  BookOpen,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Mail,
  MapPin,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface QuarterSummary {
  year: number;
  quarter: number;
  label: string;
  status: string;
  computed_at: string | null;
}

interface SnapshotStatus {
  year: number;
  quarter: number;
  status: string;
  member_count: number;
  completed_at: string | null;
}

interface MemberReport {
  id: string;
  member_name: string;
  member_tier: string | null;
  total_sessions_attended: number;
  attendance_rate: number;
  streak_longest: number;
  milestones_achieved: number;
  total_spent_ngn: number;
  bubbles_earned: number;
  volunteer_hours: number;
}

interface Comparison {
  current: number | null;
  previous: number | null;
  delta: number | null;
  delta_pct: number | null;
}

interface BusinessReview {
  year: number;
  quarter: number;
  label: string;
  starts_at: string;
  ends_at: string;
  snapshot_status: string | null;
  snapshot_generated_at: string | null;
  executive_scorecard: Record<string, Comparison>;
  community: Record<string, unknown>;
  academy: Record<string, unknown>;
  club: Record<string, unknown>;
  finance: {
    revenue_ngn: number;
    expenses_ngn: number;
    net_income_ngn: number;
    cogs_ngn: number;
    gross_margin_ngn: number;
    gross_margin_pct: number;
    profitability_reliable: boolean;
    deferred_revenue_ngn: number;
    cash_ngn: number;
    by_domain: Array<{
      domain: string | null;
      revenue_ngn: number;
      cogs_ngn: number;
      gross_margin_ngn: number;
      gross_margin_pct: number;
    }>;
    available: boolean;
    note: string | null;
  };
  locations: Array<{
    location: string;
    sessions: number;
    scheduled_pool_hours: number;
    session_capacity: number;
    attendance: number;
    guest_attendance: number;
    session_types: Record<string, number>;
    academy_cohorts: number;
    academy_active_enrollments: number;
    club_active_members: number;
  }>;
  session_mix: Record<string, number>;
  data_quality: string[];
  member_distribution_ready: boolean;
  member_distribution_blockers: string[];
  decisions: Array<{ key: string; title: string; prompt: string }>;
}

function previousQuarter(): { year: number; quarter: number } {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.ceil((now.getMonth() + 1) / 3) - 1;
  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }
  return { year, quarter };
}

function quarterEnd(year: number, quarter: number): Date {
  return new Date(year, quarter * 3, 0, 23, 59, 59);
}

function isCompletedQuarter(q: QuarterSummary): boolean {
  return q.status === "completed" && quarterEnd(q.year, q.quarter) < new Date();
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function percent(value: unknown): string {
  return typeof value === "number" ? `${(value * 100).toFixed(0)}%` : "N/A";
}

function displayNumber(value: unknown): string | number {
  return typeof value === "number" ? value : "N/A";
}

function money(value: number): string {
  return `₦${value.toLocaleString()}`;
}

export default function AdminReportsPage() {
  const fallback = useMemo(previousQuarter, []);
  const [availableQuarters, setAvailableQuarters] = useState<QuarterSummary[]>([]);
  const [selected, setSelected] = useState(fallback);
  const [review, setReview] = useState<BusinessReview | null>(null);
  const [members, setMembers] = useState<MemberReport[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadQuarter = useCallback(async (year: number, quarter: number) => {
    setLoading(true);
    setError(null);
    setReview(null);
    setMembers([]);
    setSnapshotStatus(null);

    const [reviewData, membersData, statusData] = await Promise.allSettled([
      apiGet<BusinessReview>(
        `/api/v1/admin/reports/quarterly/business-review?year=${year}&quarter=${quarter}`,
        { auth: true }
      ),
      apiGet<MemberReport[]>(
        `/api/v1/admin/reports/quarterly/members?year=${year}&quarter=${quarter}&sort=attendance&limit=200`,
        { auth: true }
      ),
      apiGet<SnapshotStatus>(
        `/api/v1/admin/reports/quarterly/status?year=${year}&quarter=${quarter}`,
        { auth: true }
      ),
    ]);

    if (reviewData.status === "fulfilled") setReview(reviewData.value);
    if (membersData.status === "fulfilled") setMembers(membersData.value);
    if (statusData.status === "fulfilled") setSnapshotStatus(statusData.value);

    if (
      reviewData.status === "rejected" &&
      membersData.status === "rejected" &&
      statusData.status === "rejected"
    ) {
      setError("No report has been generated for this quarter yet.");
    }
    setLoading(false);
  }, []);

  const loadAvailable = useCallback(async () => {
    try {
      const quarters = await apiGet<QuarterSummary[]>(
        "/api/v1/admin/reports/quarterly/available",
        { auth: true }
      );
      setAvailableQuarters(quarters);
      const latestCompleted = quarters.find(isCompletedQuarter);
      if (latestCompleted) {
        setSelected({
          year: latestCompleted.year,
          quarter: latestCompleted.quarter,
        });
        return;
      }
    } catch {
      // A first-time reporting install can legitimately have no snapshots.
    }
    setSelected(fallback);
  }, [fallback]);

  useEffect(() => {
    void loadAvailable();
  }, [loadAvailable]);

  useEffect(() => {
    void loadQuarter(selected.year, selected.quarter);
  }, [loadQuarter, selected]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiPost<SnapshotStatus>(
        "/api/v1/admin/reports/quarterly/generate",
        selected,
        { auth: true }
      );
      await Promise.all([
        loadQuarter(selected.year, selected.quarter),
        loadAvailable(),
      ]);
      setSuccess(
        `${selected.quarter === fallback.quarter && selected.year === fallback.year ? "Quarter" : `Q${selected.quarter} ${selected.year}`} regenerated — ${result.member_count} member reports computed.`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);
    setError(null);
    setSuccess(null);
    try {
      const result: { sent: number; failed: number; skipped: number } = await apiPost(
        "/api/v1/admin/reports/quarterly/send-emails",
        selected,
        { auth: true }
      );
      setSuccess(
        `Emails sent: ${result.sent} delivered, ${result.failed} failed, ${result.skipped} skipped.`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send emails");
    } finally {
      setSendingEmails(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = await getCurrentAccessToken();
      const url = `${API_BASE_URL}/api/v1/admin/reports/quarterly/export.csv?year=${selected.year}&quarter=${selected.quarter}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `swimbuddz-Q${selected.quarter}-${selected.year}-report.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("Failed to export CSV");
    }
  };

  const completedOptions = availableQuarters.filter(isCompletedQuarter);
  const score = review?.executive_scorecard ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              Quarter-End Business Review
            </h1>
            <select
              value={`${selected.year}-${selected.quarter}`}
              onChange={(e) => {
                const [year, quarter] = e.target.value.split("-").map(Number);
                setSelected({ year, quarter });
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              {!completedOptions.some(
                (q) => q.year === selected.year && q.quarter === selected.quarter
              ) && (
                <option value={`${selected.year}-${selected.quarter}`}>
                  Q{selected.quarter} {selected.year}
                </option>
              )}
              {completedOptions.map((q) => (
                <option key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Management view: outcomes, economics, retention, delivery, and next-quarter decisions.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : snapshotStatus ? "Regenerate" : "Generate"}
          </button>
          {members.length > 0 && (
            <>
              <button
                onClick={handleSendEmails}
                disabled={sendingEmails || !review?.member_distribution_ready}
                title={
                  review?.member_distribution_ready
                    ? "Send member reports"
                    : review?.member_distribution_blockers.join(" ")
                }
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {sendingEmails ? "Sending..." : "Email Member Reports"}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && <Card className="p-4 bg-red-50 text-red-700 text-sm">{error}</Card>}
      {success && <Card className="p-4 bg-green-50 text-green-700 text-sm">{success}</Card>}
      {review && !review.member_distribution_ready && (
        <Card className="p-4 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          <strong>Member report email is paused.</strong>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {review.member_distribution_blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : review ? (
        <>
          {snapshotStatus && (
            <Card className="p-4 bg-cyan-50 border-cyan-200">
              <div className="flex items-center justify-between gap-4 flex-wrap text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{review.label}</span>
                  <span className="text-slate-500">
                    {" "}· {new Date(review.starts_at).toLocaleDateString()} – {new Date(review.ends_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-slate-500">
                  {snapshotStatus.member_count} member reports
                  {snapshotStatus.completed_at &&
                    ` · generated ${new Date(snapshotStatus.completed_at).toLocaleString()}`}
                </span>
              </div>
            </Card>
          )}

          <section className="space-y-3">
            <SectionHeading title="Executive scorecard" subtitle="Quarter-over-quarter operating signals" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <ComparisonCard label="Active swimmers" value={score.active_members} />
              <ComparisonCard label="Sessions held" value={score.sessions_held} />
              <ComparisonCard label="Attendance rate" value={score.attendance_rate} suffix="%" />
              <ComparisonCard label="New members" value={score.new_members} />
              <ComparisonCard label="Milestones achieved" value={score.milestones} />
              <ComparisonCard label="Swimmer pool hours" value={score.pool_hours} suffix="h" />
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading title="Financial performance" subtitle="Ledger-derived accounting view, not member-spend estimates" />
            {review.finance.available ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Revenue" value={money(review.finance.revenue_ngn)} icon={<FileSpreadsheet className="h-5 w-5" />} />
                  <MetricCard
                    label="Gross margin"
                    value={review.finance.profitability_reliable ? money(review.finance.gross_margin_ngn) : "Not reliable"}
                    detail={review.finance.profitability_reliable ? `${review.finance.gross_margin_pct.toFixed(1)}%` : "Direct costs/COGS incomplete"}
                    icon={<TrendingUp className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Net income"
                    value={review.finance.profitability_reliable ? money(review.finance.net_income_ngn) : "Not reliable"}
                    detail={review.finance.profitability_reliable ? undefined : "Expense classification incomplete"}
                    icon={review.finance.net_income_ngn >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  />
                  <MetricCard label="Cash position" value={money(review.finance.cash_ngn)} detail={`Deferred: ${money(review.finance.deferred_revenue_ngn)}`} icon={<FileSpreadsheet className="h-5 w-5" />} />
                </div>
                {!review.finance.profitability_reliable && review.finance.note && (
                  <Card className="p-4 bg-amber-50 border-amber-200 text-sm text-amber-800">
                    {review.finance.note}
                  </Card>
                )}
                {review.finance.by_domain.length > 0 && (
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b border-slate-200 font-semibold">Margin by service/domain</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 text-left">Domain</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">COGS</th>
                            <th className="px-4 py-3 text-right">Gross margin</th>
                            <th className="px-4 py-3 text-right">Margin %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {review.finance.by_domain.map((row, i) => (
                            <tr key={`${row.domain}-${i}`}>
                              <td className="px-4 py-3 font-medium">{row.domain || "Unassigned"}</td>
                              <td className="px-4 py-3 text-right">{money(row.revenue_ngn)}</td>
                              <td className="px-4 py-3 text-right">{money(row.cogs_ngn)}</td>
                              <td className="px-4 py-3 text-right">
                                {review.finance.profitability_reliable ? money(row.gross_margin_ngn) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {review.finance.profitability_reliable ? `${row.gross_margin_pct.toFixed(1)}%` : "Incomplete"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-4 bg-amber-50 border-amber-200 text-sm text-amber-800">
                {review.finance.note}
              </Card>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <DomainCard
              title="Academy"
              icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
              metrics={[
                ["Cohorts in quarter", numberValue(review.academy.cohorts_in_window)],
                ["New enrollments", numberValue(review.academy.new_enrollments)],
                ["Active learners", numberValue(review.academy.active_enrollments)],
                ["Graduated", numberValue(review.academy.graduated)],
                ["Dropped", numberValue(review.academy.dropped)],
                ["Fill rate", percent(review.academy.fill_rate)],
                ["Completion rate", percent(review.academy.completion_rate)],
                ["Certificates", numberValue(review.academy.certificates_issued)],
              ]}
            />
            <DomainCard
              title="Club"
              icon={<Waves className="h-5 w-5 text-blue-600" />}
              metrics={[
                ["Active members", numberValue(review.club.active_members)],
                ["New enrollments", displayNumber(review.club.new_enrollments)],
                ["Prior-period members", displayNumber(review.club.prior_period_members)],
                ["Retained members", displayNumber(review.club.retained_members)],
                ["Retention rate", percent(review.club.retention_rate)],
                ["Quarterly prepaid", numberValue(review.club.prepaid_enrollments)],
                ["Transition plan", numberValue(review.club.transition_enrollments)],
              ]}
            />
          </div>

          <section className="space-y-3">
            <SectionHeading title="Community & delivery" subtitle="Participation, progress and session mix" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Active swimmers" value={numberValue(review.community.active_members)} icon={<Users className="h-5 w-5" />} />
              <MetricCard label="Registered swimmer profiles" value={numberValue(review.community.registered_swimmer_profiles)} icon={<Users className="h-5 w-5" />} />
              <MetricCard label="Attendance rate (weighted)" value={percent(review.community.average_attendance_rate)} icon={<BarChart3 className="h-5 w-5" />} />
              <MetricCard label="All swimmer attendances" value={numberValue(review.community.attendance_records)} icon={<Users className="h-5 w-5" />} />
              <MetricCard
                label="Guest attendances"
                value={numberValue(review.community.guest_attendance_records)}
                detail={`${numberValue(review.community.walk_in_guest_attendance_records)} door walk-ins`}
                icon={<Users className="h-5 w-5" />}
              />
              <MetricCard label="Pool hours" value={`${numberValue(review.community.pool_hours).toFixed(1)}h`} icon={<Waves className="h-5 w-5" />} />
              <MetricCard
                label="Guest swimmer hours"
                value={`${numberValue(review.community.guest_swimmer_hours).toFixed(1)}h`}
                detail={
                  numberValue(review.community.estimated_guest_swimmer_hours) > 0
                    ? `${numberValue(review.community.estimated_guest_swimmer_hours).toFixed(1)}h estimated`
                    : "Exact recorded minutes"
                }
                icon={<Waves className="h-5 w-5" />}
              />
              <MetricCard label="Volunteer hours" value={`${numberValue(review.community.volunteer_hours).toFixed(1)}h`} icon={<BookOpen className="h-5 w-5" />} />
            </div>
            {Object.keys(review.session_mix).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Sessions by type</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(review.session_mix).map(([type, count]) => (
                    <span key={type} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      {type.replaceAll("_", " ")}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </section>

          {review.locations.length > 0 && (
            <section className="space-y-3">
              <SectionHeading title="Location performance" subtitle="Delivery footprint and active programme load" />
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {review.locations.map((location) => (
                  <Card key={location.location} className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-600" />
                      <h3 className="font-semibold text-slate-900">{location.location}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <MiniStat label="Sessions" value={location.sessions} />
                      <MiniStat label="Actual attendances" value={location.attendance} />
                      <MiniStat label="Guest attendances" value={location.guest_attendance} />
                      <MiniStat label="Scheduled pool hrs" value={location.scheduled_pool_hours.toFixed(1)} />
                      <MiniStat label="Academy cohorts" value={location.academy_cohorts} />
                      <MiniStat label="Academy learners" value={location.academy_active_enrollments} />
                      <MiniStat label="Club members" value={location.club_active_members} />
                      <MiniStat label="Capacity offered" value={location.session_capacity} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <SectionHeading title="Quarter decisions" subtitle="The review is incomplete until these are answered" />
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {review.decisions.map((decision) => (
                <Card key={decision.key} className="p-4">
                  <h3 className="font-semibold text-slate-900">{decision.title}</h3>
                  <p className="text-sm text-slate-500 mt-2">{decision.prompt}</p>
                </Card>
              ))}
            </div>
          </section>

          {review.data_quality.length > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50">
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Data quality & interpretation</h3>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc pl-5">
                    {review.data_quality.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {members.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Individual member reports ({members.length})</h2>
                <p className="text-xs text-slate-500 mt-1">Member-facing engagement snapshot; separate from the management economics above.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Member</th>
                      <th className="px-4 py-3 text-left">Tier</th>
                      <th className="px-4 py-3 text-right">Sessions</th>
                      <th className="px-4 py-3 text-right">Attendance</th>
                      <th className="px-4 py-3 text-right">Streak</th>
                      <th className="px-4 py-3 text-right">Milestones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium">{m.member_name}</td>
                        <td className="px-4 py-3 capitalize">{m.member_tier || "community"}</td>
                        <td className="px-4 py-3 text-right">{m.total_sessions_attended}</td>
                        <td className="px-4 py-3 text-right">{(m.attendance_rate * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3 text-right">{m.streak_longest}w</td>
                        <td className="px-4 py-3 text-right">{m.milestones_achieved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">No completed review yet</h2>
          <p className="text-sm text-slate-500 mt-2">
            Generate Q{selected.quarter} {selected.year} to build the quarter-end review from the frozen reporting snapshot and live source-of-truth summaries.
          </p>
        </Card>
      )}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
        </div>
      </div>
    </Card>
  );
}

function ComparisonCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value?: Comparison;
  suffix?: string;
}) {
  const current = value?.current;
  const deltaPct = value?.delta_pct;
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex items-end justify-between mt-1 gap-2">
        <p className="text-xl font-bold text-slate-900">
          {current == null ? "—" : `${current.toLocaleString()}${suffix}`}
        </p>
        {deltaPct != null && (
          <span className={`text-xs font-medium ${deltaPct >= 0 ? "text-green-600" : "text-red-600"}`}>
            {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}% QoQ
          </span>
        )}
      </div>
      {value?.previous != null && (
        <p className="text-xs text-slate-400 mt-1">
          Previous: {value.previous.toLocaleString()}{suffix}
        </p>
      )}
    </Card>
  );
}

function DomainCard({
  title,
  icon,
  metrics,
}: {
  title: string;
  icon: React.ReactNode;
  metrics: Array<[string, string | number]>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(([label, value]) => (
          <MiniStat key={label} label={label} value={value} />
        ))}
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
