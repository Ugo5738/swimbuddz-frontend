/** Member-facing swim aggregation. Enrollments are intentionally not bookings. */
export type SessionBooking = {
  id: string;
  session_id: string;
  status: string;
  booked_at?: string;
  access_source?: string | null;
};
export type SwimSession = {
  id: string;
  title?: string;
  name?: string;
  session_type?: string;
  activity_type?: string;
  starts_at?: string | null;
  start_time?: string | null;
  location_name?: string | null;
  cohort_id?: string | null;
  status?: string | null;
};
export type ClubQuarterSwim = {
  id: string;
  session_id: string;
  session_title: string;
  session_starts_at: string;
  location_name: string | null;
  status: string;
  session_status: string;
};
export type PoolVisitBooking = {
  id: string;
  offer_id: string;
  status: string;
  headcount: number;
  selling_total_kobo: number;
  currency?: string;
  payment_reference: string | null;
  hold_expires_at?: string;
};
export type PoolVisitOffer = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  pool_name?: string;
  location_area?: string | null;
};
export type SwimActivity = {
  key: string;
  kind: "club" | "academy" | "community" | "session" | "pool";
  title: string;
  date: string | null;
  location: string | null;
  status: string;
  sessionId?: string;
  bookingId: string;
  /** Scheduled class inherited from an active Academy enrollment (not a booking). */
  assignedAcademy?: boolean;
  club?: ClubQuarterSwim;
  pool?: PoolVisitBooking;
};

export function classifySession(session?: SwimSession): "academy" | "club" | "community" | "session" {
  const category = (session?.session_type || session?.activity_type || "").toLowerCase();
  if (category.includes("academy") || category.includes("cohort") || category.includes("lesson")) return "academy";
  if (category.includes("club") || category.includes("practice")) return "club";
  if (category.includes("community") || category.includes("event") || category.includes("social")) return "community";
  return "session";
}

function validDate(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export type AcademyEnrollmentForSwims = {
  cohort_id?: string | null;
  status: string;
  access_suspended?: boolean;
  paused_at?: string | null;
};

/** A confirmed enrollment provides a class schedule, not an individual booking. */
export function isActiveAcademyEnrollment(enrollment: AcademyEnrollmentForSwims): boolean {
  return enrollment.status.toLowerCase() === "enrolled"
    && !enrollment.access_suspended
    && !enrollment.paused_at;
}

export function buildSwimActivities(
  bookings: SessionBooking[],
  sessions: SwimSession[],
  clubSwims: ClubQuarterSwim[],
  poolBookings: PoolVisitBooking[],
  offers: PoolVisitOffer[],
  academyEnrollments: AcademyEnrollmentForSwims[] = []
): SwimActivity[] {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const clubBySession = new Map(clubSwims.map((club) => [club.session_id, club]));

  const result: SwimActivity[] = clubSwims.map((club) => ({
    key: `club:${club.id}`,
    kind: "club",
    title: club.session_title || sessionById.get(club.session_id)?.title || "Club swim",
    date: club.session_starts_at || null,
    location: club.location_name,
    status: club.session_status === "cancelled" ? "session_cancelled" : club.status,
    bookingId: club.id,
    sessionId: club.session_id,
    club,
  }));

  for (const booking of bookings) {
    if (clubBySession.has(booking.session_id)) continue;
    const session = sessionById.get(booking.session_id);
    result.push({
      key: `session:${booking.id}`,
      kind: classifySession(session),
      title: session?.title || session?.name || "SwimBuddz session",
      date: session?.starts_at || session?.start_time || null,
      location: session?.location_name || null,
      status: session?.status === "cancelled" ? "session_cancelled" : booking.status,
      bookingId: booking.id,
      sessionId: booking.session_id,
    });
  }

  const assignedCohorts = new Set(
    academyEnrollments.filter(isActiveAcademyEnrollment)
      .map((enrollment) => enrollment.cohort_id).filter((id): id is string => Boolean(id))
  );
  const listedSessionIds = new Set(result.map((item) => item.sessionId));
  for (const session of sessions) {
    if (!session.cohort_id || !assignedCohorts.has(session.cohort_id)) continue;
    if (classifySession(session) !== "academy" || listedSessionIds.has(session.id)) continue;
    if (["cancelled", "canceled", "draft"].includes((session.status ?? "").toLowerCase())) continue;
    result.push({
      key: `academy-assigned:${session.id}`,
      kind: "academy",
      title: session.title || session.name || "Academy class",
      date: session.starts_at || session.start_time || null,
      location: session.location_name || null,
      status: "assigned",
      bookingId: session.id,
      sessionId: session.id,
      assignedAcademy: true,
    });
    listedSessionIds.add(session.id);
  }

  for (const booking of poolBookings) {
    const offer = offerById.get(booking.offer_id);
    result.push({
      key: `pool:${booking.id}`,
      kind: "pool",
      title: offer?.title || "Independent pool visit",
      date: offer?.starts_at || null,
      location: offer?.pool_name || offer?.location_area || null,
      status: booking.status,
      bookingId: booking.id,
      pool: booking,
    });
  }

  return result.sort((a, b) => {
    const first = validDate(a.date);
    const second = validDate(b.date);
    if (first === null) return second === null ? a.key.localeCompare(b.key) : 1;
    if (second === null) return -1;
    return first - second;
  });
}

export function categorizeActivities(activities: SwimActivity[], now = new Date()) {
  const today = now.getTime();
  const active = (status: string) => ["confirmed", "pending", "pending_payment", "assigned"].includes(status);
  const upcoming = activities.filter((activity) => {
    const when = validDate(activity.date);
    return when !== null && when >= today && active(activity.status);
  });
  const attention = activities.filter((activity) => {
    const when = validDate(activity.date);
    if (activity.status === "cancelled" || activity.status === "session_cancelled") {
      return when !== null && when >= today;
    }
    return active(activity.status) && when === null;
  });
  const past = activities.filter((activity) => {
    const when = validDate(activity.date);
    return when !== null && when < today;
  }).sort((a, b) => (validDate(b.date) || 0) - (validDate(a.date) || 0));
  return { upcoming, attention, past };
}

export function formatSwimDate(value: string | null): string {
  if (!value || validDate(value) === null) return "Date unavailable";
  return new Date(value).toLocaleString("en-NG", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
