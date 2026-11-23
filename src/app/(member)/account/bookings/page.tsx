"use client";

import Link from "next/link";
import { SwimRewards } from "@/components/swims/SwimRewards";
import { SwimModal } from "@/components/swims/SwimModal";
import { SessionDetailContent } from "@/components/swims/SessionDetailContent";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePersonalSwims } from "@/hooks/usePersonalSwims";
import { PersonalSwimCalendar, swimDay } from "@/components/swims/PersonalSwimCalendar";
import { PoolVisitActions } from "@/components/swims/PoolVisitActions";
import type { SwimActivity } from "@/lib/my-swims";
import type { PersonalSwimHistoryItem } from "@/lib/personal-swim-history";

type Tab = "list" | "calendar" | "history";
function label(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Confirmed", assigned: "Assigned",
    scheduled_for_pod: "Scheduled for your pod", scheduled_for_club: "Scheduled for your Club",
    pending_payment: "Payment pending", pending: "Awaiting confirmation",
    cancelled: "Cancelled", session_cancelled: "Cancelled",
    present: "Attended", checked_in: "Attended", late: "Attended (late)",
    no_show: "Absent", excused: "Excused", absent: "Absent",
  };
  return labels[status.toLowerCase()] ?? status.replaceAll("_", " ");
}
function formatTime(date: string | null) {
  if (!date) return "Date not confirmed";
  const value = new Date(date);
  return Number.isNaN(value.valueOf()) ? "Date not confirmed" :
    value.toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" });
}
function formatGroup(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  });
}
function group<T>(rows: T[], getDate: (row: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const date = swimDay(getDate(row)) || "unconfirmed";
    map.set(date, [...map.get(date) ?? [], row]);
  }
  return Array.from(map.entries());
}
function Status({ status }: { status: string }) {
  const s = status.toLowerCase();
  const positive = ["confirmed", "present", "checked_in", "late"].includes(s);
  const warning = ["pending", "pending_payment", "excused"].includes(s);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${positive
    ? "bg-emerald-50 text-emerald-800" : warning
      ? "bg-amber-50 text-amber-900" : s === "assigned"
        ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-700"}`}>
    {label(status)}
  </span>;
}
function ActivityRow({ item, onChanged, onDetails }: { item: SwimActivity; onChanged: () => Promise<unknown>; onDetails: (id: string) => void }) {
  const href = item.sessionId ? `/sessions/${item.sessionId}` : "/account/pool-access";
  return <article className="rounded-xl border border-slate-200 bg-white p-4 hover:border-cyan-300">
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        {item.sessionId
          ? <button type="button" onClick={() => onDetails(item.sessionId!)} className="block text-left text-base font-semibold text-slate-950 hover:text-cyan-700">{item.title}</button>
          : <Link href={href} className="block text-base font-semibold text-slate-950 hover:text-cyan-700">{item.title}</Link>}
        <p className="mt-1 text-sm text-slate-600">{formatTime(item.date)} · {item.location || "Location to be confirmed"}</p>
      </div>
      <Status status={item.status}/>
      {item.scheduledClub && item.canBook && item.sessionId
        ? <Link href={`/sessions/${item.sessionId}/book`}
            className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Book this swim</Link>
        : item.sessionId
          ? <button type="button" onClick={() => onDetails(item.sessionId!)} className="text-sm font-semibold text-cyan-700 hover:underline" aria-label={`View ${item.title} details`}>Details →</button>
          : <Link href={href} className="text-sm font-semibold text-cyan-700 hover:underline">Details →</Link>}
    </div>
    {item.scheduledClub && <p className="mt-2 text-xs text-slate-600">On your Club schedule · A spot is not yet reserved</p>}
    {item.pool && <div className="mt-3 border-t border-slate-100 pt-3"><PoolVisitActions booking={item.pool} onChanged={() => void onChanged()}/></div>}
  </article>;
}
function HistoryRow({ item, onDetails }: { item: PersonalSwimHistoryItem; onDetails: (id: string) => void }) {
  const href = item.sessionId ? `/sessions/${item.sessionId}` : "/account/pool-access";
  const outcome = item.attendanceStatus || item.bookingStatus || "not_recorded";
  const body = <div className="flex items-center gap-3">
    <div className="min-w-0 flex-1">
      <strong className="block text-base text-slate-950">{item.title}</strong>
      <p className="mt-1 text-sm text-slate-600">{formatTime(item.date)} · {item.location || "Location unavailable"}</p>
    </div>
    {outcome === "not_recorded"
      ? <span className="text-xs text-slate-600">Attendance not recorded</span>
      : <Status status={outcome}/>}
    <span className="text-cyan-700" aria-hidden="true">→</span>
  </div>;
  return item.sessionId
    ? <button type="button" onClick={() => onDetails(item.sessionId!)} className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-cyan-300">{body}</button>
    : <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-cyan-300">{body}</Link>;
}
function PageContent() {
  const searchParams = useSearchParams();
  const firstView = searchParams.get("view");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(
    ["history", "past"].includes(firstView || "") ? "history" : "list"
  );
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const projection = usePersonalSwims();
  const data = projection.data;
  const upcoming = useMemo(() => (data?.upcoming ?? []).slice()
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()), [data]);
  const next = upcoming.find(item => [
    "assigned", "confirmed", "scheduled_for_pod", "scheduled_for_club",
  ].includes(item.status));
  const locations = useMemo(() =>
    Array.from(new Set((data?.activities ?? []).map(i => i.location).filter((i): i is string => !!i))).sort(),
    [data]);
  const displayed = upcoming.filter(item =>
    (type === "all" || type === item.kind) &&
    (status === "all" || status === item.status) &&
    (location === "all" || item.location === location)
  );
  const history = (data?.history ?? []).filter(item =>
    (type === "all" || type === item.kind) &&
    (status === "all" || status === item.attendanceStatus || status === item.bookingStatus) &&
    (location === "all" || item.location === location)
  );
  const pendingPlans = (data?.plans ?? []).filter(p => !p.linked_event_id);
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">My Swims</h1>
      <Link href="/account/find-a-swim" className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800">
        + Find a Swim
      </Link>
    </header>
    {projection.isLoading && <p role="status" className="rounded-xl border border-slate-200 p-4">Loading your swims…</p>}
    {projection.isError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      We couldn't load your swimming schedule. <button type="button" onClick={() => void projection.refetch()} className="font-semibold underline">Retry</button>
    </p>}
    {data && <>
      {data.errors.length > 0 &&
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Some records couldn't be loaded ({data.errors.join(", ")}). Missing information does not mean a swim was cancelled.
          <button type="button" onClick={() => void projection.refetch()} className="ml-2 font-semibold underline">Retry</button>
        </p>}
      {next && <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-800">
            {next.scheduledClub ? "Next on your Club schedule" : "Your next swim"}
          </span>
          <Status status={next.status}/>
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-950">{next.title}</h2>
        <p className="mt-2 text-sm text-slate-700">
          {next.date ? new Date(next.date).toLocaleString("en-NG", {
            timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
          }) : "Date to be confirmed"} · {next.location || "Location to be confirmed"}
        </p>
        {next.scheduledClub && <p className="mt-2 text-sm text-slate-700">You have not booked this session yet.</p>}
        {next.sessionId
          ? <button type="button" onClick={() => setSelectedSessionId(next.sessionId!)}
              className="mt-3 inline-flex rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-white">View details</button>
          : <Link href="/account/pool-access" className="mt-3 inline-flex rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-white">View visit</Link>}
      </section>}
    </>}
    <SwimRewards />
    {data && <>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist" aria-label="My Swims views">
        {([{ id: "list", name: "List" }, { id: "calendar", name: "Calendar" }, { id: "history", name: "History" }] as const)
          .map(option => <button role="tab" key={option.id} type="button"
            aria-selected={tab === option.id} onClick={() => setTab(option.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === option.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {option.name}
          </button>)}
      </div>
      {tab === "calendar" ? <PersonalSwimCalendar activities={data.activities} plans={data.plans}/> :
        <>
          <div className="flex flex-wrap gap-2" aria-label="Filter swimming records">
            <select aria-label="Activity type" value={type} onChange={e => setType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="all">All types</option>
              {["club", "academy", "community", "session", "pool"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="Booking or attendance status" value={status} onChange={e => setStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              {["assigned", "scheduled_for_pod", "scheduled_for_club", "confirmed", "pending_payment", "pending", "present", "late", "excused", "no_show", "cancelled"].map(s =>
                <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <select aria-label="Location" value={location} onChange={e => setLocation(e.target.value)}
              className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="all">All locations</option>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            {(type !== "all" || status !== "all" || location !== "all") &&
              <button type="button" className="text-sm font-semibold text-cyan-700 underline"
                onClick={() => { setType("all"); setStatus("all"); setLocation("all"); }}>Clear filters</button>}
          </div>
          {tab === "list" ? <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Upcoming swims</h2>
            {displayed.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{type !== "all" || status !== "all" || location !== "all"
              ? "No scheduled swims match these filters."
              : "No upcoming swims are on your schedule yet. Explore eligible sessions or plan your next swim."}</p> :
              group(displayed, item => item.date).map(([day, rows]) =>
                <div className="space-y-2" key={day}>
                  <h3 className="text-sm font-semibold text-slate-600">{day === "unconfirmed" ? "Date to be confirmed" : formatGroup(day)}</h3>
                  {rows.map(item => <ActivityRow key={item.key} item={item} onChanged={projection.refetch} onDetails={setSelectedSessionId}/>)}
                </div>)}
            {pendingPlans.length > 0 && <section className="space-y-3 pt-2">
              <h2 className="text-lg font-semibold text-slate-950">Swim plans awaiting confirmation</h2>
              {pendingPlans.map(plan => <article key={plan.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <strong className="text-sm text-slate-950">{plan.title}</strong>
                <p className="mt-1 text-xs text-amber-900">{new Date(plan.starts_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} · {plan.status.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-amber-900">Not yet a confirmed reservation. No payment is due.</p>
              </article>)}
            </section>}
          </section> :
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Swimming history</h2>
            {history.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No historical swimming records match these filters.</p> :
              group(history, item => item.date).map(([day, records]) =>
                <div key={day} className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-600">{day === "unconfirmed" ? "Unknown date" : formatGroup(day)}</h3>
                  {records.map(record => <HistoryRow key={record.key} item={record} onDetails={setSelectedSessionId}/>)}
                </div>)}
            <Link href="/account/attendance/history" className="inline-block text-sm font-semibold text-cyan-700 underline">
              Full attendance records
            </Link>
          </section>}
        </>}
    </>}
    {selectedSessionId && <SwimModal title="Session details" onClose={() => setSelectedSessionId(null)}><SessionDetailContent sessionId={selectedSessionId}/></SwimModal>}
  </main>;
}
export default function MySwimsPage() {
  return <Suspense fallback={<p role="status" className="p-6">Loading My Swims…</p>}>
    <PageContent />
  </Suspense>;
}
