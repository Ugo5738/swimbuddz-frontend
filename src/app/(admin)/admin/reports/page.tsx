"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface CommunityStats {
  year: number;
  quarter: number;
  total_active_members: number;
  total_sessions_held: number;
  total_attendance_records: number;
  average_attendance_rate: number;
  total_new_members: number;
  total_milestones_achieved: number;
  total_certificates_issued: number;
  total_volunteer_hours: number;
  total_rides_shared: number;
  total_revenue_ngn: number;
  total_pool_hours: number;
  most_active_location: string | null;
  busiest_session_title: string | null;
  busiest_session_attendance: number;
  most_popular_day: string | null;
  most_popular_time_slot: string | null;
  total_cohorts_completed: number;
  stats_by_type: Record<string, number> | null;
  community_milestones: { icon: string; text: string }[] | null;
  computed_at: string;
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

interface SnapshotStatus {
  year: number;
  quarter: number;
  status: string;
  member_count: number;
  completed_at: string | null;
}

function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3),
  };
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [members, setMembers] = useState<MemberReport[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { year, quarter } = getCurrentQuarter();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, membersData, statusData] = await Promise.allSettled([
        apiGet<CommunityStats>(
          `/api/v1/admin/reports/quarterly/overview?year=${year}&quarter=${quarter}`,
          { auth: true }
        ),
        apiGet<MemberReport[]>(
          `/api/v1/admin/reports/quarterly/members?year=${year}&quarter=${quarter}&sort=attendance&limit=50`,
          { auth: true }
        ),
        apiGet<SnapshotStatus>(
          `/api/v1/admin/reports/quarterly/status?year=${year}&quarter=${quarter}`,
          { auth: true }
        ),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (membersData.status === "fulfilled") setMembers(membersData.value);
      if (statusData.status === "fulfilled") setSnapshotStatus(statusData.value);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiPost<SnapshotStatus>(
        "/api/v1/admin/reports/quarterly/generate",
        { year, quarter },
        { auth: true }
      );
      await fetchData();
      setSuccess(
        `Reports regenerated successfully — ${result.member_count} member reports computed.`
      );
      setTimeout(() => setSuccess(null), 5000);
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
        { year, quarter },
        { auth: true }
      );
      setSuccess(
        `Emails sent: ${result.sent} delivered, ${result.failed} failed, ${result.skipped} skipped.`
      );
      setTimeout(() => setSuccess(null), 8000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send emails");
    } finally {
      setSendingEmails(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = await getCurrentAccessToken();
      const url = `${API_BASE_URL}/api/v1/admin/reports/quarterly/export.csv?year=${year}&quarter=${quarter}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `swimbuddz-Q${quarter}-${year}-report.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("Failed to export CSV");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quarterly Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Q{quarter} {year} — Community performance overview
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating
              ? "Generating..."
              : snapshotStatus
                ? "Regenerate Reports"
                : "Generate Reports"}
          </button>
          {members.length > 0 && (
            <>
              <button
                onClick={handleSendEmails}
                disabled={sendingEmails}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Mail className={`h-4 w-4 ${sendingEmails ? "animate-pulse" : ""}`} />
                {sendingEmails ? "Sending..." : "Email Reports"}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && <Card className="p-4 bg-red-50 text-red-700 text-sm">{error}</Card>}

      {success && (
        <Card className="p-4 bg-green-50 text-green-700 text-sm font-medium border-green-200">
          {success}
        </Card>
      )}

      {/* Status banner */}
      {snapshotStatus && (
        <Card className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  snapshotStatus.status === "completed"
                    ? "bg-green-500"
                    : snapshotStatus.status === "computing"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="font-medium text-slate-700">Status: {snapshotStatus.status}</span>
            </div>
            <span className="text-slate-500">
              {snapshotStatus.member_count} member reports
              {snapshotStatus.completed_at &&
                ` · Generated ${new Date(snapshotStatus.completed_at).toLocaleString()}`}
            </span>
          </div>
        </Card>
      )}

      {/* Community stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Members"
            value={stats.total_active_members}
            icon={<Users className="h-5 w-5 text-cyan-600" />}
            bg="bg-cyan-50"
          />
          <StatCard
            label="Sessions Held"
            value={stats.total_sessions_held}
            icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
          />
          <StatCard
            label="Avg Attendance"
            value={`${(stats.average_attendance_rate * 100).toFixed(0)}%`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            bg="bg-green-50"
          />
          <StatCard
            label="Revenue (NGN)"
            value={`₦${stats.total_revenue_ngn.toLocaleString()}`}
            icon={<FileSpreadsheet className="h-5 w-5 text-purple-600" />}
            bg="bg-purple-50"
          />
        </div>
      )}

      {/* Session highlights */}
      {stats && (stats.most_active_location || stats.most_popular_day || stats.total_pool_hours > 0) && (
        <Card className="p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Session Highlights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {stats.total_pool_hours > 0 && (
              <div className="rounded-lg bg-cyan-50 p-3">
                <p className="text-xs text-slate-500">Total Pool Hours</p>
                <p className="text-lg font-bold text-cyan-700">{stats.total_pool_hours.toFixed(1)}h</p>
              </div>
            )}
            {stats.most_active_location && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-slate-500">Most Active Location</p>
                <p className="text-lg font-bold text-blue-700">{stats.most_active_location}</p>
              </div>
            )}
            {stats.busiest_session_title && (
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs text-slate-500">Busiest Session</p>
                <p className="text-lg font-bold text-orange-700">{stats.busiest_session_title}</p>
                {stats.busiest_session_attendance > 0 && (
                  <p className="text-xs text-orange-500 mt-0.5">{stats.busiest_session_attendance} attendees</p>
                )}
              </div>
            )}
            {stats.most_popular_day && (
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-slate-500">Most Popular Day</p>
                <p className="text-lg font-bold text-green-700">{stats.most_popular_day}</p>
              </div>
            )}
            {stats.most_popular_time_slot && (
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs text-slate-500">Peak Time Slot</p>
                <p className="text-lg font-bold text-purple-700">{stats.most_popular_time_slot}</p>
              </div>
            )}
            {stats.total_cohorts_completed > 0 && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-slate-500">Cohorts Completed</p>
                <p className="text-lg font-bold text-amber-700">{stats.total_cohorts_completed}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Member reports table */}
      {members.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Member Reports ({members.length})</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Member</th>
                  <th className="px-4 py-3 text-left font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">Sessions</th>
                  <th className="px-4 py-3 text-right font-medium">Attendance</th>
                  <th className="px-4 py-3 text-right font-medium">Streak</th>
                  <th className="px-4 py-3 text-right font-medium">Milestones</th>
                  <th className="px-4 py-3 text-right font-medium">Bubbles</th>
                  <th className="px-4 py-3 text-right font-medium">Spent (NGN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.member_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.member_tier === "club"
                            ? "bg-blue-100 text-blue-700"
                            : m.member_tier === "academy"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-cyan-100 text-cyan-700"
                        }`}
                      >
                        {m.member_tier || "community"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{m.total_sessions_attended}</td>
                    <td className="px-4 py-3 text-right">
                      {(m.attendance_rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right">{m.streak_longest}w</td>
                    <td className="px-4 py-3 text-right">{m.milestones_achieved}</td>
                    <td className="px-4 py-3 text-right">{m.bubbles_earned}</td>
                    <td className="px-4 py-3 text-right">₦{m.total_spent_ngn.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{m.member_name}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.member_tier === "club"
                        ? "bg-blue-100 text-blue-700"
                        : m.member_tier === "academy"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {m.member_tier || "community"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400">Sessions</span>
                    {m.total_sessions_attended}
                  </div>
                  <div>
                    <span className="block text-slate-400">Attendance</span>
                    {(m.attendance_rate * 100).toFixed(0)}%
                  </div>
                  <div>
                    <span className="block text-slate-400">Streak</span>
                    {m.streak_longest}w
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!stats && !snapshotStatus && members.length === 0 && (
        <Card className="p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">No reports generated yet</h2>
          <p className="text-sm text-slate-500 mt-2 mb-4">
            Click &quot;Generate Reports&quot; to compute Q{quarter} {year} reports for all members.
          </p>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}
