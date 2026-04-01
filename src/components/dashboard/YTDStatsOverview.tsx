"use client";

import { Card } from "@/components/ui/Card";
import type { YTDStats } from "@/lib/reports";
import { Calendar, Clock, Flame, Wallet } from "lucide-react";
import Link from "next/link";
import { ProgressRing } from "./ProgressRing";

type YTDStatsOverviewProps = {
  stats: YTDStats;
  year: number;
};

const tiles = [
  {
    key: "sessions",
    label: "Sessions",
    icon: Calendar,
    color: "bg-cyan-100 text-cyan-600",
    getValue: (s: YTDStats) => String(s.total_sessions_attended),
    href: "/sessions?view=booked",
  },
  {
    key: "hours",
    label: "Pool Hours",
    icon: Clock,
    color: "bg-blue-100 text-blue-600",
    getValue: (s: YTDStats) => (s.pool_hours > 0 ? `${s.pool_hours.toFixed(1)}h` : "0h"),
    href: "/account/attendance/history",
  },
  {
    key: "streak",
    label: "Best Streak",
    icon: Flame,
    color: "bg-orange-100 text-orange-600",
    getValue: (s: YTDStats) => `${s.streak_longest}w`,
    href: "/account/attendance/history",
  },
  {
    key: "bubbles",
    label: "Bubbles",
    icon: Wallet,
    color: "bg-purple-100 text-purple-600",
    getValue: (s: YTDStats) => String(s.bubbles_earned - s.bubbles_spent),
    href: "/account/wallet",
  },
] as const;

export function YTDStatsOverview({ stats, year }: YTDStatsOverviewProps) {
  const attendancePct = Math.round(stats.attendance_rate * 100);

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Year to Date — {year}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
        {/* Progress Ring */}
        <div className="flex-shrink-0">
          <ProgressRing value={attendancePct} size={130} strokeWidth={12}>
            <span className="text-3xl font-bold text-slate-900">{attendancePct}%</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Attendance
            </span>
          </ProgressRing>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 gap-3 flex-1 w-full">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.key} href={tile.href}>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-tight">
                      {tile.getValue(stats)}
                    </p>
                    <p className="text-xs text-slate-500">{tile.label}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
