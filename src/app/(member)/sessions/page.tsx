"use client";

import { MultiSelectBar } from "@/components/sessions/MultiSelectBar";
import { SessionCard, type SessionWithRides } from "@/components/sessions/SessionCard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { AcademyApi, type Cohort, type Enrollment } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import { tierDisplayLabel } from "@/lib/sessionAccess";
import { type CohortInfo, getSessionTypeLabel, SessionType } from "@/lib/sessions";
import { getEffectiveTier, MembershipTier } from "@/lib/tiers";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Filter,
  MapPin,
  Waves,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────

const SESSION_TYPES_QUERY = [
  SessionType.COMMUNITY,
  SessionType.CLUB,
  SessionType.COHORT_CLASS,
  SessionType.ONE_ON_ONE,
  SessionType.GROUP_BOOKING,
  SessionType.EVENT,
].join(",");

type ViewTab = "upcoming" | "booked" | "past" | "all";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "booked", label: "Booked" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

type DateFilter = "all" | "this_week" | "this_month" | "next_7" | "next_30";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "Any date" },
  { key: "this_week", label: "This week" },
  { key: "next_7", label: "Next 7 days" },
  { key: "this_month", label: "This month" },
  { key: "next_30", label: "Next 30 days" },
];

// Session types available for filtering (user-friendly subset)
const TYPE_FILTER_OPTIONS = [
  SessionType.COMMUNITY,
  SessionType.CLUB,
  SessionType.COHORT_CLASS,
  SessionType.ONE_ON_ONE,
  SessionType.GROUP_BOOKING,
  SessionType.EVENT,
];

type MemberProfile = {
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
  } | null;
};

