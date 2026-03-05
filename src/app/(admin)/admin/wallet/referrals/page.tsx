"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { Trophy, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type LeaderboardEntry = {
  rank: number;
  member_auth_id: string;
  member_name?: string | null;
  referral_code: string;
  successful_referrals: number;
  total_bubbles_earned: number;
  conversion_rate: number;
};

type ReferralLeaderboardResponse = {
  entries: LeaderboardEntry[];
  period: string;
};

type ReferralProgramStats = {
  total_codes_generated: number;
  total_registrations: number;
  total_qualified: number;
  total_rewarded: number;
  conversion_rate: number;
  total_bubbles_distributed: number;
};

// ============================================================================
// Component
// ============================================================================

const PERIOD_OPTIONS = [
  { value: "all_time", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
];

export default function AdminReferralsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<ReferralProgramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all_time");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiGet<ReferralLeaderboardResponse>(
          `/api/v1/admin/wallet/referrals/leaderboard?period=${period}`,
          { auth: true }
        ),
        apiGet<ReferralProgramStats>("/api/v1/admin/wallet/referrals/stats", { auth: true }),
      ]);

      if (results[0].status === "fulfilled") setLeaderboard(results[0].value.entries ?? []);
      if (results[1].status === "fulfilled") setStats(results[1].value);
    } catch (e) {
      console.error("Failed to load referral data:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingPage text="Loading referral data..." />;
  }

  const rankMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900">Referral Management</h1>

      {/* Program Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Codes Generated</p>
            <p className="text-lg font-semibold text-slate-900">{stats.total_codes_generated}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Registrations</p>
            <p className="text-lg font-semibold text-slate-900">{stats.total_registrations}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Qualified</p>
            <p className="text-lg font-semibold text-emerald-600">{stats.total_qualified}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Rewarded</p>
            <p className="text-lg font-semibold text-emerald-600">{stats.total_rewarded}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Conversion Rate</p>
            <p className="text-lg font-semibold text-slate-900">
              {(stats.conversion_rate ?? 0).toFixed(1)}%
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Bubbles Distributed</p>
            <p className="text-lg font-semibold text-emerald-600">
              {(stats.total_bubbles_distributed ?? 0).toLocaleString()} 🫧
            </p>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Leaderboard
          </h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {leaderboard.length === 0 ? (
          <Card className="p-6 bg-slate-50 border-dashed text-center">
            <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No referral data for this period</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-right font-medium">Referrals</th>
                    <th className="px-4 py-3 text-right font-medium">Bubbles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className={entry.rank <= 3 ? "bg-amber-50/50" : ""}>
                      <td className="px-4 py-3 font-medium">{rankMedal(entry.rank)}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {entry.member_name || (
                          <span className="font-mono text-xs text-slate-500">
                            {entry.member_auth_id.slice(0, 12)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-mono">
                          {entry.referral_code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {entry.successful_referrals}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {entry.total_bubbles_earned.toLocaleString()} 🫧
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
