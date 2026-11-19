"use client";

import { TierCalendar } from "@/components/calendar/TierCalendar";
import { AcademyApi } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { isActiveAcademyEnrollment } from "@/lib/my-swims";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type ConfirmedSession = { session_id: string; status?: string };

export default function MemberCalendarPage() {
  const bookings = useQuery({
    queryKey: ["member-calendar", "confirmed-bookings"],
    queryFn: () => apiGet<ConfirmedSession[]>(
      "/api/v1/sessions/bookings/me?status_filter=confirmed", { auth: true }
    ),
  });
  const academy = useQuery({
    queryKey: ["member-calendar", "academy-enrollments"],
    queryFn: () => AcademyApi.getMyEnrollments(),
  });

  const personalSessionIds = useMemo(
    () => new Set((bookings.data ?? []).filter((booking) =>
      booking.status === "confirmed").map((booking) => booking.session_id)),
    [bookings.data]
  );
  const personalCohortIds = useMemo(
    () => new Set((academy.data ?? []).filter(isActiveAcademyEnrollment)
      .map((enrollment) => enrollment.cohort_id).filter((id): id is string => !!id)),
    [academy.data]
  );

  return (
    <main className="space-y-4">
      {(bookings.isError || academy.isError) && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Your personal schedule could not be fully loaded. SwimBuddz activities remain visible; check My Swims for your confirmed bookings.
        </p>
      )}
      {(bookings.isLoading || academy.isLoading) && (
        <p role="status" className="text-sm text-slate-600">Loading your schedule…</p>
      )}
      <TierCalendar
        authenticated
        title="SwimBuddz Calendar"
        subtitle="Your bookings and assigned classes alongside everything happening at SwimBuddz."
        personalSessionIds={personalSessionIds}
        personalCohortIds={personalCohortIds}
      />
    </main>
  );
}
