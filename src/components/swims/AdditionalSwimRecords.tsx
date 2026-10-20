"use client";

import { AcademyApi, type Enrollment } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import {
  buildSwimActivities,
  categorizeActivities,
  formatSwimDate,
  type ClubQuarterSwim,
  type PoolVisitBooking,
  type PoolVisitOffer,
  type SessionBooking,
  type SwimActivity,
  type SwimSession,
} from "@/lib/my-swims";
import { PoolVisitActions } from "@/components/swims/PoolVisitActions";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AttendanceRecord = {
  id: string;
  session_id: string;
  status: string;
  session?: { title?: string; start_time?: string; starts_at?: string; location_name?: string };
};

type Props = {
  view: "booked" | "past";
  /** Session cards already rendered in the primary Sessions Hub view. */
  representedSessionIds: string[];
  primaryHasSessions: boolean;
};

const attendanceLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    confirmed: "Booked",
    pending: "Awaiting confirmation",
    pending_payment: "Payment pending",
    assigned: "Academy cohort class",
    cancelled: "Attendance cancelled",
    session_cancelled: "Session cancelled",
  };
  return labels[status] ?? attendanceLabel(status);
};

/**
 * Add non-standard member commitments to Sessions Hub without running a
 * second competing "My Swims" page. Standard session cards remain the owner
 * of all booked-session controls; these cards preserve pool access, quarter
 * reservations and enrolled-but-not-booked Academy classes.
 */
