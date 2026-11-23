"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { usePersonalSwims } from "@/hooks/usePersonalSwims";
import type { SwimActivity } from "@/lib/my-swims";

type SwimActivityWithClub = SwimActivity & { scheduledClub?: boolean; canBook?: boolean };

type RecommendedSession = {
  id: string;
  title: string;
  starts_at: string;
  location_name?: string | null;
  location?: string | null;
  access?: { bookable?: boolean } | null;
};
type Recommendation = {
  primary: RecommendedSession | null;
  alternatives: RecommendedSession[];
  next_confirmed: RecommendedSession | null;
};

function localDate(value: string | null | undefined): string {
  if (!value) return "Time to be confirmed";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Time to be confirmed" :
    parsed.toLocaleString("en-NG", {
      timeZone: "Africa/Lagos", weekday: "short", day: "numeric",
      month: "short", hour: "numeric", minute: "2-digit",
    });
}

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed", assigned: "Assigned Academy class",
  scheduled_for_pod: "Scheduled for your pod — not booked",
  scheduled_for_club: "Scheduled for your Club — not booked",
  pending: "Awaiting confirmation", pending_payment: "Payment pending",
};

function primaryAction(activity: SwimActivityWithClub): { text: string; href: string } {
  if (activity.scheduledClub) {
    if (activity.canBook && activity.sessionId) {
      return { text: "Book this swim", href: `/sessions/${encodeURIComponent(activity.sessionId)}/book` };
    }
    return { text: "View session details", href: activity.sessionId ? `/sessions/${encodeURIComponent(activity.sessionId)}` : "/account/bookings" };
  }
  if (activity.status === "pending_payment") {
    return { text: "Complete your booking", href: "/account/bookings" };
  }
  return { text: "View my swim", href: activity.sessionId ? `/sessions/${encodeURIComponent(activity.sessionId)}` : "/account/bookings" };
}

/**
 * Dashboard's next action uses the exact personal activity projection shown by
 * My Swims. An unbooked backend recommendation is consulted only when there
 * are no personal commitments. Neither data source reserves a seat.
 */
export function NextSwimDashboardFocus() {
  const projection = usePersonalSwims();
  const next = (projection.data?.upcoming.find(row =>
    ["confirmed", "assigned", "scheduled_for_pod", "scheduled_for_club"].includes(row.status)
  ) as SwimActivityWithClub | undefined) ?? null;
  const recommendation = useQuery({
    queryKey: ["member", "next-swim-recommendation"],
    queryFn: () => apiGet<Recommendation>("/api/v1/sessions/me/next-swim", { auth: true }),
    staleTime: 60_000,
    // Pending payment alone must not suppress otherwise valid recommendations.
    enabled: !projection.isLoading && !next,
  });

  const suggested = next ? null : recommendation.data?.primary;
  const action = next ? primaryAction(next) : suggested?.access?.bookable === true
    ? { text: "Book my next swim", href: `/sessions/${encodeURIComponent(suggested.id)}/book?source=next-swim` }
    : { text: "Find a swim", href: "/account/find-a-swim" };
  const heading = next
    ? next.scheduledClub ? "Next on your Club schedule" : "Your next swim"
    : suggested ? "Recommended for your next swim" : "Plan your next swim";

  return (
    <section aria-label="Your next swimming action"
      className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-800">{heading}</p>
        {next && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-900">
          {statusLabels[next.status] ?? next.status.replaceAll("_", " ")}
        </span>}
      </div>
      {projection.isLoading || (recommendation.isLoading && !next) ?
        <p role="status" className="mt-3 text-sm text-slate-700">
          {projection.isLoading ? "Loading your swimming schedule…" : "Finding your next eligible swim…"}
        </p> :
        <div className="mt-3 space-y-3">
          <h2 className="text-xl font-bold text-slate-950">
            {next?.title || suggested?.title || "Ready to get back in the water?"}
          </h2>
          {next || suggested ? <p className="flex items-center gap-2 text-sm text-slate-700">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true"/>
            {localDate(next?.date || suggested?.starts_at)} ·
            {" "}{next?.location || suggested?.location_name || suggested?.location || "Pool to be confirmed"}
          </p> :
          <p className="text-sm text-slate-700">
            Explore a suitable session or plan a swim with friends.
          </p>}
          {next?.scheduledClub &&
            <p className="text-sm text-slate-700">This is on your Club schedule, but your place is not yet reserved.</p>}
          {projection.data?.errors.length ? <p role="alert" className="text-sm text-amber-900">
            Some schedule information couldn't load. Verify the details before booking.
          </p> : null}
          {recommendation.isError && !next &&
            <p role="alert" className="text-sm text-amber-900">
              Couldn't check personalized recommendations. You can still browse available sessions.
              <button type="button" className="ml-2 font-semibold underline"
                onClick={() => void recommendation.refetch()}>Retry</button>
            </p>}
          <div className="flex flex-wrap items-center gap-3">
            <Link href={action.href} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
              {action.text} <ArrowRight className="h-4 w-4" aria-hidden="true"/>
            </Link>
            <Link href="/account/bookings" className="text-sm font-semibold text-cyan-900 hover:underline">My Swims</Link>
            <Link href="/account/find-a-swim" className="text-sm font-semibold text-cyan-900 hover:underline">Other swims</Link>
          </div>
          {(projection.data?.attention.length ?? 0) > 0 &&
            <Link href="/account/bookings" className="block text-sm font-medium text-amber-900 underline">
              You have swim bookings or requests needing attention
            </Link>}
        </div>}
    </section>
  );
}
