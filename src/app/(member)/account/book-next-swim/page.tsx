"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSessionsHubData } from "@/app/(member)/sessions/useSessionsHubData";
import { isSessionRelevant, isConfirmedBooking } from "@/app/(member)/sessions/utils";
import { getSessionPriceDisplay } from "@/lib/sessionAccess";
import { SessionType } from "@/lib/sessions";
import { CalendarDays, MapPin, Waves } from "lucide-react";

export default function BookNextSwimPage() {
  const data = useSessionsHubData({ loadPast: false });
  const confirmed = useMemo(() => new Set(data.myBookings.filter(b => isConfirmedBooking(b.status)).map(b => b.session_id)), [data.myBookings]);
  const matched = useMemo(() => data.sessions.filter(s =>
    new Date(s.starts_at).getTime() > Date.now() &&
    isSessionRelevant(s, { bookedSessionIds: confirmed, enrolledCohortIds: data.enrolledCohortIds, myPodId: data.myPodId })
  ).sort((a,b) => {
    const priority = (s: typeof a) => {
      if (s.cohort_id && data.enrolledCohortIds.has(s.cohort_id)) return 0;
      if (s.pod_id && s.pod_id === data.myPodId) return 1;
      if (confirmed.has(s.id)) return 2;
      if (s.access?.bookable === true) return 3;
      return 4;
    };
    return priority(a)-priority(b) || new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime();
  }), [data.sessions, data.enrolledCohortIds, data.myPodId, confirmed]);

  const pending = data.upcomingLoading || data.personalizationLoading || data.bookingsLoading;
  const first = matched[0];
  const isAssignedClass = (s: typeof first) => !!s && s.session_type === SessionType.COHORT_CLASS &&
    !!s.cohort_id && data.enrolledCohortIds.has(s.cohort_id) && s.cohort_fee_mode !== "paid_extra";
  const action = (s: typeof first) => {
    const assigned = isAssignedClass(s);
    const booked = confirmed.has(s.id);
    return {
      label: assigned ? "View My Next Class" : booked ? "View My Booking" : s.access?.bookable ? "Continue to Booking" : "View Session",
      href: assigned ? `/sessions/${s.id}` : booked ? `/sessions/${s.id}/book` : s.access?.bookable ? `/sessions/${s.id}/book` : `/sessions/${s.id}`,
    };
  };
  const card = (s: typeof first, primary = false) => {
    if (!s) return null;
    const price = getSessionPriceDisplay(s.access ?? null, s.pool_fee);
    const cta = action(s);
    return <article key={s.id} className={`space-y-3 rounded-2xl border bg-white p-5 ${primary?"border-cyan-300 shadow-sm":"border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">{primary ? "Best available match" : "Other suitable swim"}</p>
        {confirmed.has(s.id) && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Already booked</span>}
        {isAssignedClass(s) && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Assigned Academy class</span>}
      </div>
      <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
      <p className="flex gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4 shrink-0" />{new Date(s.starts_at).toLocaleString("en-NG", {dateStyle:"full",timeStyle:"short"})}</p>
      <p className="flex gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0" />{s.location_name || s.location || "Location to be confirmed"}</p>
      {s.pod_id === data.myPodId && data.myPodName && <p className="text-sm text-cyan-800">Your pod: {data.myPodName}</p>}
      <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm">
        <span className="text-slate-600">{isAssignedClass(s) ? "Included in active Academy enrollment" : price.label}</span>
        <strong>{isAssignedClass(s) ? "No separate reservation" : price.amountNaira === 0 ? "Included / ₦0" : `₦${price.amountNaira.toLocaleString("en-NG")}`}</strong>
      </div>
      <Link href={cta.href} className="flex min-h-11 items-center justify-center rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800">{cta.label}</Link>
      <Link href={`/sessions/${s.id}`} className="block text-center text-sm font-semibold text-cyan-700 underline">View full session details</Link>
      <p className="text-xs text-slate-500">Final availability, eligibility and charges are verified when booking. Payment and booking confirmation are handled by the existing secure flow.</p>
    </article>;
  };
  return <main className="mx-auto max-w-4xl space-y-6 px-3 py-6">
    <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Quick booking</p><h1 className="text-3xl font-bold text-slate-950">Book My Next Swim</h1><p className="text-sm text-slate-600">Your assigned classes and eligible sessions first. Browse alternatives without losing your usual pod or programme.</p></header>
    {pending ? <p role="status">Finding your next suitable swim…</p> : data.upcomingError ? <p role="alert" className="rounded-xl bg-red-50 p-4">Sessions couldn't be loaded. Please try again.</p> :
      first ? <div className="space-y-6">{card(first,true)}{matched.length>1&&<section className="space-y-3"><h2 className="text-lg font-semibold">Other suitable swims</h2><div className="grid gap-4 md:grid-cols-2">{matched.slice(1,7).map(s=>card(s))}</div></section>}</div> :
      <div className="rounded-2xl border border-dashed p-8 text-center"><Waves className="mx-auto mb-3 h-10 w-10 text-cyan-700"/><p className="font-semibold">No suitable upcoming session found</p><p className="mt-2 text-sm text-slate-600">Check your pod, package, or eligibility; no unrelated session will be shown as a best match.</p></div>}
    <Link href="/find-a-swim/sessions" className="inline-block text-sm font-semibold text-cyan-700 underline">Explore all published sessions</Link>
  </main>;
}
