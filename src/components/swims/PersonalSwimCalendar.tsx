"use client";

import Link from "next/link";
import { SwimModal } from "@/components/swims/SwimModal";
import { SessionDetailContent } from "@/components/swims/SessionDetailContent";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { CalendarResponse, CalendarItem } from "@/lib/calendar";
import type { SwimActivity } from "@/lib/my-swims";
import type { SwimPlan } from "@/lib/swim-plans";

type Layer = "mine" | "both" | "org";
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export function swimDay(value: string | null | undefined): string {
  if (!value) return "";
  const time = new Date(value);
  if (Number.isNaN(time.valueOf())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(time);
  const part = (kind: string) => parts.find(row => row.type === kind)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function formMonth(month: { y: number; m: number }) {
  const starts = new Date(Date.UTC(month.y, month.m, 1) - 3600_000);
  const ends = new Date(Date.UTC(month.y, month.m + 1, 1) - 3600_000);
  return { from: starts.toISOString(), to: ends.toISOString() };
}
const bookingLabel: Record<string, string> = {
  assigned: "Assigned", confirmed: "Confirmed",
  pending_payment: "Payment pending", pending: "Pending",
  cancelled: "Cancelled", session_cancelled: "Cancelled",
};
export function PersonalSwimCalendar({ activities, plans = [] }: {
  activities: SwimActivity[];
  plans?: SwimPlan[];
}) {
  const [month, setMonth] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer>("mine");
  const range = useMemo(() => formMonth(month), [month]);
  const schedule = useQuery({
    queryKey: ["my-swims", "published-calendar-month", range.from, range.to],
    queryFn: () => {
      const query = new URLSearchParams(range);
      return apiGet<CalendarResponse>(`/api/v1/calendar?${query.toString()}`, { auth: true });
    },
  });
  const orgItems = schedule.data?.items ?? [];
  const myItems = activities.filter(row => !!row.date);
  const move = (direction: number) => {
    const next = new Date(Date.UTC(month.y, month.m + direction, 1));
    setMonth({ y: next.getUTCFullYear(), m: next.getUTCMonth() });
    setSelectedDay(null);
  };
  const first = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
  const count = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const days = Array.from({ length: Math.ceil((first + count) / 7) * 7 }, (_, i) => {
    const d = i + 1 - first;
    return d > 0 && d <= count ? d : null;
  });
  const mineByDay = useMemo(() => {
    const result = new Map<string, SwimActivity[]>();
    for (const row of myItems) {
      const key = swimDay(row.date);
      if (!key) continue;
      result.set(key, [...result.get(key) ?? [], row]);
    }
    return result;
  }, [myItems]);
  const orgByDay = useMemo(() => {
    const result = new Map<string, CalendarItem[]>();
    for (const row of orgItems) {
      const key = swimDay(row.starts_at);
      if (!key) continue;
      result.set(key, [...result.get(key) ?? [], row]);
    }
    return result;
  }, [orgItems]);
  const name = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(Date.UTC(month.y, month.m, 1)));
  const personalOnDay = selectedDay ? mineByDay.get(selectedDay) ?? [] : [];
  const publishedOnDay = selectedDay ? orgByDay.get(selectedDay) ?? [] : [];
  const plansOnDay = selectedDay ? plans.filter(p => swimDay(p.starts_at) === selectedDay) : [];

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar layer">
      {([{ id: "mine", text: "My schedule" }, { id: "both", text: "Both" }, { id: "org", text: "SwimBuddz" }] as const)
        .map(option => <button type="button" key={option.id} onClick={() => setLayer(option.id)} aria-pressed={layer === option.id}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${layer === option.id ? "bg-cyan-700 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
          {option.text}
        </button>)}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="Previous month"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">←</button>
        <h2 className="font-semibold text-slate-950">{name}</h2>
        <button type="button" onClick={() => move(1)} aria-label="Next month"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day =>
          <div key={day} className="pb-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}
        {days.map((d, i) => {
          if (d === null) return <span key={`empty-${i}`} aria-hidden="true" />;
          const date = isoDay(month.y, month.m, d);
          const mine = layer !== "org" && (mineByDay.has(date) || plans.some(p => swimDay(p.starts_at) === date));
          const org = layer !== "mine" && orgByDay.has(date);
          return <button key={date} type="button" onClick={() => setSelectedDay(date)}
            aria-label={`View and plan swims on ${date}`} aria-pressed={selectedDay === date}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border text-sm hover:border-cyan-500 ${selectedDay === date ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-transparent text-slate-800 hover:bg-slate-50"}`}>
            {d}<span className="flex gap-1">
              {mine && <span className="h-1.5 w-1.5 rounded-full bg-cyan-700" />}
              {org && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
            </span>
          </button>;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span>● My commitments and requests</span>
        <span className="text-violet-700">● SwimBuddz activities</span>
      </div>
      {schedule.isError && layer !== "mine" &&
        <p role="alert" className="mt-3 text-xs text-amber-800">Some published activities couldn't be loaded. Your personal commitments remain available.</p>}
    </div>
    {selectedDay && <SwimModal title={new Date(selectedDay + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "UTC" })} onClose={() => setSelectedDay(null)}>
      <p className="text-sm text-slate-600">Your commitments and published swims for this date</p>
      {layer !== "org" && personalOnDay.map(item => item.sessionId
        ? <button type="button" key={item.key} onClick={() => {setSelectedDay(null);setSelectedSessionId(item.sessionId ?? null);}}
            className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-cyan-500">
            <strong>{item.title}</strong><span className="ml-2 text-sm text-slate-600">{bookingLabel[item.status] ?? item.status}</span>
          </button>
        : <Link key={item.key} href="/account/pool-access" className="block rounded-xl border border-slate-200 p-3 hover:border-cyan-500">
            <strong>{item.title}</strong> · {bookingLabel[item.status] ?? item.status}
          </Link>)}
      {layer !== "org" && plansOnDay.map(plan =>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm" key={plan.id}>
          <strong>{plan.title}</strong> · Request {plan.status.replaceAll("_", " ")}
        </div>)}
      {layer !== "mine" && publishedOnDay.filter(item =>
        !personalOnDay.some(p => p.sessionId === item.id && item.source === "session")
      ).map(item => item.source === "session"
        ? <button type="button" key={`${item.source}:${item.id}`} onClick={() => {setSelectedDay(null);setSelectedSessionId(item.id);}}
            className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-cyan-500">
            <strong>{item.title}</strong> · View details
          </button>
        : <Link key={`${item.source}:${item.id}`} href={item.href}
            className="block rounded-xl border border-slate-200 p-3 hover:border-cyan-500">
            <strong>{item.title}</strong> · View activity
          </Link>)}
      {(layer === "mine" ? personalOnDay.length + plansOnDay.length :
        layer === "org" ? publishedOnDay.length :
          personalOnDay.length + plansOnDay.length + publishedOnDay.length) === 0 &&
        <p className="text-sm text-slate-600">No activities shown on this date. You can still plan a new swim.</p>}
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Link className="rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white"
          href={`/account/plan-a-swim?date=${selectedDay}`}>+ Plan a new swim</Link>
        <Link className="rounded-lg border border-cyan-700 px-4 py-3 text-sm font-semibold text-cyan-900"
          href={`/account/find-a-swim?date=${selectedDay}`}>Find swims on this date</Link>
      </div>
    </SwimModal>}
    {selectedSessionId && <SwimModal title="Session details" onClose={() => setSelectedSessionId(null)}>
      <SessionDetailContent sessionId={selectedSessionId} />
    </SwimModal>}
  </div>;
}
