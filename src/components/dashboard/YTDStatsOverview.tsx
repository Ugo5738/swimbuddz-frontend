import { Card } from "@/components/ui/Card";
import type { MemberYtdAttendanceSummary, YTDStats } from "@/lib/reports";
import { Calendar, Clock, Flame } from "lucide-react";
import Link from "next/link";
import { ProgressRing } from "./ProgressRing";

type SummaryInput = MemberYtdAttendanceSummary | YTDStats;

type YTDStatsOverviewProps = {
  stats: SummaryInput;
  year: number;
};

function getSessionsAttended(s: SummaryInput): number {
  return "sessions_attended" in s ? s.sessions_attended : s.total_sessions_attended;
}

function getSessionsRecorded(s: SummaryInput): number {
  return "sessions_recorded" in s ? s.sessions_recorded : s.total_sessions_available;
}

const tiles = [
  {
    key: "sessions",
    label: "Swims Attended",
    icon: Calendar,
    color: "bg-cyan-100 text-cyan-700",
    getValue: (s: SummaryInput) => String(getSessionsAttended(s)),
    href: "/account/bookings?view=history",
  },
  {
    key: "hours",
    label: "Pool Hours",
    icon: Clock,
    color: "bg-blue-100 text-blue-700",
    getValue: (s: SummaryInput) => (s.pool_hours > 0 ? `${s.pool_hours.toFixed(1)}h` : "0h"),
    href: "/account/attendance/history",
  },
  {
    key: "streak",
    label: "Best Streak",
    icon: Flame,
    color: "bg-orange-100 text-orange-700",
    getValue: (s: SummaryInput) => `${s.streak_longest}w`,
    href: "/account/attendance/history",
  },
] as const;

export function YTDStatsOverview({ stats, year }: YTDStatsOverviewProps) {
  const attendancePct = Math.round(stats.attendance_rate * 100);
  const recorded = getSessionsRecorded(stats);

  return (
    <Card className="flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {year} Swim Summary
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">All recorded attended swims</p>
          </div>
          <Link
            href="/account/bookings?view=history"
            className="text-xs font-semibold text-cyan-700 hover:underline"
          >
            History →
          </Link>
        </div>

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          {/* Progress Ring */}
          <div className="flex-shrink-0">
            <ProgressRing value={attendancePct} size={112} strokeWidth={11}>
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {attendancePct}%
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {recorded > 0 ? `of ${recorded}` : "Attendance"}
              </span>
            </ProgressRing>
          </div>

          {/* 3 Clean Swimming Metrics (Bubbles live strictly in Wallet & Rewards) */}
          <div className="w-full flex-1 space-y-2.5">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.key}
                  href={tile.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 transition hover:border-cyan-300 hover:bg-slate-100/70"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${tile.color}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-slate-600">{tile.label}</span>
                  </span>
                  <span className="text-base font-bold tabular-nums text-slate-900">
                    {tile.getValue(stats)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">Counts Club, Academy &amp; community swims</span>
        <Link href="/account/reports" className="font-semibold text-cyan-700 hover:underline">
          Reports →
        </Link>
      </div>
    </Card>
  );
}
