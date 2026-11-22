"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { SwimPlansApi, type SwimPlanKind, type PartnerPoolForPlanning } from "@/lib/swim-plans";
import { weatherWindowSummaryPath, type WeatherWindowSummaryResponse } from "@/lib/weather";

type Offer = { id: string; pool_id: string; title: string; starts_at: string; ends_at: string; selling_price_kobo: number; currency: string };

function localClock(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const candidate = new Date(`${date}T${time}:00+01:00`);
  return Number.isNaN(candidate.valueOf()) ? null : candidate.toISOString();
}
function timeAfter(starts: string, minutes: number): string | null {
  const value = new Date(starts);
  return Number.isNaN(value.valueOf()) ? null : new Date(value.getTime() + minutes * 60000).toISOString();
}
const kinds: { kind: SwimPlanKind; title: string; description: string }[] = [
  { kind: "solo", title: "Just me", description: "Independent swimming or practice" },
  { kind: "friends", title: "Me and my friends", description: "Choose how many places you'll need" },
  { kind: "open", title: "Invite other Buddz", description: "A member-hosted swim open to others" },
  { kind: "coached", title: "I need a coach", description: "Request a qualified coach and a suitable pool" },
];

function Form() {
  const params = useSearchParams();
  const fromDate = params.get("date") ?? "";
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : "");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [kind, setKind] = useState<SwimPlanKind>(
    kinds.some((item) => item.kind === params.get("kind")) ? params.get("kind") as SwimPlanKind : "solo"
  );
  const [poolId, setPoolId] = useState("");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState(1);
  const [focus, setFocus] = useState("");
  const [step, setStep] = useState<"type" | "details" | "review" | "complete">("type");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState("");

  const poolsQuery = useQuery({
    queryKey: ["swim-planning", "partner-pools"],
    queryFn: () => SwimPlansApi.pools(),
  });
  const selectedPool: PartnerPoolForPlanning | null = useMemo(
    () => poolsQuery.data?.items.find((row) => row.id === poolId) ?? null,
    [poolsQuery.data, poolId]
  );
  const startsAt = localClock(date, time);
  const endsAt = startsAt ? timeAfter(startsAt, duration) : null;
  const weather = useQuery({
    queryKey: ["swim-plan-weather", poolId, startsAt, endsAt],
    enabled: Boolean(poolId && startsAt && endsAt),
    queryFn: () => apiGet<WeatherWindowSummaryResponse | null>(
      weatherWindowSummaryPath(poolId, startsAt!, endsAt!), { auth: true }
    ),
    retry: false,
  });
  const offers = useQuery({
    queryKey: ["swim-plan-pool-offers", poolId],
    enabled: Boolean(poolId),
    queryFn: () => apiGet<Offer[]>(`/api/v1/pools/access/offers?pool_id=${encodeURIComponent(poolId)}`),
  });
  const matchingOffers = (offers.data ?? []).filter((offer) =>
    startsAt && new Date(offer.starts_at).getTime() === new Date(startsAt).getTime()
  );
  const defaultName = kind === "solo" ? "My independent swim" :
    kind === "friends" ? "Swim with friends" :
      kind === "open" ? "Open swim with Buddz" : "Coached swim request";

  async function submit() {
    if (!startsAt || !endsAt) return setError("Select a valid date, time and duration.");
    setSubmitting(true);
    setError("");
    try {
      const result = await SwimPlansApi.create({
        kind, title: title.trim() || defaultName, notes: notes.trim() || null,
        starts_at: startsAt, ends_at: endsAt, pool_id: poolId || null,
        location: location.trim() || null,
        participants: kind === "solo" ? 1 : participants,
        coaching_focus: kind === "coached" ? focus || "General swimming" : null,
      });
      setPlanId(result.id);
      setStatus(result.status);
      setStep("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit the plan.");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-cyan-700";
  const primary = "rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50";
  const secondary = "rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <header className="space-y-2">
      <Link href="/account/find-a-swim" className="text-sm font-semibold text-cyan-700 hover:underline">← Find a Swim</Link>
      <h1 className="text-3xl font-bold text-slate-950">Plan a Swim</h1>
      <p className="text-sm text-slate-600">Choose when, where, and who is swimming. A request does not reserve pool time or charge you.</p>
    </header>
    <div className="flex gap-2 text-xs font-semibold text-slate-500">
      {["Who", "Where and when", "Review"].map((name, i) =>
        <span key={name} className={`flex-1 border-b-2 pb-2 ${(["type", "details", "review"].indexOf(step) >= i) ? "border-cyan-700 text-cyan-700" : "border-slate-200"}`}>{name}</span>
      )}
    </div>
    {step === "type" && <section className="space-y-3">
      <h2 className="text-xl font-semibold">Who is joining?</h2>
      {kinds.map((item) => <button type="button" key={item.kind}
        onClick={() => setKind(item.kind)}
        aria-pressed={kind === item.kind}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left focus-visible:outline-cyan-700 ${kind === item.kind ? "border-cyan-700 bg-cyan-50" : "border-slate-200 bg-white hover:border-cyan-400"}`}>
        <span><strong className="block text-slate-950">{item.title}</strong><span className="text-sm text-slate-600">{item.description}</span></span>
        <span className="text-cyan-800">{kind === item.kind ? "✓" : "○"}</span>
      </button>)}
      <button type="button" className={primary} onClick={() => setStep("details")}>Continue →</button>
    </section>}
    {step === "details" && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">Date
          <input className={input} type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold text-slate-800">Start time
          <input className={input} type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold text-slate-800">Duration
          <select className={input} value={duration} onChange={e => setDuration(Number(e.target.value))}>
            {[30, 45, 60, 90, 120, 180].map(n => <option key={n} value={n}>{n} minutes</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">Number of swimmers
          <input className={input} type="number" value={kind === "solo" ? 1 : participants} min={1} max={25} disabled={kind === "solo"}
            onChange={e => setParticipants(Math.min(25, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-800">Swimming pool
        <select className={input} value={poolId} onChange={e => setPoolId(e.target.value)}>
          <option value="">Choose a SwimBuddz partner pool</option>
          {(poolsQuery.data?.items ?? []).map(p => <option key={p.id} value={p.id}>{p.name}{p.location_area ? ` · ${p.location_area}` : ""}</option>)}
        </select>
      </label>
      {poolsQuery.isError && <p role="alert" className="text-sm text-amber-800">Partner pool directory unavailable. Retry before submitting a pool-backed request.</p>}
      {poolsQuery.data && poolsQuery.data.total > poolsQuery.data.items.length &&
        <p className="text-xs text-amber-800">Showing the first {poolsQuery.data.items.length} partner pools. More locations are available through the directory.</p>}
      {kind !== "open" && <label className="block text-sm font-semibold text-slate-800">Alternative location or area
        <input className={input} value={location} onChange={e => setLocation(e.target.value)} maxLength={255} placeholder="Optional, or request a pool near you" />
      </label>}
      <label className="block text-sm font-semibold text-slate-800">Swim title
        <input className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder={defaultName} />
      </label>
      <label className="block text-sm font-semibold text-slate-800">Notes (optional)
        <textarea className={input} rows={3} value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} placeholder="Tell us anything important about this swim" />
      </label>
      {kind === "coached" && <label className="block text-sm font-semibold text-slate-800">Coaching focus
        <input className={input} value={focus} onChange={e => setFocus(e.target.value)} placeholder="Freestyle technique, confidence, club readiness…" />
      </label>}
      {poolId && <div className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="font-semibold text-cyan-950">{selectedPool?.name || "Selected pool"}</p>
        <p className="text-sm text-cyan-950">Select your preferred time and send a request. We'll confirm whether this pool can accommodate your swim before asking you to pay.</p>
        {matchingOffers.length > 0 && <p className="text-sm text-cyan-950">A published pool visit may already be available for this time. <Link href={`/account/pool-time?pool_id=${poolId}`} className="font-semibold underline">View the existing offer and its checkout price</Link>.</p>}
        <p className="text-sm text-cyan-950">Weather: {weather.isLoading ? "Loading forecast…" : weather.data ?
          `${weather.data.condition_text} · ${weather.data.temperature_high_c ?? "—"}°C high${weather.data.stale ? " (stale forecast)" : ""}`
          : "No reliable forecast available for this session window."}</p>
      </div>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={secondary} onClick={() => setStep("type")}>Back</button>
        <button type="button" className={primary} disabled={!date || !poolId && !location.trim() || kind === "open" && !poolId}
          onClick={() => { setError(""); setStep("review"); }}>Review plan →</button>
      </div>
    </section>}
    {step === "review" && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">Review your request</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Type</dt><dd className="font-semibold capitalize">{kind}</dd></div>
        <div><dt className="text-slate-500">Swimmers</dt><dd className="font-semibold">{kind === "solo" ? 1 : participants}</dd></div>
        <div><dt className="text-slate-500">Date and time</dt><dd className="font-semibold">{date || "Date needed"} · {time}</dd></div>
        <div><dt className="text-slate-500">Pool</dt><dd className="font-semibold">{selectedPool?.name || location}</dd></div>
      </dl>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        This is a request, not a confirmed booking. We will check pool availability and, for coached swims, coach availability. You will see the final price and applicable terms before deciding whether to pay.
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={secondary} onClick={() => setStep("details")}>Edit details</button>
        <button type="button" className={primary} disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Submitting…" : "Submit swim plan"}
        </button>
      </div>
    </section>}
    {step === "complete" && <section className="space-y-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
      <h2 className="text-xl font-bold text-cyan-950">Swim plan submitted</h2>
      <p className="text-sm text-cyan-950">Your request has been received. We will confirm your pool time and price before you commit to a booking.</p>
      <p className="text-xs text-cyan-800">Request: {planId} · {status.replaceAll("_", " ")}</p>
      <Link href="/account/bookings" className="inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white">Back to My Swims</Link>
    </section>}
  </main>;
}
export default function PlanASwimPage() {
  return <Suspense fallback={<p className="p-6" role="status">Loading swim planner…</p>}><Form /></Suspense>;
}
