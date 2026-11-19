"use client";

import type { SessionWithRides } from "@/components/sessions/SessionCard";
import { isAssignedAcademyClass } from "@/lib/next-swim-recommendations";
import { getSessionPriceDisplay } from "@/lib/sessionAccess";
import { ChevronLeft, ChevronRight, CalendarPlus, MapPin, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  sessions: SessionWithRides[];
  bookedSessionIds: ReadonlySet<string>;
  enrolledCohortIds: ReadonlySet<string>;
  selectMode: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (sessionId: string) => void;
  onStartSelecting: () => void;
};

// SwimBuddz pools operate in Lagos today. Use the session's IANA timezone
// rather than a browser-local date: a late swim must not move to another day
// for a member viewing the calendar from abroad.
export function sessionDayKey(session: Pick<SessionWithRides, "starts_at" | "timezone">): string {
  const value = new Date(session.starts_at);
  if (Number.isNaN(value.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: session.timezone || "Africa/Lagos",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const pad = (value: number) => String(value).padStart(2, "0");
const keyFor = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export function MySwimsCalendar({
  sessions, bookedSessionIds, enrolledCohortIds, selectMode, selectedIds,
  onToggleSelect, onStartSelecting,
}: Props) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [day, setDay] = useState(() => {
    const now = new Date();
    return keyFor(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const byDay = useMemo(() => {
    const grouped = new Map<string, SessionWithRides[]>();
    for (const session of sessions) {
      const key = sessionDayKey(session);
      if (!key) continue;
      const list = grouped.get(key) ?? [];
      list.push(session);
      grouped.set(key, list);
    }
    return grouped;
  }, [sessions]);

  const firstWeekday = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, i) => {
    const n = i - firstWeekday + 1;
    return n > 0 && n <= daysInMonth ? n : null;
  });
  const selectedSessions = byDay.get(day) ?? [];
  const moveMonth = (offset: number) => {
    const next = new Date(Date.UTC(month.year, month.month + offset, 1));
    const year = next.getUTCFullYear();
    const m = next.getUTCMonth();
    setMonth({ year, month: m });
    setDay(keyFor(year, m, 1));
  };
  const dateLabel = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(month.year, month.month, 1)));
  const findHref = `/account/find-a-swim/sessions?date=${encodeURIComponent(day)}`;

  return (
    <div className="space-y-5" aria-label="My Swims calendar">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => moveMonth(-1)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900">{dateLabel}</h2>
          <button type="button" onClick={() => moveMonth(1)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Select a day to plan a swim">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
            <div key={name} className="py-2 text-center text-xs font-semibold text-slate-500">{name}</div>
          ))}
          {cells.map((n, index) => {
            if (n === null) return <div key={`empty-${index}`} aria-hidden="true" />;
            const key = keyFor(month.year, month.month, n);
            const entries = byDay.get(key) ?? [];
            const mine = entries.some((session) =>
              bookedSessionIds.has(session.id) || isAssignedAcademyClass(session, enrolledCohortIds));
            return (
              <button key={key} type="button" aria-label={`View swims on ${key}`}
                aria-pressed={day === key} onClick={() => setDay(key)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-lg border p-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700 ${
                  day === key ? "border-cyan-700 bg-cyan-50 font-semibold text-cyan-900"
                    : "border-transparent hover:bg-slate-50 text-slate-700"
                }`}>
                {n}
                {entries.length > 0 && (
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${mine ? "bg-cyan-700" : "bg-slate-400"}`}
                    aria-label={mine ? "Personal swim scheduled" : "SwimBuddz sessions available"} />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-700" /> My booking or class</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" /> Published sessions</span>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Swims on {day}</h3>
          <Link href={findHref} className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
            <CalendarPlus className="h-4 w-4" /> Find a swim on this day
          </Link>
        </div>
        {selectedSessions.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            No sessions in the current loaded results for this date. Explore published swims or pool access to check other options.
          </p>
        ) : selectedSessions.map((session) => {
          const confirmed = bookedSessionIds.has(session.id);
          const assigned = isAssignedAcademyClass(session, enrolledCohortIds);
          const canBook = !confirmed && !assigned && session.access?.bookable === true
            && new Date(session.starts_at).getTime() > Date.now();
          const price = getSessionPriceDisplay(session.access ?? null, session.pool_fee);
          return (
            <article key={session.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-semibold text-slate-900">{session.title}</h4>
                <p className="text-sm text-slate-600">
                  {new Date(session.starts_at).toLocaleTimeString("en-NG", {
                    timeZone: session.timezone || "Africa/Lagos", hour: "numeric", minute: "2-digit"
                  })} · {session.location_name || session.location || "Location to be confirmed"}
                </p>
                <p className="text-xs text-slate-600">
                  {confirmed ? "Confirmed booking" : assigned ? "Assigned Academy class — included in tuition"
                    : canBook ? price.amountNaira === 0 ? "Included / ₦0" : `₦${price.amountNaira.toLocaleString("en-NG")}`
                    : "View eligibility in session details"}
                </p>
              </div>
              {selectMode && canBook ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedIds.has(session.id)}
                    onChange={() => onToggleSelect(session.id)} aria-label={`Add ${session.title} to booking basket`} />
                  Add
                </label>
              ) : canBook ? (
                <Link href={`/sessions/${session.id}/book`}
                  className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Book</Link>
              ) : null}
              <Link href={`/sessions/${session.id}`} className="text-sm font-medium text-cyan-700 hover:underline">
                Details
              </Link>
            </article>
          );
        })}
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-sm">
          {!selectMode && (
            <button type="button" onClick={onStartSelecting}
              className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:underline">
              <ShoppingCart className="h-4 w-4" /> Book several swims
            </button>
          )}
          <Link href="/pools" className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
            <MapPin className="h-4 w-4" /> Explore swimming pools
          </Link>
          <Link href="/community/events/create" className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
            <Plus className="h-4 w-4" /> Host an open swim
          </Link>
        </div>
      </div>
    </div>
  );
}
