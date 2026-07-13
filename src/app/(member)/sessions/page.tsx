"use client";

import { MultiSelectBar } from "@/components/sessions/MultiSelectBar";
import { type SessionWithRides } from "@/components/sessions/SessionCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { AcademyApi, type Cohort, type Enrollment } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import type { SessionAccessTier } from "@/lib/sessionAccess";
import { type CohortInfo } from "@/lib/sessions";
import { getMembershipLabel, getPaidMembershipTier } from "@/lib/tiers";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, CheckSquare, Waves, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveFilterChips, DateGroupedSessions, FilterBar, NextSessionPanel } from "./components";
import { SESSION_TYPES_QUERY, TABS } from "./constants";
import type { AttendanceRecord, DateFilter, MemberProfile, MyBooking, ViewTab } from "./types";
import { filterByDate, filterByType, isActiveBooking, isConfirmedBooking } from "./utils";

// ── Inner component (needs searchParams) ────────────────────────────────

function SessionsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");

  // Map view param to tab. Default is "upcoming". Legacy "my" → "booked".
  const activeTab: ViewTab =
    rawView === "booked" || rawView === "my"
      ? "booked"
      : rawView === "past"
        ? "past"
        : rawView === "all"
          ? "all"
          : "upcoming";

  // ── State ──────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionWithRides[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionWithRides[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<SessionAccessTier>("prospect");
  const [membershipLabel, setMembershipLabel] = useState("Prospect");

  // Cohort identity
  const [cohortMap, setCohortMap] = useState<Map<string, CohortInfo>>(new Map());
  const [enrolledCohortIds, setEnrolledCohortIds] = useState<Set<string>>(new Set());

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [myCohortsOnly, setMyCohortsOnly] = useState(false);

  // Multi-select for bundle booking
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = useCallback((sessionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        if (next.size >= 10) return prev; // max 10 per bundle
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters = dateFilter !== "all" || typeFilters.size > 0 || myCohortsOnly;

  const toggleTypeFilter = useCallback((type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setDateFilter("all");
    setTypeFilters(new Set());
    setMyCohortsOnly(false);
  }, []);

  // ── Data loading (cached via React Query) ──────────────────────────────
  // Cache key: staleTime of 2min means within-session navigations read from cache.
  const sessionsHubQuery = useQuery({
    queryKey: ["sessions-hub"],
    queryFn: async () => {
      let resolvedTier: SessionAccessTier = "prospect";
      let resolvedMembershipLabel = "Prospect";
      let attendanceData: AttendanceRecord[] = [];
      let bookingsData: MyBooking[] = [];

      try {
        const profile = await apiGet<MemberProfile>("/api/v1/members/me", {
          auth: true,
        });
        resolvedTier = getPaidMembershipTier(profile);
        resolvedMembershipLabel = getMembershipLabel(profile);

        // Attendance = day-of presence (only exists after sign-in).
        // Bookings = CONFIRMED (paid) reservations (intent-only, no
        // attendance row until sign-in). The Booked tab needs both:
        // attendance covers legacy/older flows, bookings covers the
        // SessionBooking flow where a confirmed booking has no
        // attendance record yet. Scope to status_filter=confirmed so an
        // in-flight / abandoned PENDING booking never shows as "Booked".
        [attendanceData, bookingsData] = await Promise.all([
          apiGet<AttendanceRecord[]>("/api/v1/attendance/me", {
            auth: true,
          }).catch(() => []),
          apiGet<MyBooking[]>("/api/v1/sessions/bookings/me?status_filter=confirmed", {
            auth: true,
          }).catch(() => []),
        ]);
      } catch {
        // Not authenticated or profile fetch failed — default prospect access
      }

      // Fetch cohort identity data for academy sessions
      const cohortMapResult = new Map<string, CohortInfo>();
      const enrolledCohorts = new Set<string>();
      try {
        const [enrollments, openCohorts] = await Promise.all([
          AcademyApi.getMyEnrollments().catch(() => [] as Enrollment[]),
          AcademyApi.getOpenCohorts().catch(() => [] as Cohort[]),
        ]);

        for (const enrollment of enrollments) {
          if (enrollment.cohort_id && enrollment.cohort) {
            enrolledCohorts.add(enrollment.cohort_id);
            cohortMapResult.set(enrollment.cohort_id, {
              cohortName: enrollment.cohort.name,
              programName: enrollment.cohort.program?.name ?? "",
              isEnrolled: true,
            });
          }
        }
        for (const cohort of openCohorts) {
          if (!cohortMapResult.has(cohort.id)) {
            cohortMapResult.set(cohort.id, {
              cohortName: cohort.name,
              programName: cohort.program?.name ?? "",
              isEnrolled: false,
            });
          }
        }
      } catch {
        // Non-critical — sessions still render without cohort labels
      }

      // Fetch upcoming sessions
      const upcomingData = await apiGet<SessionWithRides[]>(
        `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}`,
        { auth: true }
      );

      // Batch-fetch ride configs in a single HTTP call (Tier 1 optimization)
      let rideConfigsBySession: Record<string, SessionWithRides["ride_configs"]> = {};
      if (upcomingData.length > 0) {
        try {
          const resp = await apiPost<{
            configs: Record<string, SessionWithRides["ride_configs"]>;
          }>("/api/v1/transport/sessions/ride-configs/batch", {
            session_ids: upcomingData.map((s) => s.id),
          });
          rideConfigsBySession = resp.configs || {};
        } catch {
          // Non-fatal
        }
      }
      const withRides = upcomingData.map((session) => ({
        ...session,
        ride_configs: rideConfigsBySession[session.id] ?? [],
      }));

      // Fetch past sessions (last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      let past: SessionWithRides[] = [];
      try {
        past = await apiGet<SessionWithRides[]>(
          `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}&before=${sixtyDaysAgo.toISOString()}&status=completed`,
          { auth: true }
        );
      } catch {
        past = [];
      }

      return {
        membership: resolvedTier,
        membershipLabel: resolvedMembershipLabel,
        attendance: attendanceData,
        myBookings: bookingsData,
        cohortMap: cohortMapResult,
        enrolledCohortIds: enrolledCohorts,
        sessions: withRides,
        pastSessions: past,
      };
    },
  });

  // Sync query result into local state so the rest of the page (filters,
  // derived memos) keeps working unchanged.
  useEffect(() => {
    if (!sessionsHubQuery.data) return;
    const d = sessionsHubQuery.data;
    setMembership(d.membership);
    setMembershipLabel(d.membershipLabel);
    setAttendance(d.attendance);
    setMyBookings(d.myBookings);
    setCohortMap(d.cohortMap);
    setEnrolledCohortIds(d.enrolledCohortIds);
    setSessions(d.sessions);
    setPastSessions(d.pastSessions);
    // Default to "my cohorts" filter for academy members (original behavior).
    if (d.enrolledCohortIds.size > 0) {
      setMyCohortsOnly(true);
    }
  }, [sessionsHubQuery.data]);

  useEffect(() => {
    setLoading(sessionsHubQuery.isLoading);
  }, [sessionsHubQuery.isLoading]);

  useEffect(() => {
    if (sessionsHubQuery.isError) {
      console.error(sessionsHubQuery.error);
      setError("Unable to load sessions. Please try again later.");
    } else {
      setError(null);
    }
  }, [sessionsHubQuery.isError, sessionsHubQuery.error]);

  // ── Derived data ───────────────────────────────────────────────────────
  const bookedSessionIds = useMemo(() => {
    const ids = new Set<string>();
    // Legacy/day-of path: an attendance record in a non-cancelled state.
    for (const record of attendance) {
      if (!record.session_id) continue;
      if (isActiveBooking(record.status)) {
        ids.add(record.session_id);
      }
    }
    // SessionBooking path: a CONFIRMED (paid) reservation that has no
    // attendance record yet (attendance is created day-of at sign-in).
    // The fetch already scopes to status_filter=confirmed; guard with
    // isConfirmedBooking anyway so a PENDING (unpaid / abandoned) booking
    // never counts as "Booked" even if the filter is ever dropped.
    for (const booking of myBookings) {
      if (!booking.session_id) continue;
      if (isConfirmedBooking(booking.status)) {
        ids.add(booking.session_id);
      }
    }
    return ids;
  }, [attendance, myBookings]);

  // Map session_id → the member's active booking for that session. Powers
  // per-card self-report actions ("I can't make it" / "I'll be late") that
  // need the booking_id, not just whether-the-session-is-booked.
  const bookingsBySession = useMemo(() => {
    const map = new Map<string, MyBooking>();
    for (const booking of myBookings) {
      if (!booking.session_id) continue;
      // Self-report actions (excuse / running-late) require a CONFIRMED
      // booking server-side, so only map confirmed ones here.
      if (isConfirmedBooking(booking.status)) {
        map.set(booking.session_id, booking);
      }
    }
    return map;
  }, [myBookings]);

  const attendanceBySession = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of attendance) {
      if (record.session_id && record.status) {
        map.set(record.session_id, record.status);
      }
    }
    return map;
  }, [attendance]);

  const myUpcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => bookedSessionIds.has(s.id) && new Date(s.starts_at) > now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [sessions, bookedSessionIds]);

  const nextSession = myUpcomingSessions[0] ?? null;

  // Bundle total and checkout URL for multi-select
  const selectedSessions = useMemo(
    () => sessions.filter((s) => selectedIds.has(s.id)),
    [sessions, selectedIds]
  );

  const bundleTotal = useMemo(
    () => selectedSessions.reduce((sum, s) => sum + (s.pool_fee || 0), 0),
    [selectedSessions]
  );

  // Creates a server-side SessionBundleCart, then navigates the user to
  // /sessions/bundle/{bundleId}/book to complete checkout.
  const [creatingBundle, setCreatingBundle] = useState(false);
  const handleCheckoutBundle = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setCreatingBundle(true);
    try {
      const cart = await apiPost<{ id: string }>(
        "/api/v1/sessions/bundles",
        { session_ids: Array.from(selectedIds) },
        { auth: true }
      );
      router.push(`/sessions/bundle/${cart.id}/book`);
    } catch (err) {
      console.error("Failed to create bundle cart:", err);
      const message =
        err instanceof Error ? err.message : "Could not start bundle checkout. Please try again.";
      toast.error(message);
      setCreatingBundle(false);
    }
  }, [selectedIds, router]);

  // Apply filters to sessions for current tab
  const filteredSessions = useMemo(() => {
    let result: SessionWithRides[];
    const now = new Date();

    if (activeTab === "upcoming") {
      // Only future sessions (strict filter)
      result = sessions.filter((s) => new Date(s.starts_at) > now);
    } else if (activeTab === "booked") {
      result = myUpcomingSessions;
    } else if (activeTab === "past") {
      result = pastSessions;
    } else {
      // "all" tab — everything, past + future
      result = sessions;
    }

    result = filterByDate(result, dateFilter);
    result = filterByType(result, typeFilters);

    if (myCohortsOnly && enrolledCohortIds.size > 0) {
      result = result.filter((s) => s.cohort_id && enrolledCohortIds.has(s.cohort_id));
    }

    return result;
  }, [
    activeTab,
    sessions,
    myUpcomingSessions,
    pastSessions,
    dateFilter,
    typeFilters,
    myCohortsOnly,
    enrolledCohortIds,
  ]);

  // ── Tab switching ──────────────────────────────────────────────────────
  const setTab = useCallback(
    (tab: ViewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "upcoming") {
        // Upcoming is the default — no param needed
        params.delete("view");
      } else {
        params.set("view", tab);
      }
      const qs = params.toString();
      router.replace(`/sessions${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  // ── Render ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (filteredSessions.length === 0) {
      // Empty states per tab
      if (activeTab === "booked") {
        return (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <Waves className="mx-auto h-12 w-12 text-slate-300" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {hasActiveFilters ? "No bookings match your filters" : "No upcoming bookings"}
              </h2>
              <p className="mt-2 text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more sessions."
                  : "You haven\u2019t reserved a spot in any upcoming sessions yet."}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => setTab("upcoming")}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 transition-colors"
              >
                Browse Sessions
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }

      if (activeTab === "past") {
        return (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {hasActiveFilters ? "No past sessions match your filters" : "No recent sessions"}
              </h2>
              <p className="mt-2 text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Past sessions from the last 60 days will appear here."}
              </p>
            </div>
            <Link
              href="/account/attendance/history"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View full attendance history
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        );
      }

      // All tab empty
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <Waves className="mx-auto h-12 w-12 text-slate-300" />
          <p className="text-slate-600">
            {hasActiveFilters
              ? "No sessions match your filters. Try adjusting them."
              : "No upcoming sessions found."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      );
    }

    // Result count
    const countLabel = `${filteredSessions.length} ${filteredSessions.length === 1 ? "session" : "sessions"}`;

    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500">{countLabel}</p>
        <DateGroupedSessions
          sessions={filteredSessions}
          bookedSessionIds={bookedSessionIds}
          bookingsBySession={bookingsBySession}
          membership={membership}
          isPast={activeTab === "past"}
          attendanceBySession={activeTab === "past" ? attendanceBySession : undefined}
          cohortMap={cohortMap}
          enrolledCohortIds={enrolledCohortIds}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
        />

        {activeTab === "past" && (
          <div className="text-center pt-4">
            <Link
              href="/account/attendance/history"
              className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              View full attendance history
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Sessions</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Sessions Hub</h1>
          <Badge variant="info">{membershipLabel}</Badge>
        </div>
        <p className="text-base text-slate-600">
          Browse sessions, manage your bookings, and review past swims.
        </p>
        <p className="text-sm text-slate-500">
          Know a pool we should partner with?{" "}
          <Link href="/account/pools/suggest" className="font-medium text-cyan-700 hover:underline">
            Suggest a pool &rarr;
          </Link>
        </p>
      </header>

      {/* Next session panel — always visible when user has a booking */}
      {!loading && nextSession && <NextSessionPanel session={nextSession} />}

      {/* Segmented control + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1 flex-1 sm:flex-initial">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 sm:flex-initial rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              {key === "booked" && myUpcomingSessions.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-100 px-1.5 text-xs font-semibold text-cyan-700">
                  {myUpcomingSessions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Multi-select toggle — only on upcoming/all tabs */}
          {(activeTab === "upcoming" || activeTab === "all") && (
            <button
              onClick={() => {
                if (selectMode) {
                  exitSelectMode();
                } else {
                  setSelectMode(true);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                selectMode
                  ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              {selectMode ? "Cancel" : "Book multiple"}
            </button>
          )}

          {/* Filter button */}
          {activeTab !== "past" && (
            <FilterBar
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              typeFilters={typeFilters}
              toggleTypeFilter={toggleTypeFilter}
              myCohortsOnly={myCohortsOnly}
              setMyCohortsOnly={setMyCohortsOnly}
              showCohortFilter={enrolledCohortIds.size > 0}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeTab !== "past" && hasActiveFilters && (
        <ActiveFilterChips
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          typeFilters={typeFilters}
          toggleTypeFilter={toggleTypeFilter}
          myCohortsOnly={myCohortsOnly}
          setMyCohortsOnly={setMyCohortsOnly}
        />
      )}

      {/* Content */}
      <section aria-live="polite">
        {loading ? (
          <LoadingCard text="Loading sessions..." />
        ) : error ? (
          <Alert variant="error" title="Error loading sessions">
            {error}
          </Alert>
        ) : (
          renderContent()
        )}
      </section>

      {/* Sticky multi-select checkout bar */}
      {selectMode && (
        <MultiSelectBar
          count={selectedIds.size}
          totalNgn={bundleTotal}
          onCheckout={handleCheckoutBundle}
          onClear={clearSelection}
          busy={creatingBundle}
        />
      )}
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ────────────────

export default function SessionsPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading sessions..." />}>
      <SessionsHub />
    </Suspense>
  );
}
