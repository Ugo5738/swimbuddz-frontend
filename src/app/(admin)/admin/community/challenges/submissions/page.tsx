"use client";

/**
 * Admin review queue for challenge submissions.
 *
 * Lists every pending submission across all challenges, with the proof
 * media inlined so the admin can review without leaving the page. Approve
 * → triggers backend badge-award (Bubbles + volunteer-hours grants land
 * in Phase 7). Reject → captures an optional note that surfaces to the
 * member.
 *
 * "Mark winner" is exposed inline for competition-format challenges from
 * any approved submission — driven by PATCHing winner_submission_id on
 * the parent challenge.
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { getCurrentAccessToken } from "@/lib/auth";
import {
  Challenge,
  ChallengeSubmission,
  isVideoUrl,
  listSubmissions,
  markSubmissionAsWinner,
  reviewSubmission,
} from "@/lib/challenges";
import { apiEndpoints } from "@/lib/config";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "pending" | "approved" | "rejected";

export default function ChallengeSubmissionReviewPage() {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [challengesById, setChallengesById] = useState<
    Record<string, Challenge>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const [reviewModal, setReviewModal] = useState<{
    submission: ChallengeSubmission;
    action: "approved" | "rejected";
  } | null>(null);

  const load = useCallback(
    async (
      tabToLoad: Tab,
      mode: "initial" | "refresh" = "initial",
    ) => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        // Pending count is shown on the tab regardless of which tab is
        // currently displayed, so fetch it alongside the active list. When
        // the active tab IS pending, reuse the result to avoid a second call.
        const [activeSubs, pending] = await Promise.all([
          listSubmissions(tabToLoad),
          tabToLoad === "pending"
            ? Promise.resolve(null)
            : listSubmissions("pending"),
        ]);
        setSubmissions(activeSubs);
        setPendingCount(
          tabToLoad === "pending" ? activeSubs.length : pending!.length,
        );

        // Fetch each unique challenge once for context (title, badge, etc.)
        const uniqueChallengeIds = [
          ...new Set(activeSubs.map((s) => s.challenge_id)),
        ];
        const fetched: Record<string, Challenge> = { ...challengesById };
        const token = await getCurrentAccessToken();
        await Promise.all(
          uniqueChallengeIds
            .filter((id) => !fetched[id])
            .map(async (id) => {
              const res = await fetch(`${apiEndpoints.challenges}/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (res.ok) {
                fetched[id] = (await res.json()) as Challenge;
              }
            }),
        );
        setChallengesById(fetched);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // challengesById intentionally not in deps — we read latest via
    // closure but want the same callback identity to avoid infinite re-loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    load(tab, "initial");
  }, [tab, load]);

  // The list is now the server-side filtered result; no further client filter.
  const filtered = submissions;

  const handleReviewSubmit = async (note: string) => {
    if (!reviewModal) return;
    const { submission, action } = reviewModal;
    try {
      await reviewSubmission(submission.id, action, note || undefined);
      setReviewModal(null);
      // Drop the reviewed item from the local list optimistically when on
      // the pending tab (it just stopped being pending). For approved /
      // rejected views the row stays but its status changes — refresh
      // either way to fetch fresh data.
      if (tab === "pending") {
        setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
      }
      load(tab, "refresh");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Review failed");
    }
  };

  const handleMarkWinner = async (submission: ChallengeSubmission) => {
    if (
      !confirm(
        "Mark this submission as the winner of the challenge? The team will receive a notification.",
      )
    )
      return;
    try {
      await markSubmissionAsWinner(submission.id);
      load(tab, "refresh");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark winner");
    }
  };

  if (loading) return <LoadingPage text="Loading submissions..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <Link
        href="/admin/community/challenges"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to challenges
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Submission Review
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Approve or reject member attempts. Approved submissions earn the
            badge instantly; Bubbles &amp; volunteer-hours grants land later.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => load(tab, "refresh")}
          className="flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            { key: "pending", label: `Pending (${pendingCount})` },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            {tab === "pending"
              ? "No submissions waiting for review"
              : tab === "approved"
                ? "No approved submissions yet."
                : "No rejected submissions yet."}
          </h3>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              challenge={challengesById[sub.challenge_id]}
              onApprove={() =>
                setReviewModal({ submission: sub, action: "approved" })
              }
              onReject={() =>
                setReviewModal({ submission: sub, action: "rejected" })
              }
              onMarkWinner={() => handleMarkWinner(sub)}
            />
          ))}
        </div>
      )}

      {reviewModal && (
        <ReviewModal
          submission={reviewModal.submission}
          action={reviewModal.action}
          onCancel={() => setReviewModal(null)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission card
// ---------------------------------------------------------------------------

function SubmissionCard({
  submission,
  challenge,
  onApprove,
  onReject,
  onMarkWinner,
}: {
  submission: ChallengeSubmission;
  challenge: Challenge | undefined;
  onApprove: () => void;
  onReject: () => void;
  onMarkWinner: () => void;
}) {
  const isCompetition = challenge?.format === "competition";
  const isWinner =
    challenge && challenge.winner_submission_id === submission.id;
  const showMarkWinner =
    isCompetition && submission.status === "approved" && !isWinner;

  // Prefer the backend-resolved name; fall back to a short id if a member
  // happens to be missing from the directory (deleted/legacy etc).
  const captainName =
    submission.member_name ||
    `Member ${submission.member_id.slice(0, 8)}…`;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            {submission.challenge_title ??
              challenge?.title ??
              `Challenge ${submission.challenge_id}`}
          </p>
          <p className="text-sm text-slate-700">
            <strong>{submission.is_team_submission ? "Team" : "Solo"}</strong>{" "}
            attempt by{" "}
            <span className="font-medium text-slate-900">{captainName}</span>
          </p>
          <p className="text-xs text-slate-500">
            Submitted {new Date(submission.created_at).toLocaleString()}
          </p>
          {submission.is_team_submission && submission.members.length > 0 && (
            <p className="text-xs text-slate-600">
              Roster:{" "}
              {submission.members
                .map((m) => {
                  const name =
                    m.member_name || `Member ${m.member_id.slice(0, 8)}…`;
                  return m.role ? `${name} (${m.role})` : name;
                })
                .join(", ")}
            </p>
          )}
        </div>
        <StatusBadge status={submission.status} isWinner={isWinner ?? false} />
      </div>

      {submission.submission_note && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Member note
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            {submission.submission_note}
          </p>
        </div>
      )}

      {submission.proof_media.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {submission.proof_media.map((m) => {
            const url = m.thumbnail_url || m.file_url;
            if (!url) return null;
            return (
              <div
                key={m.id ?? m.media_id}
                className="overflow-hidden rounded-md border border-slate-200"
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
                  <img
                    src={url}
                    alt="Proof"
                    className="aspect-video w-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm italic text-slate-500">
          No proof media attached.
        </p>
      )}

      {submission.review_note && submission.status !== "pending" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="text-xs font-semibold uppercase tracking-wider">
            Review note
          </p>
          <p className="mt-1 whitespace-pre-wrap">{submission.review_note}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {showMarkWinner && (
          <Button
            type="button"
            onClick={onMarkWinner}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            <Trophy className="h-4 w-4" />
            Mark as winner
          </Button>
        )}
        {submission.status === "pending" && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={onReject}
              className="text-red-600 hover:bg-red-50"
            >
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="mr-1 h-4 w-4" />
              Approve
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({
  status,
  isWinner,
}: {
  status: ChallengeSubmission["status"];
  isWinner: boolean;
}) {
  if (isWinner) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Trophy className="h-3 w-3" />
        Winner
      </span>
    );
  }
  const palette: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${palette[status]}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Review modal — captures an optional note before submitting the verdict
// ---------------------------------------------------------------------------

function ReviewModal({
  submission,
  action,
  onCancel,
  onSubmit,
}: {
  submission: ChallengeSubmission;
  action: "approved" | "rejected";
  onCancel: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(note);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={action === "approved" ? "Approve submission" : "Reject submission"}
    >
      <form onSubmit={handle} className="space-y-4">
        <p className="text-sm text-slate-600">
          {action === "approved"
            ? "The member will earn the badge immediately."
            : "The member will be notified that their attempt was rejected."}
        </p>
        <Textarea
          label={
            action === "approved"
              ? "Note to the member (optional)"
              : "Reason for rejection (optional but recommended)"
          }
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            action === "approved"
              ? "e.g. Great form on the bottle balance — well done!"
              : "e.g. Bottle slipped off at the 25m mark — try again."
          }
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className={
              action === "approved"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : action === "approved" ? (
              "Approve"
            ) : (
              "Reject"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
