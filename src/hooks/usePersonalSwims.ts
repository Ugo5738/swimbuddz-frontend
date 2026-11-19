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

async function loadPersonalSwims(): Promise<PersonalSwimmingProjection> {
  const errors: string[] = [];
  const [bookings, sessions, clubs, poolBookings, offers, attendance, enrollments, plans] =
    await Promise.all([
      tryFetch("Session bookings", apiGet<SessionBooking[]>("/api/v1/sessions/bookings/me", { auth: true }), errors, []),
      tryFetch("Session schedule", apiGet<SwimSession[]>("/api/v1/sessions?limit=100", { auth: true }), errors, []),
      tryFetch("Club reservations", apiGet<ClubQuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter", { auth: true }), errors, []),
      tryFetch("Pool Access", apiGet<PoolVisitBooking[]>("/api/v1/pools/access/bookings/me", { auth: true }), errors, []),
      tryFetch("Pool schedules", apiGet<PoolVisitOffer[]>("/api/v1/pools/access/offers"), errors, []),
      tryFetch("Attendance history", apiGet<HistoricalAttendance[]>("/api/v1/attendance/me?include_session=true&limit=200", { auth: true }), errors, []),
      tryFetch("Academy enrollment", AcademyApi.getMyEnrollments(), errors, [] as Enrollment[]),
      tryFetch("Swim plans", SwimPlansApi.mine(), errors, [] as SwimPlan[]),
    ]);
  const activities = buildSwimActivities(bookings, sessions, clubs, poolBookings, offers, enrollments);
  const { upcoming, attention } = categorizeActivities(activities);
  const history = buildPersonalSwimHistory({
    activities, attendance, sessions,
  });
  return { activities, upcoming, attention, history, plans, errors };
}

export function usePersonalSwims() {
  return useQuery({
    queryKey: ["member", "personal-swimming-projection", "v2"],
    queryFn: loadPersonalSwims,
    staleTime: 60_000,
  });
}
