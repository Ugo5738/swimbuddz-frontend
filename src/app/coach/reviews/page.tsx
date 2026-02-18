"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useMediaUrls } from "@/hooks/useMediaUrl";
import {
  getPendingMilestoneReviews,
  reviewMilestoneClaim,
  type PendingMilestoneReview,
} from "@/lib/coach";
import { formatRelativeTime } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CoachReviewsPage() {
  const [reviews, setReviews] = useState<PendingMilestoneReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resolve evidence media IDs to actual URLs
  const evidenceMediaIds = useMemo(
    () => reviews.map((r) => r.evidence_media_id),
    [reviews],
  );
  const evidenceUrlMap = useMediaUrls(evidenceMediaIds);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      setLoading(true);
      const data = await getPendingMilestoneReviews();
      setReviews(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load reviews", err);
      setError("Failed to load pending reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(
    progressId: string,
    action: "approve" | "reject",
    studentName: string,
    milestoneName: string,
  ) {
    setActionLoading(progressId);
    setActionError(null);
    setSuccessMessage(null);

    try {
      await reviewMilestoneClaim(progressId, { action });

      // Remove from list
      setReviews((prev) => prev.filter((r) => r.progress_id !== progressId));

      // Show success message
      setSuccessMessage(
        action === "approve"
          ? `${studentName}'s "${milestoneName}" milestone approved!`
          : `${studentName}'s "${milestoneName}" milestone rejected. They can resubmit.`,
      );

      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to review milestone", err);
      setActionError("Failed to submit review. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <LoadingCard text="Loading pending reviews..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/coach/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Milestone Reviews
          </h1>
          <p className="text-slate-600">
            Review and approve student milestone submissions
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" title="Review Failed">
          {actionError}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            All caught up!
          </h2>
          <p className="text-slate-600 mb-4">
            You have no pending milestone reviews at the moment.
          </p>
          <Link href="/coach/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {reviews.length} milestone{reviews.length !== 1 ? "s" : ""}{" "}
              pending review
            </p>
          </div>

          {reviews.map((review) => (
            <ReviewCard
              key={review.progress_id}
              review={review}
              evidenceUrl={
                review.evidence_media_id
                  ? (evidenceUrlMap.get(review.evidence_media_id) ?? null)
                  : null
              }
              onApprove={() =>
                handleReview(
                  review.progress_id,
                  "approve",
                  review.student_name,
                  review.milestone_name,
                )
              }
              onReject={() =>
                handleReview(
                  review.progress_id,
                  "reject",
                  review.student_name,
                  review.milestone_name,
                )
              }
              isLoading={actionLoading === review.progress_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  evidenceUrl,
  onApprove,
  onReject,
  isLoading,
}: {
  review: PendingMilestoneReview;
  evidenceUrl: string | null;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900">
                {review.student_name}
              </h3>
              <p className="text-sm text-slate-600">{review.student_email}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">{review.milestone_type}</Badge>
              <span className="font-medium text-slate-900">
                {review.milestone_name}
              </span>
            </div>

            <p className="text-sm text-slate-600">
              Cohort: {review.cohort_name}
            </p>

            <p className="text-xs text-slate-500">
              Claimed {formatRelativeTime(review.claimed_at)}
            </p>

            {review.student_notes && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Student Notes
                </p>
                <p className="text-sm text-slate-700">{review.student_notes}</p>
              </div>
            )}

            {/* Evidence Media */}
            {review.evidence_media_id && (
              <EvidenceViewer
                evidenceUrl={evidenceUrl}
                hasMedia={!!review.evidence_media_id}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:w-auto w-full">
          <Link
            href={`/coach/students/${review.enrollment_id}`}
            className="w-full"
          >
            <Button variant="outline" size="sm" className="w-full">
              View Student
            </Button>
          </Link>

          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="flex-1 text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EvidenceViewer({
  evidenceUrl,
  hasMedia,
}: {
  evidenceUrl: string | null;
  hasMedia: boolean;
}) {
  if (!hasMedia) return null;

  // Still resolving the URL
  if (!evidenceUrl) {
    return (
      <div className="mt-3 p-3 bg-cyan-50 rounded-lg flex items-center gap-2 text-sm text-cyan-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading evidence...
      </div>
    );
  }

  const isVideo =
    /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(evidenceUrl) ||
    evidenceUrl.includes("video");

  if (isVideo) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
        <div className="px-3 py-1.5 bg-slate-100 flex items-center gap-1.5">
          <Play className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-xs font-medium text-slate-600">
            Student Evidence
          </span>
        </div>
        <video
          controls
          preload="metadata"
          className="w-full max-h-64"
          src={evidenceUrl}
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Image or other media — show inline with link to open full size
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
      <div className="px-3 py-1.5 bg-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          Student Evidence
        </span>
        <a
          href={evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Open full size
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={evidenceUrl}
        alt="Milestone evidence"
        className="w-full max-h-64 object-contain bg-slate-50"
      />
    </div>
  );
}
