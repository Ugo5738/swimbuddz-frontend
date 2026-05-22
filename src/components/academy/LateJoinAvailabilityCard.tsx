"use client";

import { AlertCircle, Calendar, Clock } from "lucide-react";

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const TIME_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export type LateJoinPrefsShape = {
  sessionsMissed?: number;
  availableDays?: string[];
  availableTimes?: string[];
  notes?: string;
  acknowledgedAt?: string;
};

/** Pull a typed late_join block out of Enrollment.preferences. */
export function extractLateJoinPrefs(
  preferences: Record<string, unknown> | null | undefined
): LateJoinPrefsShape | null {
  if (!preferences) return null;
  const raw = (preferences as Record<string, unknown>).late_join;
  if (!raw || typeof raw !== "object") return null;
  // Tolerate snake_case from older records.
  const r = raw as Record<string, unknown>;
  return {
    sessionsMissed: (r.sessionsMissed as number) ?? (r.sessions_missed as number),
    availableDays: (r.availableDays as string[]) ?? (r.available_days as string[]),
    availableTimes: (r.availableTimes as string[]) ?? (r.available_times as string[]),
    notes: (r.notes as string) ?? "",
    acknowledgedAt: (r.acknowledgedAt as string) ?? (r.acknowledged_at as string),
  };
}

function joinList(values: string[] | undefined, labels: Record<string, string>): string {
  if (!values || values.length === 0) return "—";
  return values.map((v) => labels[v] ?? v).join(", ");
}

type Props = {
  prefs: LateJoinPrefsShape;
  /** "inline" = compact one-line hint for use inside lists.
   *  "card"   = full card section for detail pages. */
  variant?: "inline" | "card";
};

export function LateJoinAvailabilityCard({ prefs, variant = "card" }: Props) {
  if (variant === "inline") {
    const dayStr = joinList(prefs.availableDays, DAY_LABEL);
    const timeStr = joinList(prefs.availableTimes, TIME_LABEL);
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3 text-slate-400" />
          {dayStr}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          {timeStr}
        </span>
        {prefs.notes && <span className="italic text-slate-500">"{prefs.notes}"</span>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-900">Late-join availability</h3>
      </div>
      <p className="mb-3 text-xs text-amber-800">
        Captured at enrollment. Use this when scheduling make-up sessions
        {typeof prefs.sessionsMissed === "number" && prefs.sessionsMissed > 0
          ? ` — student is owed ${prefs.sessionsMissed} session${prefs.sessionsMissed === 1 ? "" : "s"}.`
          : "."}
      </p>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-1 text-xs font-medium text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Available days
          </dt>
          <dd className="mt-1 text-slate-900">{joinList(prefs.availableDays, DAY_LABEL)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs font-medium text-slate-600">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Available times
          </dt>
          <dd className="mt-1 text-slate-900">{joinList(prefs.availableTimes, TIME_LABEL)}</dd>
        </div>
      </dl>

      {prefs.notes && (
        <div className="mt-3">
          <dt className="text-xs font-medium text-slate-600">Notes</dt>
          <dd className="mt-1 text-sm italic text-slate-700">"{prefs.notes}"</dd>
        </div>
      )}

      {prefs.acknowledgedAt && (
        <p className="mt-3 text-xs text-slate-500">
          Acknowledged{" "}
          {new Date(prefs.acknowledgedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
