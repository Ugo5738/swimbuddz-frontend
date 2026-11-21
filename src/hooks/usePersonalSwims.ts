"use client";

/** A read-only union of personal commitments, assignments, attendance and Pool Access.
 * Never create duplicate bookings or infer attendance from an event date.
 */
import { useQuery } from "@tanstack/react-query";
import { AcademyApi, type Enrollment } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import {
  buildSwimActivities,
  categorizeActivities,
  type ClubQuarterSwim,
  type PoolVisitBooking,
  type PoolVisitOffer,
  type SessionBooking,
  type SwimActivity,
  type SwimSession,
} from "@/lib/my-swims";
import {
  buildPersonalSwimHistory,
  type HistoricalAttendance,
  type PersonalSwimHistoryItem,
} from "@/lib/personal-swim-history";
import { SwimPlansApi, type SwimPlan } from "@/lib/swim-plans";
import { getMyPod, type PodSummary } from "@/lib/pods";

export type PersonalSwimmingProjection = {
  activities: SwimActivity[];
  upcoming: SwimActivity[];
  attention: SwimActivity[];
  history: PersonalSwimHistoryItem[];
  plans: SwimPlan[];
  errors: string[];
};

async function tryFetch<T>(
  name: string, job: Promise<T>, errors: string[], fallback: T
): Promise<T> {
  try { return await job; }
  catch { errors.push(name); return fallback; }
}

/**
 * A single /sessions page can be filled by unrelated Academy or Community sessions.
 * Walk a bounded upcoming window so Club sessions are not accidentally absent
 * just because they fall after the first 100 globally published activities.
 * Keep the window bounded to avoid costly unbounded database scans.
 */
async function loadUpcomingSessionSchedule(errors: string[]): Promise<SwimSession[]> {
  const start = new Date();
  const end = new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000);
  const all: SwimSession[] = [];
  const limit = 100;
  const maxPages = 5;
  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({
      from: start.toISOString(),
      to: end.toISOString(),
      limit: String(limit),
      offset: String(page * limit),
    });
    const chunk = await apiGet<SwimSession[]>(`/api/v1/sessions?${query}`, { auth: true });
    all.push(...chunk);
    if (chunk.length < limit) return all;
  }
  errors.push("More than 500 sessions were scheduled in the upcoming window; some later sessions may be missing");
  return all;
}

async function loadPersonalSwims(): Promise<PersonalSwimmingProjection> {
  const errors: string[] = [];
  const [bookings, sessions, clubs, poolBookings, offers, attendance, enrollments, plans, myPod] =
    await Promise.all([
      tryFetch("Session bookings", apiGet<SessionBooking[]>("/api/v1/sessions/bookings/me", { auth: true }), errors, []),
      tryFetch("Session schedule", loadUpcomingSessionSchedule(errors), errors, [] as SwimSession[]),
      tryFetch("Club reservations", apiGet<ClubQuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter", { auth: true }), errors, []),
      tryFetch("Pool Access", apiGet<PoolVisitBooking[]>("/api/v1/pools/access/bookings/me", { auth: true }), errors, []),
      tryFetch("Pool schedules", apiGet<PoolVisitOffer[]>("/api/v1/pools/access/offers"), errors, []),
      tryFetch("Attendance history", apiGet<HistoricalAttendance[]>("/api/v1/attendance/me?include_session=true&limit=200", { auth: true }), errors, []),
      tryFetch("Academy enrollment", AcademyApi.getMyEnrollments(), errors, [] as Enrollment[]),
      tryFetch("Swim plans", SwimPlansApi.mine(), errors, [] as SwimPlan[]),
      tryFetch("Club pod", getMyPod(), errors, null as PodSummary | null),
    ]);
  const activities = buildSwimActivities(bookings, sessions, clubs, poolBookings, offers, enrollments, myPod);
  const { upcoming, attention } = categorizeActivities(activities);
  const history = buildPersonalSwimHistory({
    activities, attendance, sessions,
  });
  return { activities, upcoming, attention, history, plans, errors };
}

export function usePersonalSwims() {
  return useQuery({
    queryKey: ["member", "personal-swimming-projection", "v3"],
    queryFn: loadPersonalSwims,
    staleTime: 60_000,
  });
}
