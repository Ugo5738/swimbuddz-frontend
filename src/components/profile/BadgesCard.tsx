"use client";

/**
 * BadgesCard — renders the authenticated member's earned challenge badges.
 *
 * Reads from `GET /api/v1/members/me/badges`. The endpoint already hydrates
 * badge_image_url so we render the artwork via next/image; falls back to a
 * generic Trophy icon when the challenge has no badge artwork.
 */

import { Card } from "@/components/ui/Card";
import { ChallengeBadgeAward, listMyBadges } from "@/lib/challenges";
import { Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function BadgesCard() {
  const [badges, setBadges] = useState<ChallengeBadgeAward[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyBadges()
      .then((data) => {
        if (!cancelled) setBadges(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load badges");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Badges</h2>
        {badges && badges.length > 0 && (
          <Link
            href="/community/challenges"
            className="text-xs font-medium text-cyan-600 hover:text-cyan-700"
          >
            More challenges →
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !badges || badges.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">
            No badges yet — pick up a challenge and earn your first.
          </p>
          <Link
            href="/community/challenges"
            className="mt-3 inline-block text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            Browse challenges →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {badges.map((b) => (
            <Link
              key={b.id}
              href={`/community/challenges/${b.challenge_id}`}
              title={`${b.badge_name} — earned ${new Date(
                b.awarded_at,
              ).toLocaleDateString()}`}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors hover:bg-cyan-50"
            >
              {b.badge_image_url ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-amber-50">
                  <Image
                    src={b.badge_image_url}
                    alt={b.badge_name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                  <Trophy className="h-6 w-6" />
                </div>
              )}
              <p className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700 group-hover:text-cyan-700">
                {b.badge_name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
