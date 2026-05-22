"use client";

/**
 * Public challenge detail page — anonymous viewing of a single challenge,
 * including the winner reveal for finished competitions.
 *
 * Privacy:
 *   - The backend already short-forms the winner's name to "First L.".
 *   - Proof media is only included by the backend when the challenge has
 *     show_winner_media_publicly = true; otherwise we just show the name.
 *
 * Auth:
 *   - None required. Logged-in members coming from the marketing page
 *     get a "Sign in to enter" CTA pointing to the member-side detail.
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  getPublicChallenge,
  isVideoUrl,
  PublicChallenge,
} from "@/lib/challenges";
import { ArrowLeft, Calendar, Trophy, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const BlockViewer = dynamic(
  () =>
    import("@/components/editor/BlockViewer").then((mod) => ({
      default: mod.BlockViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
    ),
  },
);

export default function PublicChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicChallenge(params.id)
      .then((c) => {
        if (!cancelled) setChallenge(c);
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
  }, [params.id]);

  if (loading) return <LoadingPage text="Loading challenge..." />;
  if (error || !challenge) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="text-rose-600">{error || "Challenge not found"}</p>
        <Link
          href="/challenges"
          className="mt-4 inline-block text-sm text-cyan-600 hover:underline"
        >
          Back to challenges
        </Link>
      </div>
    );
  }

  const hasInstructions =
    !!(challenge.instructions && challenge.instructions.trim());

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4 md:py-8">
      <Link
        href="/challenges"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All challenges
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {challenge.is_finished ? (
            <Tag color="slate">Finished</Tag>
          ) : (
            <Tag color="emerald">Running</Tag>
          )}
          <Tag color="cyan">
            {challenge.challenge_type.replace("_", " ")}
          </Tag>
          {challenge.format === "competition" ? (
            <Tag color="rose">Competition</Tag>
          ) : (
            <Tag color="emerald-soft">Participatory</Tag>
          )}
          {challenge.team_enabled && (
            <Tag color="amber">
              Team{" "}
              {challenge.team_min_size || challenge.team_max_size
                ? `(${challenge.team_min_size ?? 1}–${
                    challenge.team_max_size ?? "∞"
                  })`
                : ""}
            </Tag>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {challenge.title}
        </h1>
        {challenge.description && (
          <p className="text-base text-slate-700">{challenge.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            {challenge.badge_image_url ? (
              <span className="relative inline-block h-4 w-4 overflow-hidden rounded-full">
                <Image
                  src={challenge.badge_image_url}
                  alt={challenge.badge_name}
                  fill
                  sizes="16px"
                  className="object-cover"
                />
              </span>
            ) : (
              <span>🏅</span>
            )}
            {challenge.badge_name}
          </span>
          {challenge.reward_bubbles_amount != null && (
            <span>💧 {challenge.reward_bubbles_amount} Bubbles</span>
          )}
          {challenge.reward_volunteer_hours != null && (
            <span>⏱ {challenge.reward_volunteer_hours} volunteer hours</span>
          )}
          {challenge.ends_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {challenge.is_finished
                ? `Ended ${new Date(challenge.ends_at).toLocaleString()}`
                : `Ends ${new Date(challenge.ends_at).toLocaleString()}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {challenge.completion_count} earned
          </span>
        </div>
      </header>

      {/* Winner reveal — competition challenges only, with a clear privacy
          line so the public knows whose name they're looking at. */}
      {challenge.format === "competition" && challenge.winner && (
        <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/40 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Winner
              </p>
              <h2 className="text-lg font-bold text-amber-900">
                {challenge.winner.captain_name}
                {challenge.winner.is_team_submission &&
                  challenge.winner.teammate_names.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-amber-700">
                      with{" "}
                      {challenge.winner.teammate_names.join(
                        challenge.winner.teammate_names.length > 2 ? ", " : " & ",
                      )}
                    </span>
                  )}
              </h2>
              {challenge.winner.proof_media.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {challenge.winner.proof_media.map((m) => {
                    const url = m.thumbnail_url || m.file_url;
                    if (!url) return null;
                    return (
                      <div
                        key={m.id ?? m.media_id}
                        className="overflow-hidden rounded-lg bg-amber-100"
                      >
                        {isVideoUrl(url) ? (
                          <video
                            src={url}
                            controls
                            playsInline
                            preload="metadata"
                            className="aspect-video w-full bg-slate-900"
                          />
                        ) : (
                          <div className="relative aspect-video w-full">
                            <Image
                              src={url}
                              alt="Winning attempt"
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {challenge.format === "competition" &&
        challenge.is_finished &&
        !challenge.winner && (
          <section className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This competition has ended — a winner hasn't been announced yet.
          </section>
        )}

      {challenge.example_media.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            What it looks like
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {challenge.example_media.map((m) => {
              const url = m.thumbnail_url || m.file_url || null;
              return (
                <Card
                  key={m.id ?? m.media_id}
                  className="overflow-hidden p-0"
                >
                  {url ? (
                    isVideoUrl(url) ? (
                      <video
                        src={url}
                        controls
                        playsInline
                        preload="metadata"
                        className="aspect-video w-full bg-slate-900"
                      />
                    ) : (
                      <div className="relative aspect-video w-full">
                        <Image
                          src={url}
                          alt={m.caption || challenge.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-300">
                      <Trophy className="h-12 w-12" />
                    </div>
                  )}
                  {m.caption && (
                    <p className="px-3 py-2 text-sm text-slate-600">
                      {m.caption}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {hasInstructions && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Instructions
          </h2>
          <Card className="p-4">
            <BlockViewer content={challenge.instructions ?? ""} />
          </Card>
        </section>
      )}

      {!challenge.is_finished && (
        <section className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm text-cyan-900">
            Want to enter? Sign in or join SwimBuddz, then head to your
            challenges feed to upload your attempt.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href={`/community/challenges/${challenge.id}`}>
              <Button>Sign in to enter</Button>
            </Link>
            <Link href="/join">
              <Button variant="secondary">Join SwimBuddz</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "emerald" | "rose" | "amber" | "cyan" | "slate" | "emerald-soft";
}) {
  const palette: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    "emerald-soft": "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
    slate: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${palette[color]}`}
    >
      {children}
    </span>
  );
}
