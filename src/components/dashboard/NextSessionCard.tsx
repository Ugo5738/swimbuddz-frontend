"use client";

import { Button } from "@/components/ui/Button";
import { LOCATION_LABELS } from "@/lib/sessions";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

type NextSessionCardProps = {
  session?: {
    session_title: string;
    session_starts_at: string;
    session_location?: string;
    /** If provided, session is already booked */
    session_id?: number;
  } | null;
  /** Whether this session is already booked by the member */
  isBooked?: boolean;
};

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;

  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

function getCountdown(dateStr: string): string {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Starting soon";
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays === 1) return "in 1 day";
  return `in ${diffDays} days`;
}

export function NextSessionCard({ session, isBooked }: NextSessionCardProps) {
  if (!session) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
          <Calendar className="h-6 w-6 text-cyan-600" />
        </div>
        <p className="font-semibold text-slate-900">Ready for your next swim?</p>
        <p className="mt-1 text-sm text-slate-500">Browse sessions and book your spot</p>
        <Link href="/sessions" className="mt-4 inline-block">
          <Button size="sm">
            Find a session
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const locationLabel = session.session_location
    ? LOCATION_LABELS[session.session_location] || session.session_location
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border border-cyan-100 p-5">
      {/* Countdown badge */}
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center rounded-full bg-cyan-600 px-3 py-1 text-xs font-bold text-white">
          {getCountdown(session.session_starts_at)}
        </span>
      </div>

      <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-1">
        Next Session
      </p>
      <h3 className="text-lg font-bold text-slate-900 pr-20">{session.session_title}</h3>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>{formatSessionDate(session.session_starts_at)}</span>
        </div>
        {locationLabel && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{locationLabel}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        {isBooked ? (
          <Link href="/sessions?view=booked">
            <Button size="sm" variant="outline">
              View booking
            </Button>
          </Link>
        ) : (
          <Link href="/sessions">
            <Button size="sm">
              Book now
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        )}
        <Link
          href="/sessions"
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
        >
          See all sessions <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
