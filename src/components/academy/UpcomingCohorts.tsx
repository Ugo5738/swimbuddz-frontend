"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Cohort, CohortStatus, Program } from "@/lib/academy";
import Link from "next/link";
import { useEffect, useState } from "react";

type CohortWithProgram = Cohort & {
  program?: Program;
};

/** Days between now and a future ISO date. Negative if in the past. */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatStartDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format naira → "₦12,000" (NGN). price_amount is stored as naira. */
function formatPrice(naira: number | undefined, currency: string | undefined): string | null {
  if (naira == null || naira <= 0) return null;
  const symbol = currency && currency.toUpperCase() !== "NGN" ? currency + " " : "₦";
  return `${symbol}${naira.toLocaleString()}`;
}

export function UpcomingCohorts() {
  const [cohorts, setCohorts] = useState<CohortWithProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCohorts = async () => {
      try {
        const openCohorts = await AcademyApi.getOpenCohorts();

        const cohortsWithDetails = await Promise.all(
          openCohorts.map(async (cohort) => {
            try {
              const program = await AcademyApi.getProgram(cohort.program_id);
              return { ...cohort, program };
            } catch (err) {
              console.error(`Failed to load program for cohort ${cohort.id}`, err);
              return cohort;
            }
          })
        );

        setCohorts(cohortsWithDetails);
      } catch (error) {
        console.error("Failed to load upcoming cohorts", error);
      } finally {
        setLoading(false);
      }
    };

    loadCohorts();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading upcoming cohorts…</div>;
  }

  if (cohorts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Cohorts Right Now</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          We&apos;re between cohorts — join the waitlist and we&apos;ll notify you the moment the
          next one opens.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-full bg-cyan-600 px-6 py-2 font-semibold text-white hover:bg-cyan-500 transition"
        >
          Join Academy Waitlist
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cohorts.map((cohort) => {
        const daysToStart = daysUntil(cohort.start_date);
        const isActive = cohort.status === CohortStatus.ACTIVE;
        const canJoinActive = isActive && cohort.allow_mid_entry;
        const isFull = cohort.is_full === true;

        // CTA precedence: full → waitlist beats closed-active; otherwise
        // we branch on status + mid-entry as before.
        let ctaLabel: string;
        let ctaDisabled = false;
        if (isFull) {
          ctaLabel = "Join the waitlist";
        } else if (canJoinActive) {
          ctaLabel = "Join in progress";
        } else if (isActive) {
          ctaLabel = "Enrollment closed";
          ctaDisabled = true;
        } else {
          ctaLabel = "Reserve your spot";
        }

        // Pricing: cohort override takes precedence over program price
        const priceNaira = cohort.price_override ?? cohort.program?.price_amount;
        const priceLabel = formatPrice(priceNaira, cohort.program?.currency);

        // "Last call" scarcity: cohort starts within 7 days and still open
        const isLastCall = !isActive && !isFull && daysToStart >= 0 && daysToStart <= 7;

        // Current week-of-programme for ACTIVE cohorts (1-indexed, clamped).
        const totalWeeks = cohort.program?.duration_weeks || 0;
        let currentWeek = 0;
        if (isActive && totalWeeks > 0) {
          const weeksIn = Math.floor((-daysToStart) / 7) + 1;
          currentWeek = Math.min(Math.max(weeksIn, 1), totalWeeks);
        }

        // Countdown label
        let countdownLabel: string;
        let countdownTone: string;
        if (isFull) {
          countdownLabel = "Full · waitlist open";
          countdownTone = "bg-amber-100 text-amber-800";
        } else if (daysToStart > 14) {
          countdownLabel = `Starts in ${daysToStart} days`;
          countdownTone = "bg-slate-100 text-slate-700";
        } else if (daysToStart > 1) {
          countdownLabel = `Starts in ${daysToStart} days`;
          countdownTone = "bg-amber-100 text-amber-800";
        } else if (daysToStart === 1) {
          countdownLabel = "Starts tomorrow";
          countdownTone = "bg-amber-100 text-amber-800";
        } else if (daysToStart === 0) {
          countdownLabel = "Starts today";
          countdownTone = "bg-emerald-100 text-emerald-800";
        } else if (canJoinActive && currentWeek > 0 && totalWeeks > 0) {
          countdownLabel = `Week ${currentWeek} of ${totalWeeks} · mid-entry open`;
          countdownTone = "bg-emerald-100 text-emerald-800";
        } else {
          countdownLabel = canJoinActive ? "In progress" : "Underway";
          countdownTone = "bg-emerald-100 text-emerald-800";
        }

        // Secondary visual tier: mid-entry and waitlist cards are still
        // enrollable but lower priority — muted ring + header gradient keeps
        // fresh-cohort cards (OPEN, not full) visually dominant.
        const isSecondaryTier = isFull || canJoinActive;

        return (
          <Card
            key={cohort.id}
            className={`flex flex-col overflow-hidden hover:shadow-lg transition-shadow p-0 ${
              isSecondaryTier ? "ring-1 ring-slate-200" : ""
            }`}
          >
            {/* Card header */}
            <div
              className="relative p-5 text-white min-h-[140px]"
              style={{
                backgroundImage: cohort.program?.cover_image_url
                  ? `linear-gradient(to bottom, rgba(0,0,0,${
                      isSecondaryTier ? "0.5" : "0.3"
                    }), rgba(0,0,0,${isSecondaryTier ? "0.85" : "0.7"})), url(${
                      cohort.program.cover_image_url
                    })`
                  : isSecondaryTier
                    ? "linear-gradient(to bottom right, rgb(71, 85, 105), rgb(30, 41, 59))"
                    : "linear-gradient(to bottom right, rgb(51, 65, 85), rgb(15, 23, 42))",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {isLastCall && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                    🔥 Last call
                  </span>
                </div>
              )}
              {cohort.program && (
                <div className="mb-2">
                  <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold capitalize">
                    {cohort.program.level.replace("_", " ")}
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">
                {cohort.program?.name || "Academy Program"}
              </h3>
              <p className="text-sm text-slate-200">{cohort.name}</p>
            </div>

            {/* Card body */}
            <div className="flex-1 p-5 space-y-4">
              {/* Countdown chip */}
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${countdownTone}`}
                >
                  <span>⏱️</span>
                  {countdownLabel}
                </span>
              </div>

              {cohort.program?.description && (
                <p className="text-sm text-slate-600 line-clamp-3">{cohort.program.description}</p>
              )}

              {/* Details */}
              <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-slate-900">
                    {cohort.program?.duration_weeks || 8} weeks
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Starts</span>
                  <span className="font-medium text-slate-900">
                    {formatStartDate(cohort.start_date)}
                  </span>
                </div>
                {cohort.location_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-900 text-right truncate max-w-[60%]">
                      {cohort.location_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Group size</span>
                  <span className="font-medium text-slate-900">
                    Up to {cohort.capacity} swimmers
                  </span>
                </div>
                {priceLabel && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Price</span>
                    <span className="font-semibold text-slate-900">{priceLabel}</span>
                  </div>
                )}
                {cohort.installment_plan_enabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment</span>
                    <span className="font-medium text-cyan-700">Installments available</span>
                  </div>
                )}
              </div>

              {/* State-aware disclosure block */}
              {isFull ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">At capacity.</span> Join the waitlist — when a
                  spot opens, the next person in line is enrolled automatically and we&apos;ll let
                  you know.
                </div>
              ) : canJoinActive && currentWeek > 1 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold">You&apos;ll start from week {currentWeek}.</span>{" "}
                  We&apos;ll send prep materials for the weeks you missed so you can catch up before
                  your first session.
                </div>
              ) : !isActive && daysToStart > 0 ? (
                <div className="rounded-xl bg-cyan-50 border border-cyan-100 px-3 py-2.5 text-xs text-cyan-800 leading-relaxed">
                  <span className="font-semibold">Reserve now →</span> get orientation, gear
                  checklist, and coach intro before day one.
                </div>
              ) : null}

              {/* CTA */}
              <div className="mt-auto pt-2 space-y-2">
                {ctaDisabled ? (
                  <Button className="w-full" disabled>
                    {ctaLabel}
                  </Button>
                ) : (
                  <Link href="/account/academy/browse" className="block w-full">
                    <Button className="w-full">{ctaLabel}</Button>
                  </Link>
                )}
                {cohort.program?.slug && (
                  <Link
                    href={`/academy/programs/${cohort.program.slug}`}
                    className="block text-center text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    View program details →
                  </Link>
                )}
                <p className="text-center text-xs text-slate-500">Requires Academy Membership</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
