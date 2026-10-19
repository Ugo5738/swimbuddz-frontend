"use client";

import { useApi } from "@/hooks/useApi";
import {
  CALENDAR_AUDIENCE_LABELS,
  CALENDAR_VISIBILITY_LABELS,
  calendarActionLabel,
  calendarPrimaryAudience,
  formatCalendarDateTime,
  selectUpcomingCalendarItems,
  type CalendarResponse,
} from "@/lib/calendar";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type Props = { onOpenCalendar: () => void };

/** Discovery is not a reservation. Keep it separate from member bookings. */
export function UpcomingCalendarPreview({ onOpenCalendar }: Props) {
  const queryPath = useMemo(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 60);
    const params = new URLSearchParams({
      from: start.toISOString(),
      to: end.toISOString(),
    });
    return `/api/v1/calendar?${params.toString()}`;
  }, []);
  const { data, error, loading, refetch } = useApi<CalendarResponse>(queryPath);
  const upcoming = useMemo(
    () => selectUpcomingCalendarItems(data?.items ?? [], new Date(), 6),
    [data]
  );

  return (
    <section aria-labelledby="discover-swims-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="discover-swims-title" className="text-xl font-bold text-slate-950">
            Coming up at SwimBuddz
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Browse upcoming Club, Academy and Community activities, even when you
            haven&apos;t booked. Eligibility and availability vary by activity.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCalendar}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-700 px-4 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
        >
          Full calendar <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          We couldn&apos;t load upcoming activities. Your reservations above are unaffected.
          <button type="button" onClick={refetch} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      ) : loading && !data ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          Loading SwimBuddz activities…
        </p>
      ) : (
        <>
          {Object.values(data?.errors ?? {}).length > 0 ? (
            <p role="status" className="text-sm text-amber-800">
              Some activities may be unavailable right now.
            </p>
          ) : null}
          {upcoming.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upcoming.map((item) => (
                <article key={`${item.source}:${item.id}`} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {CALENDAR_AUDIENCE_LABELS[calendarPrimaryAudience(item)]}
                      </span>
                      <span className="text-slate-500">{CALENDAR_VISIBILITY_LABELS[item.visibility]}</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                      <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{formatCalendarDateTime(item)}</span>
                    </p>
                    {(item.location_name || item.location_area) && (
                      <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
                        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item.location_name || item.location_area}</span>
                      </p>
                    )}
                  </div>
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 self-start text-sm font-semibold text-cyan-700 hover:underline"
                  >
                    {calendarActionLabel(item)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No activities are listed in the next 60 days. Check the full calendar for other dates.
            </p>
          )}
        </>
      )}
    </section>
  );
}
