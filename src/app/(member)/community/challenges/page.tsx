"use client";

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  Challenge,
  ChallengeSubmission,
  ChallengeType,
  isVideoUrl,
  listChallenges,
  listMySubmissions,
  SubmissionStatus,
} from "@/lib/challenges";
import { Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TYPE_LABELS: Record<ChallengeType, string> = {
  time_trial: "Time Trial",
  attendance: "Attendance",
  distance: "Distance",
  technique: "Technique",
};

// Roll the member's submissions for a single challenge into a current
// status — the freshest submission (created_at desc) wins. Approved trumps
// everything: once approved, the chip stays "Earned" even if they
// re-attempt.
function deriveMyStatus(
  subs: ChallengeSubmission[],
): SubmissionStatus | null {
  if (subs.length === 0) return null;
  if (subs.some((s) => s.status === "approved")) return "approved";
  // Sort by created_at desc (newest first) and pick that status.
  const newest = [...subs].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  return newest.status;
}

export default function MemberChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [statusByChallengeId, setStatusByChallengeId] = useState<
    Record<string, SubmissionStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChallengeType | "all">("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Run in parallel — the status fetch is best-effort, so a failure
        // on /submissions/mine shouldn't block the listing.
        const [challengeData, mySubsResult] = await Promise.allSettled([
          listChallenges({ activeOnly: true }),
          listMySubmissions(),
        ]);

        if (cancelled) return;

        if (challengeData.status === "fulfilled") {
          setChallenges(challengeData.value);
        } else {
          setError(
            challengeData.reason instanceof Error
              ? challengeData.reason.message
              : "Failed to load",
          );
        }

        if (mySubsResult.status === "fulfilled") {
          const byChallenge: Record<string, ChallengeSubmission[]> = {};
          for (const sub of mySubsResult.value) {
            (byChallenge[sub.challenge_id] ||= []).push(sub);
          }
          const map: Record<string, SubmissionStatus> = {};
          for (const [id, subs] of Object.entries(byChallenge)) {
            const s = deriveMyStatus(subs);
            if (s) map[id] = s;
          }
          setStatusByChallengeId(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return challenges;
    return challenges.filter((c) => c.challenge_type === filter);
  }, [challenges, filter]);

  if (loading) return <LoadingPage text="Loading challenges..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Challenges
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          Take on a challenge, submit your attempt, earn the badge.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <FilterBar value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No active challenges
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Check back soon — new challenges drop regularly.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ChallengeTile
              key={c.id}
              challenge={c}
              myStatus={statusByChallengeId[c.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  value,
  onChange,
}: {
  value: ChallengeType | "all";
  onChange: (v: ChallengeType | "all") => void;
}) {
  const tabs: { key: ChallengeType | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "time_trial", label: "Time Trial" },
    { key: "attendance", label: "Attendance" },
    { key: "distance", label: "Distance" },
    { key: "technique", label: "Technique" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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

function relativeEnds(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 14) return `Ends in ${Math.floor(days / 7)} wks`;
  if (days >= 1) return `Ends in ${days} day${days === 1 ? "" : "s"}`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs >= 1) return `Ends in ${hrs} hr${hrs === 1 ? "" : "s"}`;
  return "Ends soon";
}

function ChallengeTile({
  challenge,
  myStatus,
}: {
  challenge: Challenge;
  myStatus: SubmissionStatus | null;
}) {
  const lead = challenge.example_media[0];
  const previewUrl = lead?.thumbnail_url || lead?.file_url || null;
  const isFinished = challenge.ends_at
    ? new Date(challenge.ends_at) < new Date()
    : false;

  return (
    <Link
      href={`/community/challenges/${challenge.id}`}
      className="group block h-full"
    >
      <Card className="flex h-full flex-col overflow-hidden p-0 ring-1 ring-white/5 transition-all group-hover:ring-cyan-500/40 group-hover:shadow-lg">
        {/* Media preview area — when no example media is uploaded we render
            a richer themed placeholder rather than just a tiny icon. */}
        <div className="relative aspect-video overflow-hidden bg-slate-100">
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
              <Image
                src={previewUrl}
                alt={challenge.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/10 via-slate-900 to-amber-500/10">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                  <Trophy className="h-7 w-7" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {TYPE_LABELS[challenge.challenge_type]}
                </p>
              </div>
            </div>
          )}

          {/* Top-left chip stack — type + format + team */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <Tag color="cyan">{TYPE_LABELS[challenge.challenge_type]}</Tag>
            {challenge.format === "competition" && (
              <Tag color="rose">Competition</Tag>
            )}
            {challenge.team_enabled && <Tag color="amber">Team</Tag>}
          </div>

          {/* Top-right end-date pill (only when there is an end date) */}
          {challenge.ends_at && (
            <div className="absolute right-2 top-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isFinished
                    ? "bg-slate-700/90 text-slate-200"
                    : "bg-emerald-600/90 text-white"
                }`}
              >
                {isFinished ? "Ended" : relativeEnds(challenge.ends_at)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 flex-1 font-semibold text-slate-900">
              {challenge.title}
            </h3>
            {myStatus && <MyStatusBadge status={myStatus} />}
          </div>
          {challenge.description && (
            <p className="line-clamp-2 text-sm text-slate-600">
              {challenge.description}
            </p>
          )}

          {/* Reward strip — denser layout w/ icons rather than emoji-only */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              🏅 {challenge.badge_name}
            </span>
            {challenge.reward_bubbles_amount != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 font-medium text-cyan-700">
                💧 {challenge.reward_bubbles_amount}
              </span>
            )}
            {challenge.reward_volunteer_hours != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
                ⏱ {challenge.reward_volunteer_hours} hr
              </span>
            )}
          </div>

          {/* Bottom meta row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.completion_count} earned
            </span>
            <span className="text-cyan-600 group-hover:text-cyan-700">
              View →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function MyStatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg: Record<
    SubmissionStatus,
    { label: string; classes: string }
  > = {
    pending: {
      label: "⏳ Pending",
      classes: "bg-amber-100 text-amber-700",
    },
    approved: {
      label: "✓ Earned",
      classes: "bg-emerald-100 text-emerald-700",
    },
    rejected: {
      label: "× Try again",
      classes: "bg-rose-100 text-rose-700",
    },
  };
  const c = cfg[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.classes}`}
    >
      {c.label}
    </span>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "cyan" | "rose" | "amber" | "emerald";
}) {
  const palette: Record<string, string> = {
    cyan: "bg-cyan-600/90 text-white",
    rose: "bg-rose-600/90 text-white",
    amber: "bg-amber-600/90 text-white",
    emerald: "bg-emerald-600/90 text-white",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette[color]}`}
    >
      {children}
    </span>
  );
}
