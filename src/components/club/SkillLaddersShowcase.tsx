"use client";

/**
 * SkillLaddersShowcase — Club-page surface for evergreen skill ladders.
 *
 * Reads `GET /api/v1/challenges/series/list?audience=club` and renders
 * each series as a numbered horizontal track of challenge tiles.
 * Multiple ladders stack vertically, each with its own header
 * (title from the slug + step count + hint text).
 *
 * Auto-hides when there are no series-bound challenges. Soft-locks
 * tiles whose `requires_challenge_id` references an unearned badge
 * (only relevant for the rare admin-opted-in hard-gating case).
 *
 * Where it lives:
 *   * Club page (/club) — this is the primary surface; visitors see
 *     "what would I progress through if I joined Club?"
 *   * Future: member portal (/account/profile) shows their actual
 *     position on each ladder via a separate component.
 */

import { Card } from "@/components/ui/Card";
import {
  Challenge,
  isVideoUrl,
  listChallengesBySeries,
} from "@/lib/challenges";
import { Check, ChevronRight, Lock, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface SkillLaddersShowcaseProps {
  /** Filter ladders to a single audience tier (defaults to "club"). */
  audience?: "club" | "academy" | "community" | "all";
  /** Optional set of challenge ids the viewing member has already earned —
   *  used to mark steps as "✓ Done". Pass an empty set for prospects. */
  earnedChallengeIds?: Set<string>;
}

// Human-readable header for a series. We try the first challenge's
// description for context, and humanize the slug as the headline.
function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SkillLaddersShowcase({
  audience = "club",
  earnedChallengeIds = new Set(),
}: SkillLaddersShowcaseProps) {
  const [ladders, setLadders] = useState<Record<string, Challenge[]> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listChallengesBySeries(audience)
      .then((data) => {
        if (!cancelled) setLadders(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const orderedSlugs = useMemo(() => {
    if (!ladders) return [];
    return Object.keys(ladders).sort();
  }, [ladders]);

  // Don't render anything (no skeleton, no error message) if data isn't
  // ready or the response is empty. The Club page should look complete
  // without ladders if you haven't seeded any yet.
  if (!ladders || error) return null;
  if (orderedSlugs.length === 0) return null;

  return (
    <section className="space-y-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          The Club Path
        </p>
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Earn your way through the swim curriculum
        </h2>
        <p className="max-w-2xl text-slate-600">
          Each Club member moves through these milestones at their own
          pace. Approved by your Pod Lead, badged on your profile,
          counted toward Bubbles and volunteer hours where applicable.
        </p>
      </header>

      <div className="space-y-12">
        {orderedSlugs.map((slug) => {
          const steps = ladders[slug] ?? [];
          if (steps.length === 0) return null;

          const earnedInLadder = steps.filter((s) =>
            earnedChallengeIds.has(s.id),
          ).length;

          return (
            <SkillLadder
              key={slug}
              slug={slug}
              steps={steps}
              earnedChallengeIds={earnedChallengeIds}
              earnedInLadder={earnedInLadder}
            />
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One ladder
// ---------------------------------------------------------------------------

function SkillLadder({
  slug,
  steps,
  earnedChallengeIds,
  earnedInLadder,
}: {
  slug: string;
  steps: Challenge[];
  earnedChallengeIds: Set<string>;
  earnedInLadder: number;
}) {
  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 md:text-2xl">
            {humanizeSlug(slug)}
          </h3>
          <p className="text-sm text-slate-600">
            {steps.length} milestone{steps.length === 1 ? "" : "s"}
            {earnedInLadder > 0 && ` · ${earnedInLadder} earned`}
          </p>
        </div>
        <Link
          href={`/challenges?series=${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
        >
          See ladder details
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-0 md:px-0">
        {steps.map((step, idx) => (
          <SkillStepTile
            key={step.id}
            step={step}
            stepNumber={step.series_order ?? idx + 1}
            earned={earnedChallengeIds.has(step.id)}
            locked={Boolean(
              step.requires_challenge_id &&
                !earnedChallengeIds.has(step.requires_challenge_id),
            )}
          />
        ))}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// One step on a ladder
// ---------------------------------------------------------------------------

function SkillStepTile({
  step,
  stepNumber,
  earned,
  locked,
}: {
  step: Challenge;
  stepNumber: number;
  earned: boolean;
  locked: boolean;
}) {
  const lead = step.example_media[0];
  const previewUrl = lead?.thumbnail_url || lead?.file_url || null;

  // Locked tiles still link to the detail page so users can read about
  // a step and the prerequisite — but the visual treatment is muted.
  // Earned tiles get a checkmark overlay and a subtle border.
  const tileClasses = [
    "relative flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white ring-1 transition",
    earned
      ? "ring-emerald-300 ring-2"
      : locked
        ? "ring-slate-200 opacity-70 hover:opacity-100"
        : "ring-slate-200 hover:ring-cyan-400 hover:shadow-lg",
  ].join(" ");

  return (
    <Link
      href={`/challenges/${step.id}`}
      className={tileClasses}
      aria-label={`Step ${stepNumber}: ${step.title}${earned ? " — earned" : locked ? " — locked" : ""}`}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {previewUrl ? (
          isVideoUrl(previewUrl) ? (
            <video
              src={previewUrl}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={previewUrl}
              alt=""
              fill
              sizes="260px"
              className="object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/10 via-slate-100 to-amber-500/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
        )}

        {/* Step-number chip on every tile */}
        <div className="absolute left-2 top-2">
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900/85 px-2 text-[11px] font-semibold text-white backdrop-blur">
            {stepNumber}
          </span>
        </div>

        {/* State overlay: earned > locked > none */}
        {earned ? (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Check className="h-3.5 w-3.5" />
          </div>
        ) : locked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-1 text-white">
              <Lock className="h-6 w-6" />
              <span className="text-[11px] font-medium">
                Earn step {stepNumber - 1} first
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h4 className="line-clamp-2 font-semibold text-slate-900">
          {step.title}
        </h4>
        <p className="line-clamp-2 text-xs text-slate-600">
          🏅 {step.badge_name}
        </p>
      </div>
    </Link>
  );
}
