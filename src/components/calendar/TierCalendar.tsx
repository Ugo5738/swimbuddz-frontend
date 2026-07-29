"use client";

import { AgendaList } from "@/components/calendar/AgendaList";
import { CalendarDetail } from "@/components/calendar/CalendarDetail";
import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import type {
  CalendarAudience,
  CalendarItem,
  CalendarResponse,
  CalendarVisibility,
} from "@/lib/calendar";
import { CALENDAR_AUDIENCE_COLORS, CALENDAR_AUDIENCE_LABELS } from "@/lib/calendar";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

type CalendarView = "month" | "list";
type AudienceFilter = "all" | CalendarAudience;
type ActivityFilter = "all" | "online" | "open_swim" | "social" | "assessment";
type VisibilityFilter = "all" | CalendarVisibility;

type TierCalendarProps = {
  authenticated: boolean;
  title: string;
  subtitle: string;
};

const AUDIENCES: CalendarAudience[] = ["community", "club", "academy"];

function listRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: addMonths(from, 12).toISOString(),
  };
}

function monthRange(month: Date) {
  const from = startOfMonth(month);
  return {
    from: from.toISOString(),
    to: addMonths(from, 1).toISOString(),
  };
}

function itemKey(item: CalendarItem): string {
  return `${item.source}:${item.id}`;
}

