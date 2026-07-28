import type { CalendarItem } from "@/lib/calendar";
import {
  CALENDAR_AUDIENCE_COLORS,
  CALENDAR_AUDIENCE_LABELS,
  formatCalendarDateTime,
} from "@/lib/calendar";
import { CalendarClock, ExternalLink, MapPin, X } from "lucide-react";
import Link from "next/link";

type CalendarDetailProps = {
  item: CalendarItem;
  authenticated: boolean;
  onClose: () => void;
};

export function CalendarDetail({ item, authenticated, onClose }: CalendarDetailProps) {
  const color = CALENDAR_AUDIENCE_COLORS[item.audience];
  const destination = authenticated
    ? item.href
    : `/login?redirect=${encodeURIComponent("/account/calendar")}`;

  return (
    <aside className="border-y border-slate-200 bg-white py-5" aria-label={`${item.title} details`}>
      <div className="flex items-start gap-4">
        <span className={`mt-1 h-12 w-2 shrink-0 ${color.dot}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {CALENDAR_AUDIENCE_LABELS[item.audience]} ·{" "}
                {item.source === "event" ? "Event" : "Swim session"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{item.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close activity details"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formatCalendarDateTime(item)}</span>
            </p>
            {item.location_name ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{item.location_name}</span>
              </p>
            ) : null}
          </div>

          {item.description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{item.description}</p>
          ) : null}

          <div className="mt-4">
            <Link
              href={destination}
              className="inline-flex h-9 items-center justify-center rounded-md bg-sky-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
            >
              {authenticated
                ? item.source === "event"
                  ? "View event"
                  : item.bookable
                    ? "Book session"
                    : "View session"
                : "Sign in for details"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
