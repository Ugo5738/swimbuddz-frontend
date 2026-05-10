"use client";

/**
 * ChallengesCarousel — homepage section showing public-visible challenges.
 *
 * Reads `GET /api/v1/challenges/public/all` (the same endpoint that powers
 * the /challenges landing page) and renders:
 *   * Nothing — if there are 0 active or finished-with-winner challenges.
 *     We never want a sad empty section on the marketing homepage.
 *   * A single hero card — if there's exactly 1 challenge to surface.
 *   * A horizontal scroll-snap row — for 2+ challenges. Native swipe on
 *     mobile, chevron arrows + scroll-snap on desktop. End-of-row tile
 *     deep-links to the full /challenges listing.
 *
 * Tile design intentionally mirrors `(public)/challenges/page.tsx` so the
 * homepage row and the dedicated landing page feel like the same family.
 */

import { Card } from "@/components/ui/Card";
import {
  isVideoUrl,
  listPublicChallenges,
  PublicChallenge,
} from "@/lib/challenges";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  time_trial: "Time Trial",
  attendance: "Attendance",
  distance: "Distance",
  technique: "Technique",
};

export function ChallengesCarousel() {
  const [items, setItems] = useState<PublicChallenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublicChallenges("all")
      .then((data) => {
        if (cancelled) return;
        // Only show challenges that are either still running OR finished
        // with a designated winner — finished participatory challenges
        // without a winner are uninteresting to a brand-new visitor.
        const surface = data.filter((c) => !c.is_finished || c.winner);
        setItems(surface);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!items) return [];
    // Running first (by ends_at asc — soonest deadline floats up), then
    // recently-decided winners (newest first).
    return [...items].sort((a, b) => {
      if (a.is_finished !== b.is_finished) return a.is_finished ? 1 : -1;
      const aTs = a.ends_at ? new Date(a.ends_at).getTime() : 0;
      const bTs = b.ends_at ? new Date(b.ends_at).getTime() : 0;
      if (a.is_finished) return bTs - aTs;
      return aTs - bTs;
    });
  }, [items]);

  // Server hasn't responded yet → render nothing (no skeleton). Keeps the
  // homepage from layout-shifting when there's nothing meaningful to show.
  if (items === null) return null;
  if (error) return null;
  if (sorted.length === 0) return null;

  const runningCount = sorted.filter((c) => !c.is_finished).length;
  const winnerCount = sorted.filter((c) => c.is_finished && c.winner).length;

  // Single-challenge layout: render a hero-style card instead of a sad
  // one-tile carousel.
  if (sorted.length === 1) {
    return (
      <section className="space-y-6">
        <SectionHeader
          runningCount={runningCount}
          winnerCount={winnerCount}
        />
        <SingleChallengeHero challenge={sorted[0]} />
      </section>
    );
  }

  const scrollByOne = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const tile = el.querySelector("[data-tile]") as HTMLElement | null;
    const step = tile ? tile.offsetWidth + 16 : el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" });
  };

  return (
    <section className="space-y-6">
      <SectionHeader runningCount={runningCount} winnerCount={winnerCount} />

      <div className="relative">
        {/* Desktop scroll arrows. Hidden on touch devices because native
            swipe is the better gesture. */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByOne("left")}
          className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg ring-1 ring-slate-200 hover:bg-cyan-50 md:block"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByOne("right")}
          className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg ring-1 ring-slate-200 hover:bg-cyan-50 md:block"
        >
          <ChevronRight className="h-5 w-5 text-slate-700" />
        </button>

        <div
          ref={scrollerRef}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-0 md:px-0"
        >
          {sorted.map((c) => (
            <ChallengeTile key={c.id} challenge={c} />
          ))}
          <BrowseAllTile />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  runningCount,
  winnerCount,
}: {
  runningCount: number;
  winnerCount: number;
}) {
  const subtitleParts: string[] = [];
  if (runningCount > 0) {
    subtitleParts.push(
      `${runningCount} running${runningCount === 1 ? "" : ""}`,
    );
  }
  if (winnerCount > 0) {
    subtitleParts.push(
      `${winnerCount} winner${winnerCount === 1 ? "" : "s"} this season`,
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Live Challenges
        </p>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          What our community is taking on
        </h2>
        {subtitleParts.length > 0 && (
          <p className="text-sm text-slate-600">{subtitleParts.join(" · ")}</p>
        )}
      </div>
      <Link
        href="/challenges"
        className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
      >
        Browse all challenges
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

const TILE_BASE =
  "relative flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-lg sm:w-[280px] md:w-[300px]";

function ChallengeTile({ challenge }: { challenge: PublicChallenge }) {
  const lead = challenge.example_media[0];
  const previewUrl = lead?.thumbnail_url || lead?.file_url || null;
  const finishedWithWinner = challenge.is_finished && challenge.winner;

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      data-tile
      className={`${TILE_BASE} group`}
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
            <img
              src={previewUrl}
              alt={challenge.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/10 via-slate-100 to-amber-500/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-7 w-7" />
            </div>
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {challenge.is_finished ? (
            <Tag color="slate">Finished</Tag>
          ) : (
            <Tag color="emerald">Running</Tag>
          )}
          {challenge.format === "competition" && (
            <Tag color="rose">Competition</Tag>
          )}
        </div>

        {challenge.ends_at && !challenge.is_finished && (
          <div className="absolute right-2 top-2">
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 backdrop-blur">
              {relativeEnds(challenge.ends_at)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold text-slate-900">
          {challenge.title}
        </h3>

        {finishedWithWinner ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <Trophy className="h-3.5 w-3.5" />
            <span>
              <strong className="font-semibold">
                {challenge.winner!.captain_name}
              </strong>{" "}
              won
            </span>
          </div>
        ) : (
          <p className="line-clamp-2 text-sm text-slate-600">
            {challenge.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {challenge.completion_count} earned
          </span>
          <span className="text-cyan-600 group-hover:text-cyan-700">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function BrowseAllTile() {
  return (
    <Link
      href="/challenges"
      data-tile
      className={`${TILE_BASE} items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-center text-white hover:shadow-cyan-500/40`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <Trophy className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold">Browse all challenges</p>
        <p className="text-xs text-cyan-100/90">
          See everything running, finished, and earned across the community.
        </p>
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          Open challenges
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Single-challenge hero (shown when there's exactly 1 challenge to surface)
// ---------------------------------------------------------------------------

function SingleChallengeHero({ challenge }: { challenge: PublicChallenge }) {
  const lead = challenge.example_media[0];
  const previewUrl = lead?.thumbnail_url || lead?.file_url || null;
  const finishedWithWinner = challenge.is_finished && challenge.winner;

  return (
    <Link href={`/challenges/${challenge.id}`} className="group block">
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-xl">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-video bg-slate-100 md:aspect-auto md:min-h-[280px]">
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
                <img
                  src={previewUrl}
                  alt={challenge.title}
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/20 via-slate-100 to-amber-500/20">
                <Trophy className="h-16 w-16 text-amber-500" />
              </div>
            )}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {challenge.is_finished ? (
                <Tag color="slate">Finished</Tag>
              ) : (
                <Tag color="emerald">Running</Tag>
              )}
              <Tag color="cyan">
                {TYPE_LABELS[challenge.challenge_type] ??
                  challenge.challenge_type}
              </Tag>
              {challenge.format === "competition" && (
                <Tag color="rose">Competition</Tag>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
            <h3 className="text-2xl font-bold text-slate-900">
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="line-clamp-3 text-slate-600">
                {challenge.description}
              </p>
            )}

            {finishedWithWinner ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">
                    {challenge.winner!.captain_name}
                  </span>{" "}
                  won this challenge
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>🏅 {challenge.badge_name}</span>
              {challenge.ends_at && !challenge.is_finished && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {relativeEnds(challenge.ends_at)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {challenge.completion_count} earned
              </span>
            </div>

            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-cyan-700">
                {challenge.is_finished ? "See the winner" : "View challenge"}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Tiny utilities
// ---------------------------------------------------------------------------

function relativeEnds(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 14) return `${Math.floor(days / 7)} wks left`;
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs >= 1) return `${hrs}h left`;
  return "Ends soon";
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "rose" | "amber" | "cyan" | "slate";
}) {
  const palette: Record<string, string> = {
    emerald: "bg-emerald-600/95 text-white",
    rose: "bg-rose-600/95 text-white",
    amber: "bg-amber-600/95 text-white",
    cyan: "bg-cyan-600/95 text-white",
    slate: "bg-slate-700/95 text-white",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette[color]}`}
    >
      {children}
    </span>
  );
}
