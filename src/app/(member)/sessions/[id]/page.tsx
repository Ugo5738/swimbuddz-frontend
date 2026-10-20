"use client";

import { apiGet, ApiError } from "@/lib/api";
import { getSession, type Session } from "@/lib/sessions";
import { activeSessionDetail, historicalSessionDetail, type SessionDetailView } from "@/lib/session-detail";
import type { HistoricalAttendance } from "@/lib/personal-swim-history";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";

const formatDate = (date: string | null) => {
  if (!date) return "Date unavailable";
  const timestamp = new Date(date);
  return Number.isNaN(timestamp.getTime()) ? "Date unavailable" :
    timestamp.toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" });
};

export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  const [details, setDetails] = useState<SessionDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      setNotAvailable(false);
      try {
        const session = await getSession(params.id, { auth: true });
        if (alive) setDetails(activeSessionDetail(session as Session));
      } catch (cause) {
        // Fallback only when the session endpoint cannot provide this record.
        // An attendance record belongs to the authenticated member.
        try {
          const records = await apiGet<HistoricalAttendance[]>("/api/v1/attendance/me", { auth: true });
          if (!alive) return;
          const historical = historicalSessionDetail(records, params.id);
          if (historical) setDetails(historical);
          else if (cause instanceof ApiError && [403, 404, 410].includes(cause.status)) setNotAvailable(true);
          else setError(cause instanceof Error ? cause.message : "Could not load session details.");
        } catch (fallbackError) {
          if (alive) setError(fallbackError instanceof Error ? fallbackError.message : "Could not load session details.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [params.id]);

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-10" role="status">Loading session details…</main>;

  if (notAvailable || error || !details) return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">{notAvailable ? "Session details unavailable" : "Unable to load session"}</h1>
      <p className="text-slate-600">{error || "This session is not accessible through your account, or its historical information is unavailable."}</p>
      <Link className="font-semibold text-cyan-700 underline" href="/account/bookings?view=past">Back to My Swims</Link>
    </main>
  );

  const attended = ["present", "late", "checked_in"].includes(details.attendanceStatus?.toLowerCase() ?? "");
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link className="text-sm font-semibold text-cyan-700 hover:underline" href="/account/bookings?view=past">← My Swims</Link>
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">Session details</p>
        <h1 className="text-3xl font-bold text-slate-900">{details.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          {details.sessionType && <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{details.sessionType.replaceAll("_", " ")}</span>}
          {details.status && <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{details.status.replaceAll("_", " ")}</span>}
          {details.attendanceStatus && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Attendance: {details.attendanceStatus.replaceAll("_", " ")}</span>}
        </div>
      </header>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true"/>{formatDate(details.startsAt)}</p>
        {details.endsAt && <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" aria-hidden="true"/>Ends {formatDate(details.endsAt)}</p>}
        {details.locationName && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true"/>{details.locationName}</p>}
        {details.locationAddress && <p className="text-sm text-slate-600">{details.locationAddress}</p>}
        {details.description && <p className="border-t border-slate-200 pt-4">{details.description}</p>}
        {details.historicalSnapshot && <p className="border-t border-slate-200 pt-4 text-sm text-slate-600">Historical details from your attendance record. Some original session information may no longer be available.</p>}
      </section>
      <div className="flex flex-wrap gap-3">
        {details.canBook && <Link href={`/sessions/${details.id}/book`} className="rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white">Book session</Link>}
        {attended && (
          <>
            <Link href={`/account/media-vault?session=${details.id}&action=view`} className="rounded-lg border border-cyan-700 px-4 py-3 font-semibold text-cyan-800">View session media</Link>
            <Link href={`/account/media-vault?session=${details.id}&action=contribute`} className="rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white">Contribute media</Link>
          </>
        )}
      </div>
    </main>
  );
}
