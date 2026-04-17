"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  PoolSubmissionsApi,
  type PoolSubmission,
  type PoolSubmissionStatus,
} from "@/lib/poolSubmissions";
import { ArrowLeft, Check, Mail, MapPin, Phone, Star, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const STATUS_TABS: { key: PoolSubmissionStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export default function AdminPoolSubmissionsPage() {
  const [activeTab, setActiveTab] = useState<PoolSubmissionStatus | "all">("pending");
  const [submissions, setSubmissions] = useState<PoolSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await PoolSubmissionsApi.listAll({
        status: activeTab === "all" ? undefined : activeTab,
        page,
        pageSize: PAGE_SIZE,
      });
      setSubmissions(resp.items);
      setTotal(resp.total);
    } catch (e) {
      console.error("Failed to load submissions:", e);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Link
        href="/admin/pools"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pools
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member pool submissions</h1>
        <p className="text-sm text-slate-600">
          Moderation queue for community-contributed pool suggestions. Approving creates a
          prospect pool and grants Bubbles to the submitter.
        </p>
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1 w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingCard text="Loading submissions..." />
      ) : submissions.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No submissions.</Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <SubmissionRow key={s.id} submission={s} onChange={load} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  onChange,
}: {
  submission: PoolSubmission;
  onChange: () => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rewardBubbles, setRewardBubbles] = useState(500);
  const [approveNotes, setApproveNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = submission.status === "pending";

  const handleApprove = async () => {
    setBusy(true);
    try {
      await PoolSubmissionsApi.approve(submission.id, rewardBubbles, approveNotes || undefined);
      toast.success(
        rewardBubbles > 0
          ? `Approved — ${rewardBubbles} Bubbles granted to submitter`
          : "Approved",
      );
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
      setShowApprove(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setBusy(true);
    try {
      await PoolSubmissionsApi.reject(submission.id, rejectNotes.trim());
      toast.success("Submission rejected");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
      setShowReject(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900">{submission.pool_name}</h3>
            <StatusBadge status={submission.status} />
            {submission.pool_type && (
              <Badge variant="default" className="capitalize">
                {submission.pool_type}
              </Badge>
            )}
            {submission.reward_granted && (
              <Badge variant="success">
                {submission.reward_bubbles ?? 0} Bubbles granted
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-600">
            Submitted by {submission.submitter_display_name || submission.submitter_auth_id}
            {submission.submitter_email && (
              <span className="text-slate-400"> &middot; {submission.submitter_email}</span>
            )}
            <span className="text-slate-400">
              {" "}
              &middot; {new Date(submission.created_at).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {(submission.location_area || submission.address) && (
          <div className="flex items-start gap-2 text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <div>
              {submission.location_area && (
                <div className="font-medium text-slate-700">{submission.location_area}</div>
              )}
              {submission.address && (
                <div className="text-xs text-slate-500">{submission.address}</div>
              )}
            </div>
          </div>
        )}
        {submission.contact_phone && (
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            {submission.contact_phone}
          </div>
        )}
        {submission.contact_email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            {submission.contact_email}
          </div>
        )}
        {submission.member_rating && (
          <div className="flex items-center gap-2 text-slate-600">
            <Star className="h-4 w-4 shrink-0 text-amber-400" />
            {submission.member_rating}/5
            {submission.visit_frequency && (
              <span className="text-xs text-slate-400">({submission.visit_frequency})</span>
            )}
          </div>
        )}
      </div>

      {(submission.has_changing_rooms ||
        submission.has_showers ||
        submission.has_lockers ||
        submission.has_parking ||
        submission.has_lifeguard) && (
        <div className="flex flex-wrap gap-1.5">
          {submission.has_changing_rooms && <Chip>Changing rooms</Chip>}
          {submission.has_showers && <Chip>Showers</Chip>}
          {submission.has_lockers && <Chip>Lockers</Chip>}
          {submission.has_parking && <Chip>Parking</Chip>}
          {submission.has_lifeguard && <Chip>Lifeguard</Chip>}
        </div>
      )}

      {submission.member_notes && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Member notes
          </p>
          {submission.member_notes}
        </div>
      )}

      {submission.review_notes && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
            Review notes
          </p>
          {submission.review_notes}
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {!showApprove && !showReject && (
            <>
              <Button
                size="sm"
                onClick={() => setShowApprove(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReject(true)}
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {showApprove && (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-700">Reward (Bubbles):</label>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={rewardBubbles}
                  onChange={(e) => setRewardBubbles(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Optional approval notes..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={busy}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Confirm approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowApprove(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showReject && (
            <div className="w-full space-y-2">
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection (shown to admin team)..."
                rows={2}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReject}
                  disabled={busy}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowReject(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {submission.promoted_pool_id && (
        <Link
          href={`/admin/pools/${submission.promoted_pool_id}`}
          className="text-sm text-cyan-600 hover:underline inline-flex items-center gap-1"
        >
          View promoted pool &rarr;
        </Link>
      )}
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: PoolSubmissionStatus }) {
  const config: Record<PoolSubmissionStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Rejected", className: "bg-rose-100 text-rose-800" },
  };
  const c = config[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
