"use client";

import { Card } from "@/components/ui/Card";
import { useMemo } from "react";

type AttendanceRecord = {
  session_starts_at: string;
};

type SwimCalendarProps = {
  records: AttendanceRecord[];
};

const DAY_LABELS = ["", "M", "", "W", "", "F", ""];
const WEEKS = 12;

function getCalendarData(records: AttendanceRecord[]) {
  // Build a map of YYYY-MM-DD -> count
  const countMap = new Map<string, number>();
  for (const r of records) {
    const d = new Date(r.session_starts_at);
    if (isNaN(d.getTime())) continue; // skip invalid dates
    const dateKey = d.toISOString().slice(0, 10);
    countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1);
  }

  // Build the grid: 12 weeks back from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Monday of the current week
  const dayOfWeek = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  // Start from 11 weeks before current Monday (12 weeks total)
  const startDate = new Date(currentMonday);
  startDate.setDate(startDate.getDate() - (WEEKS - 1) * 7);

  const grid: { date: Date; count: number; isToday: boolean; isFuture: boolean }[][] = [];
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    const week: (typeof grid)[0] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateKey = date.toISOString().slice(0, 10);
      const count = countMap.get(dateKey) || 0;
      const isToday = date.toDateString() === today.toDateString();
      const isFuture = date > today;

      week.push({ date, count, isToday, isFuture });

      // Track month boundaries for labels
      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth();
        monthLabels.push({
          label: date.toLocaleDateString(undefined, { month: "short" }),
          colIndex: w,
        });
      }
    }
    grid.push(week);
  }

  return { grid, monthLabels };
}

function getCellColor(count: number, isFuture: boolean, isToday: boolean): string {
  if (isFuture) return "bg-slate-50";
  if (isToday)
    return count > 0 ? "bg-cyan-500 ring-2 ring-cyan-300" : "bg-slate-100 ring-2 ring-slate-300";
  if (count === 0) return "bg-slate-100";
  if (count === 1) return "bg-cyan-300";
  return "bg-cyan-500";
}

export function SwimCalendar({ records }: SwimCalendarProps) {
  const { grid, monthLabels } = useMemo(() => getCalendarData(records), [records]);

  if (records.length === 0) return null;

  return (
    <Card className="p-4 md:p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Swim Activity
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-6 mb-1">
            {Array.from({ length: WEEKS }, (_, w) => {
              const ml = monthLabels.find((m) => m.colIndex === w);
              return (
                <div key={w} className="w-[18px] flex-shrink-0 text-center">
                  {ml && <span className="text-[10px] text-slate-400">{ml.label}</span>}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Day labels column */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[14px] w-4 flex items-center justify-end">
                  <span className="text-[9px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Week columns */}
            {grid.map((week, w) => (
              <div key={w} className="flex flex-col gap-0.5">
                {week.map((cell, d) => (
                  <div
                    key={d}
                    className={`h-[14px] w-[14px] rounded-sm ${getCellColor(cell.count, cell.isFuture, cell.isToday)}`}
                    title={`${cell.date.toLocaleDateString()}: ${cell.count} session${cell.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 ml-6">
            <span className="text-[10px] text-slate-400">Less</span>
            <div className="h-[10px] w-[10px] rounded-sm bg-slate-100" />
            <div className="h-[10px] w-[10px] rounded-sm bg-cyan-300" />
            <div className="h-[10px] w-[10px] rounded-sm bg-cyan-500" />
            <span className="text-[10px] text-slate-400">More</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
