"use client";

import { AgendaList } from "@/components/calendar/AgendaList";
import { CalendarDetail } from "@/components/calendar/CalendarDetail";
import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import type { CalendarAudience, CalendarItem, CalendarResponse } from "@/lib/calendar";
import { CALENDAR_AUDIENCE_COLORS, CALENDAR_AUDIENCE_LABELS } from "@/lib/calendar";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

type CalendarFilter = "all" | CalendarAudience;
type CalendarView = "month" | "agenda";

type TierCalendarProps = {
  authenticated: boolean;
  title: string;
  subtitle: string;
};

function initialRange() {
  const start = startOfMonth(new Date());
  return {
    from: start.toISOString(),
    to: addMonths(start, 1).toISOString(),
  };
}

function itemKey(item: CalendarItem): string {
  return `${item.source}:${item.id}`;
}

export function TierCalendar({ authenticated, title, subtitle }: TierCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [range, setRange] = useState(initialRange);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [view, setView] = useState<CalendarView>("month");
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
  const filteredItems = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.audience === filter)),
    [filter, items]
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

  const audiences = data?.available_audiences ?? ["community"];
  const partialErrors = Object.values(data?.errors ?? {});

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    const from = info.start.toISOString();
    const to = info.end.toISOString();
    setRange((current) => (current.from === from && current.to === to ? current : { from, to }));
    setVisibleMonth(startOfMonth(info.view.currentStart));
    setSelectedItem(null);
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const item = info.event.extendedProps.item as CalendarItem | undefined;
    if (item) setSelectedItem(item);
  }, []);

  const moveMonth = useCallback(
    (direction: -1 | 1) => {
      const next = direction === -1 ? subMonths(visibleMonth, 1) : addMonths(visibleMonth, 1);
      setVisibleMonth(next);
      calendarRef.current?.getApi().gotoDate(next);
      setRange({
        from: startOfMonth(next).toISOString(),
        to: addMonths(startOfMonth(next), 1).toISOString(),
      });
      setSelectedItem(null);
    },
    [visibleMonth]
  );

  const goToday = useCallback(() => {
    const today = startOfMonth(new Date());
    setVisibleMonth(today);
    calendarRef.current?.getApi().today();
    setRange({
      from: today.toISOString(),
      to: addMonths(today, 1).toISOString(),
    });
    setSelectedItem(null);
  }, []);

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
        <p className="text-sm font-semibold text-slate-700">{format(visibleMonth, "MMMM yyyy")}</p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto" aria-label="Calendar audience">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[40px] shrink-0 rounded-md px-3 text-sm font-medium ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            All
          </button>
          {audiences.map((audience) => (
            <button
              key={audience}
              type="button"
              onClick={() => setFilter(audience)}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                filter === audience
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 ${CALENDAR_AUDIENCE_COLORS[audience].dot}`}
                aria-hidden="true"
              />
              {CALENDAR_AUDIENCE_LABELS[audience]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
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

          <div className="hidden rounded-md border border-slate-200 bg-white p-1 md:flex">
            <button
              type="button"
              onClick={() => setView("month")}
              className={`inline-flex h-9 items-center gap-2 rounded px-2.5 text-sm ${
                view === "month" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              aria-label="Month view"
              title="Month view"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className={`inline-flex h-9 items-center gap-2 rounded px-2.5 text-sm ${
                view === "agenda" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              aria-label="Agenda view"
              title="Agenda view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
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
      ) : (
        <>
          <div className={view === "month" ? "hidden md:block" : "hidden"}>
            <div className="calendar-shell border-y border-slate-200 bg-white py-3">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
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
          </div>
          <div className={view === "agenda" ? "block" : "block md:hidden"}>
            <AgendaList
              items={filteredItems}
              selectedId={selectedItem ? itemKey(selectedItem) : null}
              onSelect={setSelectedItem}
            />
          </div>
        </>
      )}

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
