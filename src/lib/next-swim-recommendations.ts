import type { SessionWithRides } from "@/components/sessions/SessionCard";
import { SessionType } from "@/lib/sessions";

export type SwimPreferences = {
  preferredDays?: string[];
  preferredTimes?: string[];
  preferredLocations?: string[];
};

export type SwimRecommendationContext = {
  bookedSessionIds: ReadonlySet<string>;
  enrolledCohortIds: ReadonlySet<string>;
  myPodId: string | null;
  preferences?: SwimPreferences | null;
};

export type SwimRecommendationBuckets = {
  bookable: SessionWithRides[];
  scheduled: SessionWithRides[];
};

export function isAssignedAcademyClass(
  session: SessionWithRides,
  cohortIds: ReadonlySet<string>,
): boolean {
  return session.session_type === SessionType.COHORT_CLASS
    && !!session.cohort_id && cohortIds.has(session.cohort_id)
    && session.cohort_fee_mode !== "paid_extra";
}

function normal(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function preferenceScore(session: SessionWithRides, prefs?: SwimPreferences | null): number {
  if (!prefs) return 0;
  const date = new Date(session.starts_at);
  if (Number.isNaN(date.getTime())) return 0;
  const day = date.getDay();
  const hour = date.getHours();
  const weekend = day === 0 || day === 6;
  const period = hour < 12 ? "morning" : hour < 16 ? "afternoon" : "evening";
  let score = 0;
  if ((prefs.preferredDays ?? []).some(dayValue => {
    const option = normal(dayValue);
    return (weekend && option.includes("weekend")) ||
      (!weekend && option.includes("weekday")) ||
      option.includes(["sun","mon","tue","wed","thu","fri","sat"][day]);
  })) score += 2;
  if ((prefs.preferredTimes ?? []).some(timeValue => normal(timeValue).includes(period))) score += 2;
  const location = normal([session.location_name,session.location,session.location_address].filter(Boolean).join(" "));
  if ((prefs.preferredLocations ?? []).some(locationValue => {
    const preferred = normal(locationValue);
    return preferred.length >= 3 && location.includes(preferred);
  })) score += 3;
  return score;
}

/** Backend access remains authoritative. Preferences only break ties among eligible swims. */
export function rankNextSwims(
  sessions: SessionWithRides[],
  context: SwimRecommendationContext,
  now = new Date(),
): SwimRecommendationBuckets {
  const start = now.getTime();
  const bookable: SessionWithRides[] = [];
  const scheduled: SessionWithRides[] = [];
  for (const session of sessions) {
    const startsAt = new Date(session.starts_at).getTime();
    if (!Number.isFinite(startsAt) || startsAt <= start) continue;
    if (["cancelled","canceled","draft","completed"].includes(String(session.status).toLowerCase())) continue;
    const booked = context.bookedSessionIds.has(session.id);
    const assigned = isAssignedAcademyClass(session, context.enrolledCohortIds);
    if (booked || assigned) {
      scheduled.push(session);
      continue;
    }
    // A different member's pod/cohort must never be recommended.
    if (session.pod_id && session.pod_id !== context.myPodId) continue;
    if (session.cohort_id && !context.enrolledCohortIds.has(session.cohort_id)) continue;
    // No inferred access from public pricing. Trust the backend.
    if (session.access?.bookable !== true) continue;
    bookable.push(session);
  }
  bookable.sort((a,b) => {
    const base = (s:SessionWithRides) =>
      (s.pod_id && s.pod_id === context.myPodId ? 100 : 0) +
      (s.cohort_id && context.enrolledCohortIds.has(s.cohort_id) ? 90 : 0) +
      (s.access?.fee_amount_kobo === 0 ? 4 : 0) +
      preferenceScore(s,context.preferences);
    return base(b)-base(a) ||
      new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime();
  });
  scheduled.sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
  return {bookable,scheduled};
}
