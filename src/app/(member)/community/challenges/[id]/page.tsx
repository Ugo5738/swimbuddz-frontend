"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import {
  Challenge,
  ChallengeSubmission,
  isVideoUrl,
  getChallenge,
  listMySubmissions,
} from "@/lib/challenges";
import { Calendar, ChevronRight, Trophy, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitForm } from "./SubmitForm";

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

// (Instructions are stored as a stringified BlockNote JSON document; the
// BlockViewer component accepts the raw string and handles parsing.)

export default function MemberChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [mySubs, setMySubs] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Initial load: fetch the challenge + the member's prior attempts in
  // parallel. Past attempts are best-effort — a 401 here just means the
  // user isn't signed in, which we tolerate (they can still read).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [c, mine] = await Promise.allSettled([
          getChallenge(params.id),
          listMySubmissions(params.id),
        ]);
        if (cancelled) return;
        if (c.status === "fulfilled") {
          setChallenge(c.value);
        } else {
          setError(
            c.reason instanceof Error ? c.reason.message : "Failed to load",
          );
        }
        if (mine.status === "fulfilled") {
          setMySubs(mine.value);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
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
          href="/community/challenges"
          className="mt-4 inline-block text-sm text-cyan-600 hover:underline"
        >
          Back to challenges
        </Link>
      </div>
    );
  }

  const handleSubmitDone = (message: string) => {
    setShowSubmit(false);
    setSubmitSuccess(message);
    // Refresh challenge + my submissions so counts and the past-attempts
    // panel reflect the new entry immediately.
    void getChallenge(params.id).then(setChallenge).catch(() => undefined);
    void listMySubmissions(params.id).then(setMySubs).catch(() => undefined);
  };

  // The newest submission's status drives whether we let the member open
  // the submit modal. The backend blocks "pending or approved" anyway, but
  // hiding the button is a kinder UX.
  const newestSub = mySubs.length
    ? [...mySubs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    : null;
  const hasPendingOrApproved =
    newestSub?.status === "pending" || newestSub?.status === "approved";

  const hasInstructions = !!(challenge.instructions && challenge.instructions.trim());

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-slate-500"
      >
        <Link
          href="/community/challenges"
          className="hover:text-cyan-600"
        >
          Challenges
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="truncate text-slate-700">{challenge.title}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="cyan">{challenge.challenge_type.replace("_", " ")}</Tag>
          {challenge.format === "competition" ? (
            <Tag color="rose">Competition — admin picks one winner</Tag>
          ) : (
            <Tag color="emerald">Participatory — earn the badge</Tag>
          )}
          {challenge.team_enabled && (
            <Tag color="amber">
              Team{" "}
              {challenge.team_min_size || challenge.team_max_size
                ? `(${challenge.team_min_size ?? 1}–${challenge.team_max_size ?? "∞"})`
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
          <span className="inline-flex items-center gap-1">
            🏅 {challenge.badge_name}
          </span>
          {challenge.reward_bubbles_amount != null && (
            <span>💧 {challenge.reward_bubbles_amount} Bubbles</span>
          )}
          {challenge.reward_volunteer_hours != null && (
            <span>⏱ {challenge.reward_volunteer_hours} volunteer hours</span>
          )}
          {challenge.ends_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Ends {new Date(challenge.ends_at).toLocaleString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {challenge.completion_count} earned
          </span>
        </div>
      </header>

      {submitSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {submitSuccess}
        </div>
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
                      <img
                        src={url}
                        alt={m.caption || challenge.title}
                        className="aspect-video w-full object-cover"
                      />
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

      {/* Past-attempts panel — only visible when the member has previously
          submitted to this challenge. */}
      {mySubs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Your attempts
          </h2>
          <Card className="space-y-3 p-4">
            {mySubs
              .slice()
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((sub, idx) => (
                <PastAttemptRow key={sub.id} sub={sub} isLatest={idx === 0} />
              ))}
          </Card>
        </section>
      )}

      <section className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        {hasPendingOrApproved ? (
          <div className="flex flex-col items-start gap-1">
            <Button disabled variant="secondary">
              {newestSub?.status === "approved"
                ? "✓ You earned this badge"
                : "⏳ Attempt under review"}
            </Button>
            <p className="text-xs text-slate-500">
              {newestSub?.status === "approved"
                ? "Congrats — your badge is on your profile."
                : "We'll notify you when an admin reviews it."}
            </p>
          </div>
        ) : (
          <Button
            onClick={() => {
              setSubmitSuccess(null);
              setShowSubmit(true);
            }}
          >
            {mySubs.length > 0 ? "Try again" : "Submit my attempt"}
          </Button>
        )}
        <Button variant="secondary" onClick={() => router.push("/community/challenges")}>
          Back to challenges
        </Button>
      </section>

      <Modal
        isOpen={showSubmit}
        onClose={() => setShowSubmit(false)}
        title={`Submit attempt: ${challenge.title}`}
      >
        <SubmitForm challenge={challenge} onSuccess={handleSubmitDone} />
      </Modal>
    </div>
  );
}

function PastAttemptRow({
  sub,
  isLatest,
}: {
  sub: ChallengeSubmission;
  isLatest: boolean;
}) {
  const statusPalette: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  const statusLabel: Record<string, string> = {
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPalette[sub.status]}`}
          >
            {statusLabel[sub.status]}
          </span>
          {isLatest && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Latest
            </span>
          )}
          {sub.is_team_submission && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Team
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Submitted {new Date(sub.created_at).toLocaleString()}
          {sub.reviewed_at && (
            <>
              {" · "}reviewed {new Date(sub.reviewed_at).toLocaleString()}
            </>
          )}
        </p>
        {sub.review_note && (
          <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
            <span className="font-semibold">Reviewer note:</span>{" "}
            {sub.review_note}
          </p>
        )}
      </div>
      {sub.proof_media[0]?.thumbnail_url && (
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded">
          {isVideoUrl(sub.proof_media[0].file_url) ? (
            <video
              src={sub.proof_media[0].file_url ?? undefined}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={sub.proof_media[0].thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
    </div>
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
    cyan: "bg-cyan-100 text-cyan-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${palette[color]}`}
    >
      {children}
    </span>
  );
}
