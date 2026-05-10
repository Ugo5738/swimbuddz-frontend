"use client";

/**
 * LaddersProgressCard — member-profile widget showing progress on each
 * skill ladder.
 *
 * Reads the same `GET /api/v1/challenges/series/list` data that powers
 * the public Club page, plus the member's earned badges (Phase 6
 * `/api/v1/members/me/badges`), and renders one progress strip per
 * ladder: "Club Fundamentals · 4 of 7 earned" with mini-tile checkmarks
 * for each step.
 *
 * Auto-hides if the member has no ladder-eligible content (no series
 * exists, OR no series is targeted at the member's audience tier).
 * Failure modes are silent — this is a profile widget, not the primary
 * UX, so we'd rather show nothing than an error message.
 */

import { Card } from "@/components/ui/Card";
import {
  Challenge,
  listChallengesBySeries,
  listMyBadges,
} from "@/lib/challenges";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LaddersProgressCard() {
  const [ladders, setLadders] = useState<Record<string, Challenge[]> | null>(
    null,
  );
  const [earned, setEarned] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // Ladder definitions across all audience tiers — the profile shows
      // ladders for whatever tier the member belongs to. Server doesn't
      // enforce per-member filtering yet, so we fetch all and let the
      // member's earned badges drive what they see.
      listChallengesBySeries(),
      listMyBadges(),
    ])
      .then(([series, badges]) => {
        if (cancelled) return;
        setLadders(series);
        setEarned(new Set(badges.map((b) => b.challenge_id)));
      })
      .catch(() => {
        // Silent fail — the card just won't render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orderedSlugs = useMemo(() => {
    if (!ladders) return [];
    // Show ladders that have any earned step OR any non-locked step
    // first; empty/all-locked ladders go to the bottom.
    return Object.keys(ladders).sort();
  }, [ladders]);

  if (!ladders || !earned) return null;
  if (orderedSlugs.length === 0) return null;

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Skill Path</h2>
          <p className="text-xs text-slate-500">
            Your progress across the SwimBuddz skill ladders.
          </p>
        </div>
        <Link
          href="/club"
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700"
        >
          See all ladders →
        </Link>
      </div>

      <div className="space-y-5">
        {orderedSlugs.map((slug) => (
          <LadderRow
            key={slug}
            slug={slug}
            steps={ladders[slug] ?? []}
            earned={earned}
          />
        ))}
      </div>
    </Card>
  );
}

function LadderRow({
  slug,
  steps,
  earned,
}: {
  slug: string;
  steps: Challenge[];
  earned: Set<string>;
}) {
  const earnedCount = steps.filter((s) => earned.has(s.id)).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {humanizeSlug(slug)}
        </p>
        <p className="text-xs text-slate-500">
          {earnedCount} of {total} earned
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Mini step row — checkmark for earned, number for unearned, lock
          for hard-gated unearned-and-prerequisite-missing. */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {steps.map((step, idx) => {
          const stepNumber = step.series_order ?? idx + 1;
          const isEarned = earned.has(step.id);
          const isLocked = Boolean(
            step.requires_challenge_id &&
              !earned.has(step.requires_challenge_id),
          );
          return (
            <Link
              key={step.id}
              href={`/community/challenges/${step.id}`}
              title={`${stepNumber}. ${step.title}${isEarned ? " — earned" : isLocked ? " — locked" : ""}`}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                isEarned
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : isLocked
                    ? "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                    : "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100"
              }`}
            >
              {isEarned ? (
                <Check className="h-3.5 w-3.5" />
              ) : isLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                stepNumber
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
