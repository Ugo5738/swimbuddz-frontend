"use client";

/**
 * Public challenges landing page.
 *
 * Anonymous viewers see all challenges with `is_public = true`. The page
 * surfaces both currently-running and recently-finished challenges; for
 * competitions that have a designated winner, the winner's display name
 * (and optionally their proof media) appears on the detail page.
 *
 * No auth required. Hits `GET /api/v1/challenges/public/all` directly.
 */

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  isVideoUrl,
  listPublicChallenges,
  PublicChallenge,
} from "@/lib/challenges";
import { Calendar, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FilterTab = "active" | "finished" | "all";

export default function PublicChallengesPage() {
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicChallenges("all")
      .then((data) => {
        if (!cancelled) setChallenges(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return challenges;
    if (tab === "active")
      return challenges.filter((c) => !c.is_finished);
    return challenges.filter((c) => c.is_finished);
  }, [challenges, tab]);

  if (loading) return <LoadingPage text="Loading challenges..." />;

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Challenges
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          Take on a challenge, earn the badge — sometimes a winner walks away
          with the bragging rights too.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <FilterTabs value={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {tab === "finished"
              ? "No finished challenges yet"
              : tab === "active"
                ? "No challenges running right now"
                : "No challenges yet"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Check back soon — new challenges drop regularly.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <PublicChallengeTile key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterTab;
  onChange: (v: FilterTab) => void;
}) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Running" },
    { key: "finished", label: "Finished" },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === t.key
              ? "bg-cyan-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function PublicChallengeTile({ challenge }: { challenge: PublicChallenge }) {
  const lead = challenge.example_media[0];
  const previewUrl = lead?.thumbnail_url || lead?.file_url || null;
  const finishedWithWinner = challenge.is_finished && challenge.winner;

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="group block"
    >
      <Card className="flex h-full flex-col overflow-hidden p-0 transition-shadow group-hover:shadow-md">
        <div className="relative aspect-video bg-slate-100">
          {previewUrl ? (
            isVideoUrl(previewUrl) ? (
              <video
                src={previewUrl}
                muted
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
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Trophy className="h-10 w-10" />
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
            {challenge.team_enabled && <Tag color="amber">Team</Tag>}
          </div>
        </div>
        <div className="flex-1 space-y-2 p-4">
          <h3 className="line-clamp-2 font-semibold text-slate-900">
            {challenge.title}
          </h3>
          {challenge.description && (
            <p className="line-clamp-2 text-sm text-slate-600">
              {challenge.description}
            </p>
          )}

          {finishedWithWinner ? (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              <span aria-hidden>🏆</span>
              <span>
                Winner:{" "}
                <strong className="font-semibold">
                  {challenge.winner!.captain_name}
                </strong>
                {challenge.winner!.is_team_submission &&
                challenge.winner!.teammate_names.length > 0
                  ? ` & ${challenge.winner!.teammate_names.length} teammate${
                      challenge.winner!.teammate_names.length === 1 ? "" : "s"
                    }`
                  : ""}
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>🏅 {challenge.badge_name}</span>
            {challenge.ends_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {challenge.is_finished
                  ? `Ended ${new Date(challenge.ends_at).toLocaleDateString()}`
                  : `Ends ${new Date(challenge.ends_at).toLocaleDateString()}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.completion_count} earned
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "rose" | "amber" | "slate";
}) {
  const palette: Record<string, string> = {
    emerald: "bg-emerald-600/90 text-white",
    rose: "bg-rose-600/90 text-white",
    amber: "bg-amber-600/90 text-white",
    slate: "bg-slate-700/90 text-white",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette[color]}`}
    >
      {children}
    </span>
  );
}
