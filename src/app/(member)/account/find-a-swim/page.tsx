"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import { useSessionsHubData } from "@/app/(member)/sessions/useSessionsHubData";
import { isSessionRelevant, isConfirmedBooking } from "@/app/(member)/sessions/utils";
import { getSessionPriceDisplay } from "@/lib/sessionAccess";
import { MySwimsCalendar, sessionDayKey } from "@/components/swims/MySwimsCalendar";
import type { SessionWithRides } from "@/components/sessions/SessionCard";
import { isAssignedAcademyClass } from "@/lib/next-swim-recommendations";

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
function Discovery() {
  const router = useRouter();
  const params = useSearchParams();
  const rawDate = params.get("date") ?? "";
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [kind, setKind] = useState("all");
  const [relevant, setRelevant] = useState(true);
  const [location, setLocation] = useState("all");
  const [selected, setSelected] = useState<Map<string, SessionWithRides>>(new Map());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const {
    sessions, myBookings, attendance, enrolledCohortIds, myPodId,
    upcomingLoading, upcomingError,
  } = useSessionsHubData({ loadPast: false, date: date || undefined });
  const booked = useMemo(() => new Set([
    ...myBookings.filter(record => isConfirmedBooking(record.status)).map(record => record.session_id),
    ...attendance.filter(record => ["present", "late", "checked_in"].includes(record.status.toLowerCase())).map(record => record.session_id),
  ]), [myBookings, attendance]);
  const selectable = (session: SessionWithRides) =>
    session.access?.bookable === true &&
    !booked.has(session.id) &&
    !isAssignedAcademyClass(session, enrolledCohortIds) &&
    new Date(session.starts_at).getTime() > Date.now();
  const locations = Array.from(new Set(sessions.map(s => s.location_name || s.location).filter((x): x is string => !!x))).sort();
  const visible = sessions.filter(s => {
    if (date && sessionDayKey(s) !== date) return false;
    if (kind !== "all" && s.session_type !== kind) return false;
    if (location !== "all" && (s.location_name || s.location) !== location) return false;
    if (relevant && !isSessionRelevant(s, { bookedSessionIds: booked, enrolledCohortIds, myPodId })) return false;
    return new Date(s.starts_at).getTime() > Date.now() && !["cancelled", "draft"].includes(String(s.status).toLowerCase());
  });
  const grouped = new Map<string, SessionWithRides[]>();
  for (const item of visible) {
    const day = sessionDayKey(item);
    grouped.set(day, [...grouped.get(day) ?? [], item]);
  }
  const toggleSelected = (session: SessionWithRides) => {
    if (!selectable(session)) return;
    setSelected(current => {
      const copy = new Map(current);
      if (copy.has(session.id)) copy.delete(session.id);
      else if (copy.size < 10) copy.set(session.id, session);
      return copy;
    });
  };
  async function reviewBundle() {
    if (!selected.size || creating) return;
    setCreating(true);
    setError("");
    try {
      const cart = await apiPost<{id:string}>(
        "/api/v1/sessions/bundles",
        { session_ids: Array.from(selected.keys()) },
        { auth: true }
      );
      router.push(`/sessions/bundle/${cart.id}/book`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start bundle checkout");
      setCreating(false);
    }
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Find a Swim</h1>
        <p className="mt-1 text-sm text-slate-600">Discover published sessions, or plan your own swim.</p></div>
      <Link href="/account/plan-a-swim" className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800">
        + Plan a Swim
      </Link>
    </header>
    <nav className="flex flex-wrap gap-3 border-b border-slate-200 pb-4" aria-label="Other ways to swim">
      <span className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">Join a Swim</span>
      <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href="/pool-access">Book Pool Time</Link>
      <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href="/pools">Explore Pools & Reviews</Link>
      <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href="/account/bookings">My Swims</Link>
    </nav>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold text-slate-700">Date
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"/>
      </label>
      <label className="text-xs font-semibold text-slate-700">Activity
        <select value={kind} onChange={e=>setKind(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="all">All activities</option>
          {Array.from(new Set(sessions.map(s=>s.session_type))).sort().map(t=>
            <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-700">Location
        <select value={location} onChange={e=>setLocation(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="all">All locations</option>
          {locations.map(name => <option value={name} key={name}>{name}</option>)}
        </select>
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={relevant} onChange={e=>setRelevant(e.target.checked)}/> Recommended for me
      </label>
      {date && <button type="button" className="text-sm font-semibold text-cyan-700 underline" onClick={()=>setDate("")}>Clear date</button>}
      <div className="ml-auto flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(["list", "calendar"] as const).map(option =>
          <button key={option} onClick={()=>setView(option)} aria-pressed={view===option}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${view===option?"bg-slate-950 text-white":"text-slate-700"}`}>
            {option}
          </button>)}
      </div>
    </div>
    {upcomingError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Unable to load all published sessions. Try again before paying.
    </div>}
    {upcomingLoading && <p role="status">Loading upcoming swims…</p>}
    {view==="calendar" ? <MySwimsCalendar
      sessions={sessions}
      bookedSessionIds={booked}
      enrolledCohortIds={enrolledCohortIds}
      selectMode
      selectedIds={new Set(selected.keys())}
      onToggleSelect={toggleSelected}
      onStartSelecting={()=>{}}
      mode="upcoming"
    /> : visible.length===0 && !upcomingLoading ?
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">No matching swims in the loaded schedule. Try another date or clear filters.</p>
        <Link className="mt-3 inline-block text-sm font-semibold text-cyan-700 underline" href={`/account/plan-a-swim${date?`?date=${date}`:""}`}>Plan a swim instead</Link>
      </section> : <div className="space-y-5">
        {Array.from(grouped.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([day,rows])=>
          <section className="space-y-2" key={day}>
            <h2 className="text-sm font-bold text-slate-600">{formatDate(day)}</h2>
            {rows.map(session=>{
              const canSelect=selectable(session);
              const price=getSessionPriceDisplay(session.access??null,session.pool_fee);
              return <article key={session.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-cyan-300">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-semibold text-slate-950">{session.title}</h3>
                  <p className="text-sm text-slate-600">{new Date(session.starts_at).toLocaleTimeString("en-NG",{timeZone:"Africa/Lagos",hour:"numeric",minute:"2-digit"})} · {session.location_name || session.location || "Location to be confirmed"}</p>
                  <p className="text-xs text-slate-600">
                    {booked.has(session.id)?"Already confirmed" :
                      isAssignedAcademyClass(session,enrolledCohortIds)?"Assigned Academy class" :
                      canSelect?price.amountNaira===0?"Included / ₦0":`₦${price.amountNaira.toLocaleString("en-NG")} indicative` :
                      "Check eligibility in details"}
                  </p>
                </div>
                <Link href={`/sessions/${session.id}`} className="text-sm font-semibold text-cyan-700 hover:underline">Details</Link>
                {canSelect && <button type="button" onClick={()=>toggleSelected(session)}
                  aria-pressed={selected.has(session.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${selected.has(session.id)?"bg-cyan-50 text-cyan-900 ring-1 ring-cyan-700":"bg-cyan-700 text-white"}`}>
                  {selected.has(session.id)?"✓ Added":"+ Add"}
                </button>}
              </article>;
            })}
          </section>)}
      </div>}
    {selected.size>0 && <section className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300 bg-white p-4 shadow-xl" aria-live="polite">
      <div><p className="font-semibold text-slate-950">{selected.size} swim{selected.size===1?"":"s"} selected</p>
        <p className="text-xs text-slate-600">One Session bundle checkout. Final eligibility and price verified by the server.</p></div>
      <div className="flex gap-2">
        <button type="button" className="text-sm font-semibold text-slate-700 underline" onClick={()=>setSelected(new Map())}>Clear</button>
        <button type="button" className="rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={creating} onClick={()=>void reviewBundle()}>{creating?"Opening checkout…":"Review selected swims →"}</button>
      </div>
    </section>}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </main>;
}
export default function FindASwimPage(){
  return <Suspense fallback={<p className="p-6" role="status">Loading Find a Swim…</p>}><Discovery/></Suspense>;
}