type AttendanceRecord = {
  session_id: string;
  status?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";

  return date.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

function formatDate(start: string) {
  return new Date(start).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function timeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Starting now";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffHours > 0) return `In ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `In ${diffMin} min${diffMin === 1 ? "" : "s"}`;
}

function isActiveBooking(status?: string): boolean {
  const s = String(status || "").toLowerCase();
  return s !== "cancelled" && s !== "canceled" && s !== "no_show";
}

/** Get the start of this week (Monday) */
function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the end of this week (Sunday 23:59) */
function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Get end of this month */
function getEndOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function filterByDate(sessions: SessionWithRides[], filter: DateFilter): SessionWithRides[] {
  if (filter === "all") return sessions;

  const now = new Date();

  switch (filter) {
    case "this_week": {
      const start = getStartOfWeek();
      const end = getEndOfWeek();
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= start && d <= end;
      });
    }
    case "this_month": {
      const end = getEndOfMonth();
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    case "next_7": {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    case "next_30": {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return sessions.filter((s) => {
        const d = new Date(s.starts_at);
        return d >= now && d <= end;
      });
    }
    default:
      return sessions;
  }
}

function filterByType(sessions: SessionWithRides[], types: Set<string>): SessionWithRides[] {
  if (types.size === 0) return sessions;
  return sessions.filter((s) => types.has(s.session_type));
}

/** Group sessions by date and sort groups chronologically.
 *  When enrolledCohortIds is provided, enrolled-cohort sessions sort first within each date. */
function groupByDate(
  sessions: SessionWithRides[],
  enrolledCohortIds?: Set<string>
): { dateKey: string; label: string; sessions: SessionWithRides[] }[] {
  const grouped = new Map<string, { label: string; sessions: SessionWithRides[] }>();

  for (const session of sessions) {
    const key = getDateKey(session.starts_at);
    if (!grouped.has(key)) {
      grouped.set(key, {
        label: formatDateHeader(session.starts_at),
        sessions: [],
      });
    }
    grouped.get(key)!.sessions.push(session);
  }

  // Sort sessions within each group: enrolled cohort first, then by time
  for (const group of grouped.values()) {
    group.sessions.sort((a, b) => {
      if (enrolledCohortIds && enrolledCohortIds.size > 0) {
        const aEnrolled = a.cohort_id ? enrolledCohortIds.has(a.cohort_id) : false;
        const bEnrolled = b.cohort_id ? enrolledCohortIds.has(b.cohort_id) : false;
        if (aEnrolled !== bEnrolled) return aEnrolled ? -1 : 1;
      }
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }

  // Sort groups by date
  return Array.from(grouped.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([dateKey, group]) => ({ dateKey, ...group }));
}

// ── Filter bar component ─────────────────────────────────────────────────

function FilterBar({
  dateFilter,
  setDateFilter,
  typeFilters,
  toggleTypeFilter,
  myCohortsOnly,
  setMyCohortsOnly,
  showCohortFilter,
  clearFilters,
  hasActiveFilters,
}: {
  dateFilter: DateFilter;
  setDateFilter: (f: DateFilter) => void;
  typeFilters: Set<string>;
  toggleTypeFilter: (type: string) => void;
  myCohortsOnly: boolean;
  setMyCohortsOnly: (v: boolean) => void;
  showCohortFilter: boolean;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showFilters]);

  return (
    <div ref={filterRef} className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
          hasActiveFilters
            ? "border-cyan-200 bg-cyan-50 text-cyan-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        }`}
      >
        <Filter className="h-4 w-4" />
        Filters
        {hasActiveFilters && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-600 px-1.5 text-xs font-bold text-white">
            {(dateFilter !== "all" ? 1 : 0) + typeFilters.size + (myCohortsOnly ? 1 : 0)}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
        />
      </button>

      {showFilters && (
        <div className="fixed inset-x-3 top-auto z-20 mt-2 sm:absolute sm:inset-x-auto sm:right-0 sm:w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg space-y-4">
          {/* Date filter */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Date range
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DATE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    dateFilter === key
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Session type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTER_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    typeFilters.has(type)
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {getSessionTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* My Cohorts filter — only for academy members with enrollments */}
          {showCohortFilter && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Academy
              </p>
              <button
                onClick={() => setMyCohortsOnly(!myCohortsOnly)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  myCohortsOnly
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                My Cohorts Only
              </button>
            </div>
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                clearFilters();
                setShowFilters(false);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Active filter chips ─────────────────────────────────────────────────

function ActiveFilterChips({
  dateFilter,
  setDateFilter,
  typeFilters,
  toggleTypeFilter,
  myCohortsOnly,
  setMyCohortsOnly,
}: {
  dateFilter: DateFilter;
  setDateFilter: (f: DateFilter) => void;
  typeFilters: Set<string>;
  toggleTypeFilter: (type: string) => void;
  myCohortsOnly: boolean;
  setMyCohortsOnly: (v: boolean) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (dateFilter !== "all") {
    const label = DATE_FILTERS.find((f) => f.key === dateFilter)?.label ?? dateFilter;
    chips.push({ label, onRemove: () => setDateFilter("all") });
  }

  for (const type of typeFilters) {
    chips.push({
      label: getSessionTypeLabel(type),
      onRemove: () => toggleTypeFilter(type),
    });
  }

  if (myCohortsOnly) {
    chips.push({ label: "My Cohorts", onRemove: () => setMyCohortsOnly(false) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700"
        >
          {chip.label}
          <button onClick={chip.onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-cyan-100">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ── Next Session Panel ──────────────────────────────────────────────────

function NextSessionPanel({ session }: { session: SessionWithRides }) {
  return (
    <Link
      href={`/sessions/${session.id}/book`}
      className="block rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-4 text-white shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
            Your next session
          </p>
          <h3 className="mt-1 text-lg font-bold truncate">{session.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-cyan-100">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(session.starts_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeRange(session.starts_at, session.ends_at)}
            </span>
            {(session.location_name || session.location) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {session.location_name || session.location}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-bold text-white">
          {timeUntil(session.starts_at)}
        </div>
      </div>
    </Link>
  );
}

// ── Date-grouped session list ───────────────────────────────────────────

function DateGroupedSessions({
  sessions,
  bookedSessionIds,
  membership,
  isPast = false,
  attendanceBySession,
  cohortMap,
  enrolledCohortIds,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: {
  sessions: SessionWithRides[];
  bookedSessionIds: Set<string>;
  membership: MembershipTier;
  isPast?: boolean;
  attendanceBySession?: Map<string, string>;
  cohortMap?: Map<string, CohortInfo>;
  enrolledCohortIds?: Set<string>;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const groups = groupByDate(sessions, enrolledCohortIds);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* Sticky date header */}
          <div className="sticky top-[57px] md:top-[73px] z-10 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">
              {group.label}
              <span className="ml-2 text-slate-400 font-normal">
                {group.sessions.length} {group.sessions.length === 1 ? "session" : "sessions"}
              </span>
            </h2>
          </div>

          {/* Session cards */}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {group.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isBooked={bookedSessionIds.has(session.id)}
                membership={membership}
                isPast={isPast}
                attendanceStatus={attendanceBySession?.get(session.id)}
                cohortInfo={session.cohort_id ? cohortMap?.get(session.cohort_id) : undefined}
                selectable={selectMode}
                selected={selectedIds?.has(session.id) ?? false}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(session.id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipTier>("community");

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
      let resolvedTier: MembershipTier = "community";
      let attendanceData: AttendanceRecord[] = [];

      try {
        const profile = await apiGet<MemberProfile>("/api/v1/members/me", {
          auth: true,
        });
        resolvedTier = getEffectiveTier(profile);

        attendanceData = await apiGet<AttendanceRecord[]>("/api/v1/attendance/me", {
          auth: true,
        }).catch(() => []);
      } catch {
        // Not authenticated or profile fetch failed — default community
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
        `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}`
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
          `/api/v1/sessions?types=${encodeURIComponent(SESSION_TYPES_QUERY)}&before=${sixtyDaysAgo.toISOString()}&status=completed`
        );
      } catch {
        past = [];
      }

      return {
        membership: resolvedTier,
        attendance: attendanceData,
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
    setAttendance(d.attendance);
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
    for (const record of attendance) {
      if (!record.session_id) continue;
      if (isActiveBooking(record.status)) {
        ids.add(record.session_id);
      }
    }
    return ids;
  }, [attendance]);

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
          <Badge variant="info">{tierDisplayLabel(membership)} member</Badge>
        </div>
        <p className="text-base text-slate-600">
          Browse sessions, manage your bookings, and review past swims.
        </p>
        <p className="text-sm text-slate-500">
          Know a pool we should partner with?{" "}
          <Link
            href="/account/pools/suggest"
            className="font-medium text-cyan-700 hover:underline"
          >
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