export function TierCalendar({ authenticated, title, subtitle }: TierCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [range, setRange] = useState(listRange);
  const [view, setView] = useState<CalendarView>("list");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [location, setLocation] = useState("all");
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const queryPath = useMemo(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to });
    return `/api/v1/calendar?${params.toString()}`;
  }, [range]);
  const { data, loading, error, refetch } = useApi<CalendarResponse>(queryPath, {
    auth: authenticated,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.location_area || item.location_name)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (audience !== "all" && item.audience !== audience) return false;
        if (visibility !== "all" && item.visibility !== visibility) return false;
        if (
          location !== "all" &&
          item.location_area !== location &&
          item.location_name !== location
        ) {
          return false;
        }
        if (activity === "online" && item.location_type !== "online") return false;
        if (activity !== "all" && activity !== "online" && item.kind !== activity) {
          return false;
        }
        return true;
      }),
    [activity, audience, items, location, visibility]
  );
  const calendarEvents = useMemo<EventInput[]>(
    () =>
      filteredItems.map((item) => {
        const colors = CALENDAR_AUDIENCE_COLORS[item.audience];
        return {
          id: itemKey(item),
          title: item.title,
          start: item.starts_at,
          end: item.ends_at ?? undefined,
          backgroundColor: colors.background,
          borderColor: colors.border,
          extendedProps: { item },
        };
      }),
    [filteredItems]
  );
  const partialErrors = Object.values(data?.errors ?? {});
  const hasSecondaryFilters = activity !== "all" || visibility !== "all" || location !== "all";

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    const next = {
      from: info.start.toISOString(),
      to: info.end.toISOString(),
    };
    setRange((current) => (current.from === next.from && current.to === next.to ? current : next));
    setVisibleMonth(startOfMonth(info.view.currentStart));
    setSelectedItem(null);
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const item = info.event.extendedProps.item as CalendarItem | undefined;
    if (item) setSelectedItem(item);
  }, []);

  const changeView = useCallback(
    (next: CalendarView) => {
      setView(next);
      setSelectedItem(null);
      if (next === "list") {
        setRange(listRange());
      } else {
        setRange(monthRange(visibleMonth));
      }
    },
    [visibleMonth]
  );

  const moveMonth = useCallback(
    (direction: -1 | 1) => {
      const next = direction === -1 ? subMonths(visibleMonth, 1) : addMonths(visibleMonth, 1);
      setVisibleMonth(next);
      calendarRef.current?.getApi().gotoDate(next);
      setRange(monthRange(next));
      setSelectedItem(null);
    },
    [visibleMonth]
  );

  const goToday = useCallback(() => {
    const today = startOfMonth(new Date());
    setVisibleMonth(today);
    calendarRef.current?.getApi().today();
    setRange(monthRange(today));
    setSelectedItem(null);
  }, []);

  const clearSecondaryFilters = () => {
    setActivity("all");
    setVisibility("all");
    setLocation("all");
  };

  const renderEvent = useCallback((info: EventContentArg) => {
    return (
      <div className="min-w-0 px-1 py-0.5">
        <p className="truncate text-[11px] font-semibold">{info.event.title}</p>
        <p className="truncate text-[10px] opacity-90">{info.timeText}</p>
      </div>
    );
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 md:text-base">{subtitle}</p>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {view === "list" ? "Upcoming 12 months" : format(visibleMonth, "MMMM yyyy")}
        </p>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto" aria-label="Calendar audience">
            <button
              type="button"
              onClick={() => setAudience("all")}
              className={`min-h-[40px] shrink-0 rounded-md px-3 text-sm font-medium ${
                audience === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              All
            </button>
            {AUDIENCES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAudience(value)}
                className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                  audience === value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 ${CALENDAR_AUDIENCE_COLORS[value].dot}`}
                  aria-hidden="true"
                />
                {CALENDAR_AUDIENCE_LABELS[value]}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            {view === "month" ? (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="min-h-[40px] rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                  aria-label="Next month"
                  title="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-slate-500">{filteredItems.length} activities</span>
            )}

            <div className="flex rounded-md border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => changeView("month")}
                className={`inline-flex h-9 items-center gap-2 rounded px-2.5 text-sm ${
                  view === "month" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="Month view"
                title="Month view"
              >
                <CalendarDays className="h-4 w-4" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => changeView("list")}
                className={`inline-flex h-9 items-center gap-2 rounded px-2.5 text-sm ${
                  view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="List view"
                title="List view"
              >
                <List className="h-4 w-4" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 border-y border-slate-200 py-3">
          <span className="inline-flex h-10 items-center gap-2 pr-2 text-sm font-medium text-slate-600">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            Activity
            <select
              value={activity}
              onChange={(event) => setActivity(event.target.value as ActivityFilter)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="all">All activities</option>
              <option value="online">Online</option>
              <option value="open_swim">Open Swim</option>
              <option value="social">Social</option>
              <option value="assessment">Assessment</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            Access
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="all">All visibility</option>
              <option value="public">Public</option>
              <option value="members_only">Members-only</option>
              <option value="invite_only">Invite-only</option>
            </select>
          </label>
          <label className="grid min-w-[12rem] flex-1 gap-1 text-xs font-medium text-slate-500 sm:max-w-xs">
            Location
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="all">All locations</option>
              {locations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {hasSecondaryFilters ? (
            <button
              type="button"
              onClick={clearSecondaryFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert title="Calendar unavailable" variant="error">
          <p>{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 inline-flex items-center gap-1.5 font-semibold underline"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </Alert>
      ) : null}

      {partialErrors.length > 0 && !error ? (
        <Alert title="Some activities could not be loaded">{partialErrors.join(" ")}</Alert>
      ) : null}

      {loading && !data ? (
        <LoadingCard />
      ) : view === "month" ? (
        <div className="calendar-shell hidden border-y border-slate-200 bg-white py-3 md:block">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            initialDate={visibleMonth}
            headerToolbar={false}
            events={calendarEvents}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            eventContent={renderEvent}
            dayMaxEvents={3}
            fixedWeekCount={false}
            height="auto"
          />
        </div>
      ) : (
        <AgendaList
          items={filteredItems}
          selectedId={selectedItem ? itemKey(selectedItem) : null}
          onSelect={setSelectedItem}
        />
      )}

      {view === "month" ? (
        <div className="md:hidden">
          <Alert title="Month view is available on larger screens">
            Switch to List to browse activities on this device.
          </Alert>
        </div>
      ) : null}

      {selectedItem ? (
        <CalendarDetail
          item={selectedItem}
          authenticated={authenticated}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}

      <style jsx global>{`
        .calendar-shell .fc {
          font-family: inherit;
        }
        .calendar-shell .fc-scrollgrid,
        .calendar-shell .fc-theme-standard td,
        .calendar-shell .fc-theme-standard th {
          border-color: #e2e8f0;
        }
        .calendar-shell .fc-col-header-cell-cushion {
          padding: 0.65rem 0.25rem;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .calendar-shell .fc-daygrid-day-number {
          padding: 0.45rem;
          color: #334155;
          font-size: 0.8rem;
        }
        .calendar-shell .fc-day-today {
          background: #ecfeff !important;
        }
        .calendar-shell .fc-event {
          min-height: 2.25rem;
          cursor: pointer;
          border-radius: 3px;
        }
        .calendar-shell .fc-daygrid-day-frame {
          min-height: 7.5rem;
        }
        .calendar-shell .fc-more-link {
          color: #0e7490;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
