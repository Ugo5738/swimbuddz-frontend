"use client";

/**
 * Pod Lead review queue (Phase 8b).
 *
 * Member-side counterpart to the SwimBuddz HQ admin review queue. Pod
 * Leads (and Assistant Pod Leads) see ONLY submissions from members
 * currently assigned to a pod they lead, and can only review
 * non-competition challenges. Both rules are enforced by the backend —
 * this page just presents what comes back.
 *
 * Auto-redirects to the dashboard if the current member doesn't lead
 * any pods (i.e. they shouldn't be on this page).
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  ChallengeSubmission,
  isVideoUrl,
  listSubmissions,
  reviewSubmission,
  SubmissionListStatus,
} from "@/lib/challenges";
import { listPodsILead, podDisplayName, PodSummary } from "@/lib/pods";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Tab = SubmissionListStatus extends infer T
  ? T extends "all"
    ? never
    : T
  : never; // "pending" | "approved" | "rejected"

export default function PodLeadReviewPage() {
  const router = useRouter();

  const [pods, setPods] = useState<PodSummary[] | null>(null);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewModal, setReviewModal] = useState<{
    submission: ChallengeSubmission;
    action: "approved" | "rejected";
  } | null>(null);

  // First load: confirm the user actually leads at least one pod. If not,
  // bounce them back to the dashboard so they can't reach a queue that
  // would be permanently empty for them.
  useEffect(() => {
    let cancelled = false;
    listPodsILead()
      .then((data) => {
        if (cancelled) return;
        if (data.length === 0) {
          router.replace("/account");
          return;
        }
        setPods(data);
      })
      .catch(() => {
        if (!cancelled) setPods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(
    async (tabToLoad: Tab, mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Once we know the user leads pods, load the queue.
  useEffect(() => {
    if (pods && pods.length > 0) load(tab, "initial");
  }, [pods, tab, load]);

  const handleReviewSubmit = async (note: string) => {
    if (!reviewModal) return;
    const { submission, action } = reviewModal;
    try {
      await reviewSubmission(submission.id, action, note || undefined);
      setReviewModal(null);
      // Optimistically remove on the pending tab; refresh keeps counts honest.
      if (tab === "pending") {
        setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
      }
      load(tab, "refresh");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Review failed");
    }
  };

  if (pods === null) {
    return <LoadingPage text="Checking your pod-lead status..." />;
  }
  if (pods.length === 0) {
    // Already navigating away in the effect; show nothing in the meantime.
    return null;
  }
  if (loading) return <LoadingPage text="Loading submissions..." />;

  const podsLine = pods.map(podDisplayName).join(", ");

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4 md:py-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Pod Lead Tools
          </p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Submission Review
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <Users className="h-3.5 w-3.5" />
            Reviewing for: <span className="font-medium">{podsLine}</span>
          </p>
          <p className="text-xs text-slate-500">
            You'll only see submissions from your pod members. Competition
            challenges are reviewed by SwimBuddz HQ — those won't appear here.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => load(tab, "refresh")}
          className="flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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

      {submissions.length === 0 ? (
        <Card className="py-12 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            {tab === "pending"
              ? "No submissions waiting for your review"
              : tab === "approved"
                ? "No approved submissions yet."
                : "No rejected submissions yet."}
          </h3>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <PodLeadSubmissionCard
              key={sub.id}
              submission={sub}
              onApprove={() =>
                setReviewModal({ submission: sub, action: "approved" })
              }
              onReject={() =>
                setReviewModal({ submission: sub, action: "rejected" })
              }
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

function PodLeadSubmissionCard({
  submission,
  onApprove,
  onReject,
}: {
  submission: ChallengeSubmission;
  onApprove: () => void;
  onReject: () => void;
}) {
  const captainName =
    submission.member_name || `Member ${submission.member_id.slice(0, 8)}…`;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            {submission.challenge_title ??
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
        <StatusPill status={submission.status} />
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
        <p className="text-sm italic text-slate-500">No proof media attached.</p>
      )}

      {submission.review_note && submission.status !== "pending" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="text-xs font-semibold uppercase tracking-wider">
            Your earlier review note
          </p>
          <p className="mt-1 whitespace-pre-wrap">{submission.review_note}</p>
        </div>
      )}

      {submission.status === "pending" && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
        </div>
      )}
    </Card>
  );
}

function StatusPill({ status }: { status: ChallengeSubmission["status"] }) {
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
            ? `${submission.member_name ?? "The member"} will earn the badge immediately and receive a notification.`
            : `${submission.member_name ?? "The member"} will be notified that their attempt wasn't approved this time.`}
        </p>
        <Textarea
          label={
            action === "approved"
              ? "Note (optional)"
              : "Reason (optional but recommended)"
          }
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            action === "approved"
              ? "e.g. Great form on the back sculling — well done!"
              : "e.g. Bottle slipped at the wall — try again."
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
