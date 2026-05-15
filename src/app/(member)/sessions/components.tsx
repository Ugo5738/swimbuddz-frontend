// Member sessions list — sub-components extracted from page.tsx during
// the file-size sweep. All pure props-driven.

"use client";

import { SessionCard, type SessionWithRides } from "@/components/sessions/SessionCard";
import { Badge } from "@/components/ui/Badge";
import { type CohortInfo, getSessionTypeLabel } from "@/lib/sessions";
import { getEffectiveTier, type MembershipTier } from "@/lib/tiers";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Filter,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DATE_FILTERS, TYPE_FILTER_OPTIONS } from "./constants";
import type { DateFilter } from "./types";
import { formatDate, formatTimeRange, groupByDate, timeUntil } from "./utils";

export function FilterBar({
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

export function ActiveFilterChips({
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

export function NextSessionPanel({ session }: { session: SessionWithRides }) {
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

export function DateGroupedSessions({
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
