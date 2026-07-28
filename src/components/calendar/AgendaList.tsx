"use client";

import type { CalendarItem } from "@/lib/calendar";
import { CALENDAR_AUDIENCE_COLORS, CALENDAR_AUDIENCE_LABELS } from "@/lib/calendar";
import { format } from "date-fns";
import { Clock3, MapPin } from "lucide-react";
import { useMemo } from "react";

type AgendaListProps = {
  items: CalendarItem[];
  selectedId: string | null;
  onSelect: (item: CalendarItem) => void;
};

export function AgendaList({ items, selectedId, onSelect }: AgendaListProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = format(new Date(item.starts_at), "yyyy-MM-dd");
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return Array.from(grouped.entries());
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="border-y border-slate-200 py-14 text-center">
        <p className="font-medium text-slate-700">No activities in this view</p>
        <p className="mt-1 text-sm text-slate-500">
          Choose another calendar or move to a different month.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {groups.map(([dateKey, dayItems]) => {
        const date = new Date(`${dateKey}T12:00:00`);
        return (
          <section key={dateKey} className="grid gap-3 py-5 md:grid-cols-[9rem_1fr]">
            <div>
              <p className="text-sm font-semibold text-slate-900">{format(date, "EEEE")}</p>
              <p className="text-sm text-slate-500">{format(date, "d MMMM")}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {dayItems.map((item) => {
                const color = CALENDAR_AUDIENCE_COLORS[item.audience];
                const selected = selectedId === `${item.source}:${item.id}`;
                return (
                  <button
                    key={`${item.source}:${item.id}`}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`grid min-h-[72px] w-full grid-cols-[0.5rem_1fr] gap-3 py-3 text-left transition ${
                      selected ? "bg-cyan-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className={`mt-1 h-10 w-2 ${color.dot}`} aria-hidden="true" />
                    <span className="min-w-0 pr-2">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {CALENDAR_AUDIENCE_LABELS[item.audience]}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {format(new Date(item.starts_at), "h:mm a")}
                        </span>
                        {item.location_name ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.location_name}</span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
