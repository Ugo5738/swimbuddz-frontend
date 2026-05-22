"use client";

import { Card } from "@/components/ui/Card";
import { StatsCard } from "@/components/ui/StatsCard";
import type { DashboardSummary } from "@/lib/volunteers";
import { AlertTriangle, Calendar, Clock, TrendingUp, Trophy, Users } from "lucide-react";

import type { Tab } from "../types";

type Props = {
  dashboard: DashboardSummary;
  setTab: (tab: Tab) => void;
};

export function DashboardTab({ dashboard, setTab }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard
          label="Active Volunteers"
          value={dashboard.total_active_volunteers}
          icon={<Users className="h-5 w-5" />}
          color="cyan"
        />
        <StatsCard
          label="Hours This Month"
          value={dashboard.total_hours_this_month.toFixed(0)}
          icon={<Clock className="h-5 w-5" />}
          color="green"
        />
        <StatsCard
          label="Upcoming"
          value={dashboard.upcoming_opportunities}
          icon={<Calendar className="h-5 w-5" />}
          color="blue"
        />
        <StatsCard
          label="Unfilled Slots"
          value={dashboard.unfilled_slots}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={dashboard.unfilled_slots > 5 ? "amber" : "slate"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* No-show rate + reliability */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">No-Show Rate</p>
              <p
                className={`text-3xl font-bold ${
                  dashboard.no_show_rate > 15
                    ? "text-rose-600"
                    : dashboard.no_show_rate > 5
                      ? "text-amber-600"
                      : "text-emerald-600"
                }`}
              >
                {dashboard.no_show_rate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-slate-300" />
          </div>
          <button
            onClick={() => setTab("volunteers")}
            className="mt-3 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
          >
            View reliability report →
          </button>
        </Card>

        {/* Top Volunteers */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Volunteers
          </h3>
          {dashboard.top_volunteers.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet</p>
          ) : (
            <div className="space-y-2">
              {dashboard.top_volunteers.map((v, i) => (
                <div
                  key={v.member_id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50"
                >
                  <span className="text-lg w-6 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {v.member_name || "Unknown"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-slate-900">
                      {v.total_hours.toFixed(0)}h
                    </span>
                    <span className="text-xs text-slate-400 ml-1">({v.total_sessions})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
