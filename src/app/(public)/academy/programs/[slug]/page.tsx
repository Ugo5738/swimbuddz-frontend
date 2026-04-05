"use client";

import { LiveTestimonials } from "@/components/academy/LiveTestimonials";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Cohort, Program } from "@/lib/academy";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatPrice(kobo: number | undefined, currency: string | undefined): string | null {
  if (kobo == null || kobo <= 0) return null;
  const naira = Math.round(kobo / 100);
  const symbol = currency && currency.toUpperCase() !== "NGN" ? currency + " " : "₦";
  return `${symbol}${naira.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function levelLabel(level: string): string {
  return level.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgramLandingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [program, setProgram] = useState<Program | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        const programs = await AcademyApi.listPublishedPrograms();
        const match = programs.find((p) => p.slug === slug);

        if (!match) {
          setNotFoundState(true);
          setLoading(false);
          return;
        }

        setProgram(match);

        // Fetch cohorts for this program
        try {
          const cohortList = await AcademyApi.listCohorts(match.id);
          setCohorts(cohortList);
        } catch {
          // Non-fatal — just show program info
        }
      } catch {
        setNotFoundState(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">Loading program…</p>
      </div>
    );
  }

  if (notFoundState || !program) {
    notFound();
    return null;
  }

  const openCohorts = cohorts
    .filter((c) => c.status === "open" && new Date(c.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const priceLabel = formatPrice(program.price_amount, program.currency);

  return (
    <div className="space-y-12">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500">
        <Link href="/academy" className="hover:text-cyan-700">
          Academy
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 font-medium">{program.name}</span>
      </nav>

      {/* Hero */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 capitalize">
            {levelLabel(program.level)}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {program.duration_weeks} weeks
          </span>
          {priceLabel && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              From {priceLabel}
            </span>
          )}
        </div>

        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl leading-tight">
          {program.name}
        </h1>
        {program.description && (
          <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">{program.description}</p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="#cohorts"
            className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
          >
            {openCohorts.length > 0
              ? `See ${openCohorts.length} open cohort${openCohorts.length !== 1 ? "s" : ""} →`
              : "Join waitlist →"}
          </a>
          <Link
            href="/academy"
            className="inline-block rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
          >
            Back to Academy
          </Link>
        </div>
      </section>

      {/* Cover image */}
      {program.cover_image_url && (
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-3xl bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={program.cover_image_url}
            alt={program.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Program details grid */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</p>
          <p className="text-xl font-bold text-slate-900">{program.duration_weeks} weeks</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Level</p>
          <p className="text-xl font-bold text-slate-900 capitalize">{levelLabel(program.level)}</p>
        </Card>
        {priceLabel && (
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price</p>
            <p className="text-xl font-bold text-slate-900">{priceLabel}</p>
            <p className="text-xs text-slate-500">per cohort</p>
          </Card>
        )}
        <Card className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Group size
          </p>
          <p className="text-xl font-bold text-slate-900">
            {program.default_capacity ?? "6–12"} swimmers
          </p>
        </Card>
      </section>

      {/* Open cohorts */}
      <section id="cohorts" className="space-y-6 scroll-mt-24">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Open Cohorts</h2>
          <p className="text-slate-600 mt-2">Reserve your spot in the next starting cohort.</p>
        </div>

        {openCohorts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No open cohorts right now</h3>
            <p className="text-slate-600 mb-5 max-w-md mx-auto">
              We&apos;re between cohorts for this program. Join the waitlist and we&apos;ll notify
              you when the next one opens.
            </p>
            <Link href="/register">
              <Button>Join waitlist</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {openCohorts.map((cohort) => {
              const daysToStart = Math.ceil(
                (new Date(cohort.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const cohortPrice = formatPrice(
                cohort.price_override ?? program.price_amount,
                program.currency
              );
              const isLastCall = daysToStart >= 0 && daysToStart <= 7;

              return (
                <Card key={cohort.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{cohort.name}</h3>
                    {isLastCall && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        🔥 Last call
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Starts</span>
                      <span className="font-medium text-slate-900">
                        {formatDate(cohort.start_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ends</span>
                      <span className="font-medium text-slate-900">
                        {formatDate(cohort.end_date)}
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
                      <span className="font-medium text-slate-900">Up to {cohort.capacity}</span>
                    </div>
                    {cohortPrice && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Price</span>
                        <span className="font-semibold text-slate-900">{cohortPrice}</span>
                      </div>
                    )}
                    {cohort.installment_plan_enabled && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Payment</span>
                        <span className="font-medium text-cyan-700">Installments available</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-cyan-50 border border-cyan-100 px-3 py-2.5 text-xs text-cyan-800 leading-relaxed">
                    <span className="font-semibold">Reserve now →</span> get orientation, gear
                    checklist, and coach intro before day one.
                  </div>

                  <Link href="/account/academy/browse" className="block w-full">
                    <Button className="w-full">Reserve your spot</Button>
                  </Link>
                  <p className="text-center text-xs text-slate-500">Requires Academy Membership</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Testimonials (live from backend, static fallback) */}
      <LiveTestimonials track="academy" />

      {/* CTA */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to start {program.name}?</h2>
        <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
          Reserve your spot in the next cohort — or get notified when a new one opens.
        </p>
        <a
          href="#cohorts"
          className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
        >
          See cohorts
        </a>
      </section>
    </div>
  );
}