export function AdditionalSwimRecords({ view, representedSessionIds, primaryHasSessions }: Props) {
  const [activities, setActivities] = useState<SwimActivity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sessionDates, setSessionDates] = useState<SwimSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const responses = await Promise.allSettled([
      apiGet<SessionBooking[]>("/api/v1/sessions/bookings/me", { auth: true }),
      apiGet<SwimSession[]>("/api/v1/sessions?limit=100", { auth: true }),
      apiGet<ClubQuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter", { auth: true }),
      apiGet<PoolVisitBooking[]>("/api/v1/pools/access/bookings/me", { auth: true }),
      apiGet<PoolVisitOffer[]>("/api/v1/pools/access/offers"),
      apiGet<AttendanceRecord[]>("/api/v1/attendance/me", { auth: true }),
      AcademyApi.getMyEnrollments(),
    ]);
    const values = <T,>(index: number): T[] =>
      responses[index].status === "fulfilled"
        ? (responses[index] as PromiseFulfilledResult<T[]>).value
        : [];
    setActivities(buildSwimActivities(
      values<SessionBooking>(0),
      values<SwimSession>(1),
      values<ClubQuarterSwim>(2),
      values<PoolVisitBooking>(3),
      values<PoolVisitOffer>(4),
      values<Enrollment>(6)
    ));
    setAttendance(values<AttendanceRecord>(5));
    setSessionDates(values<SwimSession>(1));
    const names = [
      "Bookings", "Sessions", "Club reservations", "Pool visits",
      "Pool visit schedules", "Attendance", "Academy enrollment",
    ];
    setErrors(responses.flatMap((response, i) =>
      response.status === "rejected" ? [names[i]] : []
    ));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const represented = useMemo(() => new Set(representedSessionIds), [representedSessionIds]);
  const sections = useMemo(() => categorizeActivities(activities), [activities]);
  const otherActivities = (view === "booked" ? [...sections.upcoming, ...sections.attention] : sections.past)
    .filter((item) => !item.sessionId || !represented.has(item.sessionId));

  const knownSessions = new Map(sessionDates.map((session) => [session.id, session]));
  const attendanceDate = (record: AttendanceRecord) =>
    record.session?.start_time || record.session?.starts_at ||
    knownSessions.get(record.session_id)?.starts_at ||
    knownSessions.get(record.session_id)?.start_time || null;

  // Attendance is personal history; it must not disappear because that session
  // also appears in the general completed-session catalogue.
  const remainingAttendance = view === "past"
    ? attendance.filter((record) => {
        if (!record.session_id) return false;
        const date = attendanceDate(record);
        return !date || (Number.isFinite(Date.parse(date)) && Date.parse(date) < Date.now());
      }).sort((a, b) =>
        new Date(attendanceDate(b) ?? 0).getTime() -
        new Date(attendanceDate(a) ?? 0).getTime()
      )
    : [];

  const cancelClub = async (activity: SwimActivity) => {
    if (!window.confirm("Cancel your attendance for this Club swim? This frees your seat and does not refund your quarterly payment.")) return;
    setBusy(activity.bookingId);
    setActionError("");
    try {
      await apiPost(`/api/v1/sessions/bookings/${activity.bookingId}/cancel`, {}, { auth: true });
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to cancel Club attendance.");
    } finally {
      setBusy(null);
    }
  };

  const activityCard = (activity: SwimActivity) => (
    <article key={activity.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
          {activity.kind === "pool" ? "Independent pool visit" : activity.kind}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {statusLabel(activity.status)}
        </span>
      </div>
      <h3 className="mt-2 font-semibold text-slate-900">{activity.title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {formatSwimDate(activity.date)}
        {activity.location ? ` · ${activity.location}` : ""}
      </p>
      {!activity.date && (
        <p className="mt-1 text-sm text-amber-800">
          The date could not be verified. Check the booking details before travelling.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {activity.sessionId && (
          <Link href={`/sessions/${activity.sessionId}`}
            className="text-sm font-semibold text-cyan-700 hover:underline">
            View session details
          </Link>
        )}
        {activity.club?.status === "confirmed" &&
          activity.club.session_status === "scheduled" &&
          activity.date && new Date(activity.date).getTime() >= Date.now() && (
            <button type="button" disabled={busy !== null}
              onClick={() => void cancelClub(activity)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              {busy === activity.bookingId ? "Cancelling…" : "Can't attend? Cancel"}
            </button>
          )}
        {activity.club?.status === "cancelled" &&
          activity.club.session_status === "scheduled" &&
          activity.date && new Date(activity.date).getTime() >= Date.now() && activity.sessionId && (
            <Link href={`/sessions/${activity.sessionId}/book`}
              className="text-sm font-semibold text-cyan-700 hover:underline">
              Reserve again if available
            </Link>
          )}
      </div>
      {activity.assignedAcademy && (
        <p className="mt-2 text-xs text-violet-700">
          Assigned through your active Academy enrollment — no separate reservation required.
        </p>
      )}
      {activity.club && (
        <p className="mt-2 text-xs text-slate-500">
          Included in your Club quarter. Cancelling attendance does not refund the quarter.
        </p>
      )}
      {activity.pool && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <PoolVisitActions booking={activity.pool} onChanged={load} />
        </div>
      )}
    </article>
  );

  if (loading) {
    return <p role="status" className="text-sm text-slate-600">Loading other swimming commitments…</p>;
  }

  return (
    <section className="space-y-4" aria-label={view === "booked" ? "Other personal swim commitments" : "Other swimming records"}>
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Some personal records could not be loaded ({errors.join(", ")}). Missing records are not cancellations.
          <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      )}
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
      {view === "booked" && otherActivities.length === 0 && !primaryHasSessions && errors.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="font-semibold text-slate-900">No upcoming bookings or assigned swims found</h2>
          <p className="mt-2 text-sm text-slate-600">We could not find an active reservation, Club-quarter place, assigned Academy class or pool visit in the records loaded.</p>
          <Link href="/find-a-swim/sessions" className="mt-3 inline-block text-sm font-semibold text-cyan-700 underline">Browse upcoming sessions</Link>
        </div>
      )}
      {remainingAttendance.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {view === "booked" ? "Other booked and assigned swims" : "Other previous swims"}
          </h2>
          <p className="text-sm text-slate-600">
            {view === "booked"
              ? "Club-quarter places, Academy classes, pool visits and reservations not already shown above."
              : "Previous commitments not already included in the session cards above."}
          </p>
          <div className="grid gap-3 md:grid-cols-2">{otherActivities.map(activityCard)}</div>
        </div>
      )}
      {remainingAttendance.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">My recorded attendance</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {remainingAttendance.map((record) => (
              <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">
                  {record.session?.title || knownSessions.get(record.session_id)?.title || "SwimBuddz session"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {formatSwimDate(attendanceDate(record))} ·
                  {" "}{record.session?.location_name || knownSessions.get(record.session_id)?.location_name || "Location unavailable"}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Recorded attendance: {attendanceLabel(record.status)}
                </p>
                {["present", "late"].includes(record.status.toLowerCase()) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/account/media-vault?session=${record.session_id}&action=view`}
                      className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-800">
                      View session media
                    </Link>
                    <Link href={`/account/media-vault?session=${record.session_id}&action=contribute`}
                      className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">
                      Contribute media
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
      {view === "past" && remainingAttendance.length === 0 && !errors.includes("Attendance") && (
        <p className="text-sm text-slate-600">No verified attendance history was returned. Completed sessions below do not necessarily mean you attended them.</p>
      )}
      {view === "past" && (
        <Link href="/account/attendance/history"
          className="inline-block text-sm font-semibold text-cyan-700 hover:underline">
          View full attendance history →
        </Link>
      )}
    </section>
  );
}
