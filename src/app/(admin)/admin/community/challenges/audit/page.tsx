"use client";

/**
 * Admin Challenge Audit page.
 *
 * Lets SwimBuddz HQ inspect approvals across all clubs after delegated
 * review (Phase 8b) shipped, and revoke any approval that doesn't meet
 * the bar. Filterable by reviewer kind (HQ vs Pod Lead) and live-vs-
 * revoked. The default view answers the most common question:
 *
 *   "What did Pod Leads approve in the last week, and was anything off?"
 *
 * Hits GET /challenges/submissions/list with new filters added in this
 * milestone (reviewed_by_kind, revoked). Uses the existing
 * revokeSubmission helper for the override action.
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
  ReviewerKind,
  revokeSubmission,
} from "@/lib/challenges";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RevokedFilter = "exclude" | "only" | "all";
type KindFilter = ReviewerKind | "all";

export default function ChallengeAuditPage() {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters. Defaults are tuned for "what did Pod Leads approve recently?"
  const [kindFilter, setKindFilter] = useState<KindFilter>("pod_lead");
  const [revokedFilter, setRevokedFilter] = useState<RevokedFilter>("exclude");
  const [windowDays, setWindowDays] = useState<number>(14);

  const [revokeModal, setRevokeModal] = useState<ChallengeSubmission | null>(
    null,
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listSubmissions({
          status: "approved",
          reviewedByKind: kindFilter === "all" ? undefined : kindFilter,
          revoked: revokedFilter === "all" ? undefined : revokedFilter,
        });
        setSubmissions(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kindFilter, revokedFilter],
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  // Date-window filter is applied client-side so changing it doesn't
  // round-trip the network. The list is small enough (recent
  // approvals) that this is fine without pagination.
  const visible = useMemo(() => {
    if (!submissions) return [];
    const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return submissions
      .filter((s) => {
        const stamp = s.reviewed_at ? new Date(s.reviewed_at).getTime() : 0;
        return stamp >= cutoffMs;
      })
      .sort((a, b) => {
        const aT = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
        const bT = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
        return bT - aT;
      });
  }, [submissions, windowDays]);

  const handleRevoke = async (note: string) => {
    if (!revokeModal) return;
    try {
      await revokeSubmission(revokeModal.id, note);
      setRevokeModal(null);
      load("refresh");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Revoke failed");
    }
  };

  if (loading) return <LoadingPage text="Loading audit log..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <Link
        href="/admin/community/challenges"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to challenges
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
            <Shield className="h-3.5 w-3.5" />
            HQ Oversight
          </p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Approval Audit
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Recent approvals across every club, filterable by who approved
            them. Revoke any approval that didn't meet the bar — the badge
            comes off the member's profile and they're notified, but the
            audit trail (original reviewer, timestamp, original note) is
            preserved.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => load("refresh")}
          className="flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>

      {/* Filter bar */}
      <Card className="space-y-4 p-4">
        <FilterRow
          label="Reviewer"
          value={kindFilter}
          onChange={(v) => setKindFilter(v as KindFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "pod_lead", label: "Pod Lead" },
            { value: "assistant_pod_lead", label: "Assistant Pod Lead" },
            { value: "admin", label: "SwimBuddz HQ" },
          ]}
        />
        <FilterRow
          label="State"
          value={revokedFilter}
          onChange={(v) => setRevokedFilter(v as RevokedFilter)}
          options={[
            { value: "exclude", label: "Live approvals" },
            { value: "only", label: "Revoked only" },
            { value: "all", label: "All (incl. revoked)" },
          ]}
        />
        <FilterRow
          label="Window"
          value={String(windowDays)}
          onChange={(v) => setWindowDays(Number(v))}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "14", label: "Last 14 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
            { value: "365", label: "Last year" },
          ]}
        />
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="text-sm text-slate-500">
        Showing {visible.length} approval{visible.length === 1 ? "" : "s"}
        {kindFilter !== "all" && ` from ${labelForKind(kindFilter)}`}
        {revokedFilter === "only" && " — revoked only"}
        {revokedFilter === "all" && " (live + revoked)"}
        {` in the last ${windowDays} day${windowDays === 1 ? "" : "s"}`}
      </p>

      {visible.length === 0 ? (
        <Card className="py-12 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nothing matches your filters
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Try widening the date window or switching the reviewer filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <AuditRow
              key={s.id}
              submission={s}
              onRevoke={() => setRevokeModal(s)}
            />
          ))}
        </div>
      )}

      {revokeModal && (
        <RevokeModal
          submission={revokeModal}
          onCancel={() => setRevokeModal(null)}
          onSubmit={handleRevoke}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value === o.value
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditRow({
  submission,
  onRevoke,
}: {
  submission: ChallengeSubmission;
  onRevoke: () => void;
}) {
  const isRevoked = submission.revoked_at !== null;
  const captainName =
    submission.member_name || `Member ${submission.member_id.slice(0, 8)}…`;
  const reviewedAt = submission.reviewed_at
    ? new Date(submission.reviewed_at).toLocaleString()
    : "—";
  const revokedAt = submission.revoked_at
    ? new Date(submission.revoked_at).toLocaleString()
    : null;

  return (
    <Card
      className={`space-y-3 p-4 ${
        isRevoked ? "border-rose-200 bg-rose-50/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            {submission.challenge_title ??
              `Challenge ${submission.challenge_id.slice(0, 8)}…`}
          </p>
          <p className="text-sm text-slate-700">
            <strong>{submission.is_team_submission ? "Team" : "Solo"}</strong>{" "}
            attempt by{" "}
            <span className="font-medium text-slate-900">{captainName}</span>
          </p>
          <p className="text-xs text-slate-500">
            Approved {reviewedAt}
            {submission.reviewed_by_kind &&
              ` by ${labelForKind(submission.reviewed_by_kind)}`}
          </p>
          {isRevoked && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              Revoked {revokedAt}
            </div>
          )}
        </div>
        {!isRevoked && (
          <Button
            type="button"
            variant="secondary"
            onClick={onRevoke}
            className="text-rose-600 hover:bg-rose-50"
          >
            Revoke
          </Button>
        )}
      </div>

      {/* Original member note (only relevant for context, not a primary
          surface — keep it small to favour the proof media instead). */}
      {submission.submission_note && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold">Member note:</span>{" "}
          {submission.submission_note}
        </p>
      )}

      {/* Inline proof media — primary signal for spot-checking. */}
      {submission.proof_media.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {submission.proof_media.slice(0, 2).map((m) => {
            const url = m.thumbnail_url || m.file_url;
            if (!url) return null;
            return (
              <div
                key={m.id ?? m.media_id}
                className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200"
              >
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-slate-900"
                  />
                ) : (
                  <Image
                    src={url}
                    alt="Proof"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Original review note + revoke note, side-by-side for context. */}
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        {submission.review_note && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            <p className="font-semibold uppercase tracking-wider">
              Original review note
            </p>
            <p className="mt-1 whitespace-pre-wrap">{submission.review_note}</p>
          </div>
        )}
        {submission.revoke_note && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
            <p className="font-semibold uppercase tracking-wider">
              Revoke reason
            </p>
            <p className="mt-1 whitespace-pre-wrap">{submission.revoke_note}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function RevokeModal({
  submission,
  onCancel,
  onSubmit,
}: {
  submission: ChallengeSubmission;
  onCancel: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = note.trim().length >= 5;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      await onSubmit(note.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title="Revoke approval">
      <form onSubmit={handle} className="space-y-4">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <p className="font-semibold">This is a hard override.</p>
          <ul className="mt-1 list-disc pl-4 text-xs">
            <li>The badge comes off the member's profile.</li>
            <li>The member receives a notification with your reason.</li>
            <li>
              Bubbles / volunteer-hours grants are <em>not</em> automatically
              clawed back — handle those via the wallet adjust UI if needed.
            </li>
            <li>
              The audit trail (original reviewer + timestamp + note) stays
              intact.
            </li>
          </ul>
        </div>
        <Textarea
          label="Reason (visible to the member)"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Bottle was tipped at the 15m mark; full distance not held."
        />
        <p className="text-xs text-slate-500">
          Minimum 5 characters. The member sees this verbatim, so be specific
          and constructive.
        </p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!valid || submitting}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Revoke approval"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function labelForKind(kind: ReviewerKind | "all"): string {
  switch (kind) {
    case "admin":
      return "SwimBuddz HQ";
    case "pod_lead":
      return "Pod Lead";
    case "assistant_pod_lead":
      return "Assistant Pod Lead";
    case "all":
    default:
      return "all reviewers";
  }
}
