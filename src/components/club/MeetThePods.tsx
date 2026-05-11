"use client";

/**
 * MeetThePods — Club-page section showing currently-active public pods.
 *
 * Reads `GET /api/v1/members/pods/public` (anonymous-readable) and
 * renders a compact card grid: pod handle, member count, default
 * Saturday session info, status badge. Each card links to a pod
 * detail page (or, today, falls back to /sessions-and-events).
 *
 * Auto-hides gracefully — if the fetch fails or returns zero pods,
 * the section shows a "Pods coming online" message rather than
 * disappearing entirely, so prospects always see *some* signal that
 * the Club has a structure here.
 */

import { Card } from "@/components/ui/Card";
import { formatDay, formatTime, listPublicPods, podDisplayName, PodSummary } from "@/lib/pods";
import { ArrowRight, Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const MAX_VISIBLE = 6;

export function MeetThePods() {
  const [pods, setPods] = useState<PodSummary[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPublicPods()
      .then((data) => {
        if (!cancelled) setPods(data);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Find Your Crew
        </p>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Meet the Pods</h2>
        <p className="max-w-3xl text-slate-600">
          Pods are small training crews of 2–5 swimmers. Pick one with room and a vibe you like — or
          get assigned during onboarding. Each pod has its own handle, its own Pod Lead, and a fixed
          Saturday session.
        </p>
      </header>

      {pods === null && !errored ? (
        // Loading placeholders so the layout doesn't shift.
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-slate-50">
              <span className="sr-only">Loading pod…</span>
            </Card>
          ))}
        </div>
      ) : errored || (pods && pods.length === 0) ? (
        <Card className="py-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">Pods coming online soon</h3>
          <p className="mt-2 text-sm text-slate-600">
            We're seeding the first Club pods now. Join Club to be placed in the next available pod,
            or reach out and we'll match you ourselves.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(pods ?? []).slice(0, MAX_VISIBLE).map((pod) => (
              <PodCard key={pod.id} pod={pod} />
            ))}
          </div>
          {pods && pods.length > MAX_VISIBLE && (
            <div className="text-right">
              <Link
                href="/register?goal=club"
                className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Browse all {pods.length} pods after joining
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PodCard({ pod }: { pod: PodSummary }) {
  const display = podDisplayName(pod);
  const isFull = pod.active_member_count >= pod.max_size;

  return (
    <Card className="space-y-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{display}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isFull ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isFull ? "Full" : "Open"}
        </span>
      </div>

      {pod.description && <p className="line-clamp-2 text-sm text-slate-600">{pod.description}</p>}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {pod.active_member_count} / {pod.max_size} swimmers
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDay(pod.default_session_day, true)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(pod.default_session_time)} · {pod.default_session_duration_minutes}m
        </span>
      </div>
    </Card>
  );
}
