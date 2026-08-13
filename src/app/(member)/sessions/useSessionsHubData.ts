"use client";

import type { SessionWithRides } from "@/components/sessions/SessionCard";
import { AcademyApi, type Cohort, type Enrollment } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import type { SessionAccessTier } from "@/lib/sessionAccess";
import { getMyPod, podDisplayName } from "@/lib/pods";
import type { CohortInfo } from "@/lib/sessions";
import { getMembershipLabel, getPaidMembershipTier } from "@/lib/tiers";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { SESSION_TYPES_QUERY } from "./constants";
import type { AttendanceRecord, MemberProfile, MyBooking } from "./types";

type RideConfigsBySession = Record<string, SessionWithRides["ride_configs"]>;

export function useSessionsHubData({ loadPast }: { loadPast: boolean }) {
  const profileQuery = useQuery({
    queryKey: ["sessions-hub", "profile"],
    queryFn: () => apiGet<MemberProfile>("/api/v1/members/me", { auth: true }),
  });

  const attendanceQuery = useQuery({
    queryKey: ["sessions-hub", "attendance"],
    queryFn: () =>
      apiGet<AttendanceRecord[]>("/api/v1/attendance/me?include_session=false&limit=100", {
        auth: true,
      }),
  });

  const bookingsQuery = useQuery({
    queryKey: ["sessions-hub", "bookings", "confirmed"],
    queryFn: () =>
      apiGet<MyBooking[]>("/api/v1/sessions/bookings/me?status_filter=confirmed", {
        auth: true,
      }),
  });

  const cohortsQuery = useQuery({
    queryKey: ["sessions-hub", "cohorts"],
    queryFn: async () => {
      const [enrollments, openCohorts] = await Promise.all([
        AcademyApi.getMyEnrollments().catch(() => [] as Enrollment[]),
        AcademyApi.getOpenCohorts().catch(() => [] as Cohort[]),
      ]);
      return { enrollments, openCohorts };
    },
  });

  const podQuery = useQuery({
    queryKey: ["sessions-hub", "my-pod"],
    queryFn: () => getMyPod().catch(() => null),
  });

  const upcomingQuery = useQuery({
    queryKey: ["sessions-hub", "upcoming", SESSION_TYPES_QUERY],
    queryFn: () =>
      apiGet<SessionWithRides[]>(
        `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}&limit=50`,
        { auth: true }
      ),
  });

  const sessionIds = useMemo(
    () => (upcomingQuery.data ?? []).map((session) => session.id),
    [upcomingQuery.data]
  );
  const ridesQuery = useQuery({
    queryKey: ["sessions-hub", "rides", sessionIds],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      try {
        const response = await apiPost<{ configs: RideConfigsBySession }>(
          "/api/v1/transport/sessions/ride-configs/batch",
          { session_ids: sessionIds },
          { auth: true }
        );
        return response.configs ?? {};
      } catch {
        return {} as RideConfigsBySession;
      }
    },
  });

  const pastQuery = useQuery({
    queryKey: ["sessions-hub", "past", "60-days", SESSION_TYPES_QUERY],
    enabled: loadPast,
    queryFn: () => {
      const now = new Date();
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const query = new URLSearchParams({
        types: SESSION_TYPES_QUERY,
        from: sixtyDaysAgo.toISOString(),
        to: now.toISOString(),
        limit: "100",
      });
      return apiGet<SessionWithRides[]>(`/api/v1/sessions?${query.toString()}`, {
        auth: true,
      });
    },
  });

  const sessions = useMemo(
    () =>
      (upcomingQuery.data ?? []).map((session) => ({
        ...session,
        ride_configs: ridesQuery.data?.[session.id] ?? [],
      })),
    [ridesQuery.data, upcomingQuery.data]
  );

  const { cohortMap, enrolledCohortIds } = useMemo(() => {
    const nextCohortMap = new Map<string, CohortInfo>();
    const nextEnrolledIds = new Set<string>();
    for (const enrollment of cohortsQuery.data?.enrollments ?? []) {
      if (!enrollment.cohort_id || !enrollment.cohort) continue;
      nextEnrolledIds.add(enrollment.cohort_id);
      nextCohortMap.set(enrollment.cohort_id, {
        cohortName: enrollment.cohort.name,
        programName: enrollment.cohort.program?.name ?? "",
        isEnrolled: true,
      });
    }
    for (const cohort of cohortsQuery.data?.openCohorts ?? []) {
      if (nextCohortMap.has(cohort.id)) continue;
      nextCohortMap.set(cohort.id, {
        cohortName: cohort.name,
        programName: cohort.program?.name ?? "",
        isEnrolled: false,
      });
    }
    return {
      cohortMap: nextCohortMap,
      enrolledCohortIds: nextEnrolledIds,
    };
  }, [cohortsQuery.data]);

  const membership: SessionAccessTier = profileQuery.data
    ? getPaidMembershipTier(profileQuery.data)
    : "prospect";
  const membershipLabel = profileQuery.data ? getMembershipLabel(profileQuery.data) : "Prospect";

  return {
    sessions,
    pastSessions: pastQuery.data ?? [],
    attendance: attendanceQuery.data ?? [],
    myBookings: bookingsQuery.data ?? [],
    cohortMap,
    enrolledCohortIds,
    myPodId: podQuery.data?.id ?? null,
    myPodName: podQuery.data ? podDisplayName(podQuery.data) : null,
    membership,
    membershipLabel,
    upcomingLoading: upcomingQuery.isLoading,
    bookingsLoading: bookingsQuery.isLoading,
    attendanceLoading: attendanceQuery.isLoading,
    personalizationLoading:
      profileQuery.isLoading || cohortsQuery.isLoading || podQuery.isLoading,
    pastLoading: pastQuery.isLoading && loadPast,
    upcomingError: upcomingQuery.isError,
    pastError: pastQuery.isError,
  };
}
