"use client";

import { PoolVisitActions } from "@/components/swims/PoolVisitActions";
import { apiGet, apiPost } from "@/lib/api";
import {
  buildSwimActivities, categorizeActivities, formatSwimDate,
  type SessionBooking, type SwimSession, type ClubQuarterSwim,
  type PoolVisitBooking, type PoolVisitOffer, type SwimActivity,
} from "@/lib/my-swims";
import { Clock3, History, Waves } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type View = "upcoming" | "history";
type AttendanceRecord = {
  id: string;
  session_id: string;
  status: string;
  session?: { title?: string; start_time?: string; location_name?: string };
};

function isView(input: string | null): input is View {
  return input === "upcoming" || input === "history";
}

function statusText(status: string): string {
  const labels: Record<string, string> = {
    confirmed: "Booked", pending: "Awaiting confirmation", pending_payment: "Payment pending",
    cancelled: "Attendance cancelled", session_cancelled: "Session cancelled",
  };
  return labels[status] || status.replace(/_/g, " ");
}

function kindText(kind: SwimActivity["kind"]): string {
  const labels = { club: "Club", academy: "Academy", community: "Community",
    session: "SwimBuddz", pool: "Independent pool visit" };
  return labels[kind];
}

export default function MySwimsPage() {
  const [view, setView] = useState<View>("upcoming");
  const [activities, setActivities] = useState<SwimActivity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("view");
    if (isView(selected)) setView(selected);
  }, []);

  const load = useCallback(async () => {
    const requests = await Promise.allSettled([
      apiGet<SessionBooking[]>("/api/v1/sessions/bookings/me", { auth: true }),
      apiGet<SwimSession[]>("/api/v1/sessions?limit=100", { auth: true }),
      apiGet<ClubQuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter", { auth: true }),
      apiGet<PoolVisitBooking[]>("/api/v1/pools/access/bookings/me", { auth: true }),
      apiGet<PoolVisitOffer[]>("/api/v1/pools/access/offers"),
      apiGet<AttendanceRecord[]>("/api/v1/attendance/me", { auth: true }),
    ]);
    const value = <T,>(index: number): T[] =>
      requests[index].status === "fulfilled" ? (requests[index] as PromiseFulfilledResult<T[]>).value : [];
    setActivities(buildSwimActivities(
      value<SessionBooking>(0), value<SwimSession>(1), value<ClubQuarterSwim>(2),
      value<PoolVisitBooking>(3), value<PoolVisitOffer>(4)
    ));
    setAttendance(value<AttendanceRecord>(5));
    setErrors(requests.flatMap((item, index) => item.status === "rejected" ?
      [["Session bookings", "Session dates", "Club reservations", "Pool visits", "Pool visit dates", "Attendance"][index]] : []));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const sections = useMemo(() => categorizeActivities(activities), [activities]);

  const cancelClub = async (item: SwimActivity) => {
    if (!window.confirm("Cancel your attendance for this Club swim? This frees your seat and does not refund your quarterly payment.")) return;
    setBusy(item.bookingId);
    setActionError("");
    try {
      await apiPost(`/api/v1/sessions/bookings/${item.bookingId}/cancel`, {}, { auth: true });
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to cancel Club attendance.");
    } finally { setBusy(null); }
  };

  const changeView = (next: View) => {
    setView(next);
    window.history.replaceState(null, "", `/account/bookings?view=${next}`);
  };

  const activityCard = (activity: SwimActivity) => {
    const dateMissing = !activity.date;
    const cancelled = ["cancelled", "session_cancelled"].includes(activity.status);
    return (
      <article key={activity.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{kindText(activity.kind)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cancelled ? "bg-slate-100 text-slate-600" : activity.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
            {statusText(activity.status)}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-slate-900">{activity.title}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {formatSwimDate(activity.date)}
          {activity.location ? ` · ${activity.location}` : ""}
        </p>
        {dateMissing && <p className="mt-1 text-xs text-amber-800">We could not confirm the date for this booking. Open its details for the latest information.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {activity.sessionId && (
            <Link href={`/sessions/${activity.sessionId}`} className="text-sm font-semibold text-cyan-700 hover:underline">View swim details</Link>
          )}
          {activity.club?.status === "confirmed" && activity.club.session_status === "scheduled" &&
            activity.date && new Date(activity.date).getTime() >= Date.now() && (
              <button type="button" disabled={busy !== null} onClick={() => void cancelClub(activity)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:opacity-50">
                {busy === activity.bookingId ? "Cancelling…" : "Can't attend? Cancel"}
              </button>
          )}
          {activity.club?.status === "cancelled" && activity.club.session_status === "scheduled" &&
            activity.date && new Date(activity.date).getTime() >= Date.now() && (
              <Link href={`/sessions/${activity.sessionId}/book`} className="text-sm font-semibold text-cyan-700 hover:underline">Reserve again if space is available</Link>
          )}
        </div>
        {activity.club && <p className="mt-2 text-xs text-slate-500">Included in your Club quarter. Cancelling attendance does not refund the quarter.</p>}
        {activity.pool && <div className="mt-3 border-t border-slate-100 pt-3">
          <PoolVisitActions booking={activity.pool} onChanged={load} />
        </div>}
      </article>
    );
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-3 py-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">My Swims</h1>
        <p className="text-sm text-slate-600">Your personal swimming commitments, reservations and attendance history. Browse the wider schedule separately in the SwimBuddz Calendar.</p>
        <Link href="/find-a-swim" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline">
          <Waves className="h-4 w-4" /> Find a Swim
        </Link>
      </header>

      <div role="tablist" aria-label="My Swims views" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {([
          ["upcoming", "My bookings", Clock3],
                    ["history", "Past swims", History],
        ] as const).map(([key, label, Icon]) => (
          <button type="button" role="tab" aria-selected={view === key} key={key} onClick={() => changeView(key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition ${view === key ? "bg-white text-cyan-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {errors.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Some reservation information could not be loaded ({errors.join(", ")}). A missing booking here does not mean it was cancelled.
        <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Retry</button>
      </div>}
      {actionError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}

      {loading ? <p className="py-8 text-center text-sm text-slate-600" role="status">Loading your swims…</p>
        : view === "upcoming" ? (
          <div className="space-y-6">
            {sections.upcoming.length ? <section aria-label="Upcoming booked swims" className="space-y-3">
              {sections.upcoming.map(activityCard)}
            </section> : <div className="rounded-2xl border bg-white p-8 text-center">
              <h2 className="font-semibold text-slate-900">No upcoming reservations yet</h2>
              <p className="mt-1 text-sm text-slate-600">Your confirmed reservations will appear here. SwimBuddz activities are still happening — explore them below.</p>
              <Link href="/find-a-swim/sessions" className="mt-3 inline-block text-sm font-semibold text-cyan-700 underline">Browse available sessions</Link>
            </div>}
            <p className="text-sm text-slate-600">Looking for an upcoming swim? <Link href="/find-a-swim/sessions" className="font-semibold text-cyan-700 underline">Discover SwimBuddz sessions</Link> or <Link href="/calendar" className="font-semibold text-cyan-700 underline">view the full calendar</Link>.</p>
            {sections.attention.length > 0 && <section className="space-y-3" aria-label="Bookings needing attention">
              <h2 className="text-lg font-semibold text-slate-900">Bookings needing attention</h2>
              {sections.attention.map(activityCard)}
            </section>}
          </div>
        ) : (
          <div className="space-y-6">
            {sections.past.length > 0 && <section aria-label="Past bookings" className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Previous bookings</h2>
              <p className="text-sm text-slate-600">A past booking does not necessarily mean you attended.</p>
              {sections.past.map(activityCard)}
            </section>}
            <section aria-label="Attendance history" className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Recorded attendance</h2>
              {attendance.length ? <div className="space-y-2">
                {attendance.filter(record => record.session?.start_time &&
                  new Date(record.session.start_time).getTime() < Date.now())
                  .sort((a,b) => new Date(b.session?.start_time || 0).getTime() - new Date(a.session?.start_time || 0).getTime())
                  .map(record => <article key={record.id} className="rounded-xl border bg-white p-4">
                    <h3 className="font-semibold text-slate-900">{record.session?.title || "SwimBuddz session"}</h3>
                    <p className="text-sm text-slate-600">{formatSwimDate(record.session?.start_time || null)} · {record.session?.location_name || "Location unavailable"}</p>
                    <p className="mt-1 text-xs capitalize text-cyan-800">Attendance: {record.status.replace(/_/g, " ")}</p>
                    {["present", "late"].includes(record.status.toLowerCase()) && <div className="mt-3 flex flex-wrap gap-3">
                      <Link href={`/account/media-vault?session=${record.session_id}&action=view`}
                        className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-800">View session media</Link>
                      <Link href={`/account/media-vault?session=${record.session_id}&action=contribute`}
                        className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">Contribute media</Link>
                    </div>}
                  </article>)}
              </div> : <p className="rounded-xl border bg-white p-5 text-sm text-slate-600">No attendance records have been loaded.</p>}
              <Link href="/account/attendance/history" className="inline-block text-sm font-semibold text-cyan-700 underline">Full attendance record</Link>
            </section>
          </div>
        )}
    </main>
  );
}
