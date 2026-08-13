"use client";

import { MultiSelectBar } from "@/components/sessions/MultiSelectBar";
import { type SessionWithRides } from "@/components/sessions/SessionCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiPost } from "@/lib/api";
import { ArrowRight, Calendar, CheckSquare, Waves, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveFilterChips, DateGroupedSessions, FilterBar, NextSessionPanel } from "./components";
import { TABS } from "./constants";
import type { DateFilter, MyBooking, ViewTab } from "./types";
import { useSessionsHubData } from "./useSessionsHubData";
import {
  filterByDate,
  filterByType,
  isActiveBooking,
  isConfirmedBooking,
  isSessionRelevant,
} from "./utils";

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

  const {
    sessions,
    pastSessions,
    attendance,
    myBookings,
    cohortMap,
    enrolledCohortIds,
    myPodId,
    myPodName,
    membership,
    membershipLabel,
    upcomingLoading,
    bookingsLoading,
    attendanceLoading,
    personalizationLoading,
    pastLoading,
    upcomingError,
    pastError,
  } = useSessionsHubData({
    loadPast: activeTab === "past" || activeTab === "all",
  });

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [myCohortsOnly, setMyCohortsOnly] = useState(false);
  const [relevantOnly, setRelevantOnly] = useState(true);

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

  const supportsRelevance = activeTab === "upcoming" || activeTab === "all";
  const hasActiveFilters =
    dateFilter !== "all" ||
    typeFilters.size > 0 ||
    myCohortsOnly ||
    (supportsRelevance && relevantOnly);

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
    setRelevantOnly(false);
  }, []);

  const loading =
    activeTab === "booked"
      ? upcomingLoading || bookingsLoading || attendanceLoading
      : activeTab === "past"
        ? pastLoading
        : upcomingLoading || (supportsRelevance && personalizationLoading);
  const error = (activeTab === "past" ? pastError : upcomingError)
    ? "Unable to load sessions. Please try again later."
    : null;

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
      result = [...pastSessions, ...sessions];
    }

    result = filterByDate(result, dateFilter);
    result = filterByType(result, typeFilters);

    if (supportsRelevance && relevantOnly) {
      result = result.filter((session) =>
        isSessionRelevant(session, { bookedSessionIds, enrolledCohortIds, myPodId })
      );
    }

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
    relevantOnly,
    supportsRelevance,
    bookedSessionIds,
    myCohortsOnly,
    enrolledCohortIds,
    myPodId,
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

      {!loading && supportsRelevance && relevantOnly && (
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-cyan-950">
          <p className="font-semibold">Showing sessions recommended for you</p>
          <p className="mt-0.5 text-xs leading-5 text-cyan-800">
            Based on your {membershipLabel} access
            {myPodName ? `, ${myPodName} Pod` : ""}
            {enrolledCohortIds.size > 0 ? ", and Academy cohort" : ""}. Remove the Recommended
            filter to explore every published session.
          </p>
        </div>
      )}

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
              relevantOnly={relevantOnly}
              setRelevantOnly={setRelevantOnly}
              showRelevanceFilter={supportsRelevance}
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
          relevantOnly={supportsRelevance && relevantOnly}
          setRelevantOnly={setRelevantOnly}
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
        {!loading && !error && activeTab === "all" && pastLoading && (
          <p className="mt-3 text-center text-sm text-slate-500">Loading recent sessions…</p>
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
