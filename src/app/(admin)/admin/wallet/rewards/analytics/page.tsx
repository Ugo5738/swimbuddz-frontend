"use client";

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type AnalyticsData = {
  period_start: string;
  period_end: string;
  total_events: number;
  total_rewards_granted: number;
  total_bubbles_distributed: number;
  unique_members_rewarded: number;
  by_category: CategoryBreakdown[];
  avg_bubbles_per_member: number;
  top_event_types: TopEventType[];
};

type CategoryBreakdown = {
  category: string;
  total_grants: number;
  total_bubbles: number;
  unique_members: number;
};

type TopEventType = {
  event_type: string;
  count: number;
};

// ============================================================================
// Helpers
// ============================================================================

const PERIOD_OPTIONS = [
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "all_time", label: "All Time" },
];

const CATEGORY_COLORS: Record<string, string> = {
  acquisition: "bg-blue-500",
  retention: "bg-emerald-500",
  community: "bg-teal-500",
  spending: "bg-purple-500",
  academy: "bg-violet-500",
};

// ============================================================================
// Component
// ============================================================================

export default function AdminRewardsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiGet<AnalyticsData>(
        `/api/v1/admin/wallet/rewards/analytics?period=${period}`,
        { auth: true }
      );
      setData(result);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return <LoadingPage text="Loading analytics..." />;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Rewards Analytics</h1>
        <p className="text-slate-600">Unable to load analytics data.</p>
      </div>
    );
  }

  const totalBubbles = data.by_category.reduce((sum, c) => sum + c.total_bubbles, 0);
  const maxCategoryBubbles = Math.max(...data.by_category.map((c) => c.total_bubbles), 1);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-cyan-600" />
          Rewards Analytics
        </h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Total Bubbles Distributed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {(data.total_bubbles_distributed ?? 0).toLocaleString()} 🫧
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Rewards Granted</p>
          <p className="text-2xl font-bold text-slate-900">
            {(data.total_rewards_granted ?? 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Members Rewarded</p>
          <p className="text-2xl font-bold text-slate-900">{data.unique_members_rewarded ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Avg Bubbles / Member</p>
          <p className="text-2xl font-bold text-slate-900">
            {(data.avg_bubbles_per_member ?? 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Category Breakdown</h2>
        <div className="space-y-3">
          {data.by_category.map((cat) => {
            const pct =
              totalBubbles > 0 ? ((cat.total_bubbles / totalBubbles) * 100).toFixed(1) : "0.0";
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {cat.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-600">
                      {cat.total_bubbles.toLocaleString()} 🫧
                    </span>
                    <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      CATEGORY_COLORS[cat.category] || "bg-slate-400"
                    }`}
                    style={{
                      width: `${(cat.total_bubbles / maxCategoryBubbles) * 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Event Types */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Top Event Types</h2>
        <div className="space-y-2">
          {(data.top_event_types ?? []).map((evt, i) => (
            <div key={evt.event_type} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                <span className="text-sm text-slate-700 truncate">{evt.event_type}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 shrink-0 ml-2">
                {evt.count.toLocaleString()}
              </span>
            </div>
          ))}
          {(data.top_event_types ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No events yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
