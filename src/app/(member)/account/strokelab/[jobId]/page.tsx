"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  type AnalysisJobDetail,
  deleteAnalysisJob,
  getAnalysisJob,
  statusLabel,
  statusTone,
} from "@/lib/strokelab";
import { selectPrimaryCoachRead } from "@/lib/strokelab-view";
import { ArrowLeft, Eye, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CoachReviewCard,
  ObservationRow,
  ProgressSinceLastSwimCard,
  fmtTime,
} from "./_components/StrokeLabResultSections";

// Backend lifecycle states that mean "still working" — keep polling.
const ACTIVE_STATUSES = new Set(["pending", "processing"]);
const POLL_INTERVAL_MS = 3000;

const STATUS_TONE_TO_BADGE = {
  slate: "default",
  amber: "warning",
  emerald: "success",
  rose: "danger",
} as const;

export default function StrokeLabResultPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [job, setJob] = useState<AnalysisJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pollHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annotatedVideoRef = useRef<HTMLVideoElement | null>(null);
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const originalDetailsRef = useRef<HTMLDetailsElement | null>(null);

  // Seek the original video for coach-primary analyses; overlays are retired.
  const jumpToTimestamp = useCallback((seconds: number) => {
    const video = annotatedVideoRef.current ?? originalVideoRef.current;
    if (!video) return;
    if (!annotatedVideoRef.current && originalDetailsRef.current) {
      originalDetailsRef.current.open = true;
    }
    video.currentTime = seconds;
    video.play().catch(() => {
      /* autoplay may be blocked; the seek still happened */
    });
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const fetchOnce = useCallback(async () => {
    try {
      const next = await getAnalysisJob(jobId);
      setJob(next);
      setError(null);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load this analysis";
      setError(message);
      return null;
    }
  }, [jobId]);

  // Initial load + interval polling while the job is active.
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const next = await fetchOnce();
      if (cancelled) return;
      if (next && ACTIVE_STATUSES.has(next.status)) {
        pollHandle.current = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (pollHandle.current) clearTimeout(pollHandle.current);
    };
  }, [fetchOnce]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Delete this analysis? The video and result will be removed permanently.",
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAnalysisJob(jobId);
      toast.success("Analysis deleted.");
      router.push("/account/strokelab");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!job && !error) return <LoadingPage />;

  if (error && !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/account/strokelab"
          className="mb-4 inline-flex items-center text-sm text-cyan-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!job) return null;

  const isActive = ACTIVE_STATUSES.has(job.status);
  const result = job.result;
  const coachRead = selectPrimaryCoachRead(result?.coach_result);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/account/strokelab"
        className="mb-4 inline-flex items-center text-sm text-cyan-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Stroke Lab
      </Link>

      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {job.stroke_type.charAt(0).toUpperCase() +
              job.stroke_type.slice(1)}{" "}
            analysis
          </h1>
          <p className="text-sm text-slate-500">
            Uploaded {new Date(job.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={STATUS_TONE_TO_BADGE[statusTone(job.status)]}>
          {statusLabel(job.status)}
        </Badge>
      </header>

      {isActive ? (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">
                {job.status === "pending"
                  ? "Queued — we’re about to start."
                  : "Analysing — reviewing the visible freestyle technique."}
              </p>
              <p className="text-xs text-slate-500">
                This updates automatically — no need to refresh. Most clips are
                ready within a couple of minutes.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {job.status === "failed" ? (
        <Alert variant="error" className="mb-6">
          {job.error_message ||
            "Something went wrong while analysing this clip."}
          <div className="mt-3">
            <Link href="/account/strokelab">
              <Button variant="secondary" size="sm">
                Try a new upload
              </Button>
            </Link>
          </div>
        </Alert>
      ) : null}

      {result ? (
        <>
          {coachRead.comparison ? (
            <ProgressSinceLastSwimCard comparison={coachRead.comparison} />
          ) : null}

          <CoachReviewCard
            result={result}
            coachRead={coachRead}
            jobId={job.id}
            onJump={jumpToTimestamp}
          />

          {result.summary_text ? (
            <Card className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Stroke Lab read
              </h3>
              <p className="text-sm text-slate-700">{result.summary_text}</p>
            </Card>
          ) : null}

          {result.observations.length > 0 ? (
            <Card className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                What we noticed
              </h3>
              <ul className="space-y-4">
                {result.observations.map((obs) => (
                  <ObservationRow
                    key={obs.key}
                    obs={obs}
                    onJump={jumpToTimestamp}
                  />
                ))}
              </ul>
            </Card>
          ) : null}

          {result.tracking_gaps.length > 0 ? (
            <Card className="mb-6">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                <Eye className="h-4 w-4" /> Moments we lost you
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Tracking dropped here — usually fully submerged or out of frame.
                Tap to view.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.tracking_gaps.map((g, i) => (
                  <button
                    key={`${g.start_s}-${i}`}
                    onClick={() => jumpToTimestamp(g.start_s)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                  >
                    {fmtTime(g.start_s)}–{fmtTime(g.end_s)} ({g.duration_s}s)
                  </button>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {job.annotated_video_url ? (
        <Card className="mb-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Annotated clip
          </h3>
          <video
            ref={annotatedVideoRef}
            controls
            playsInline
            src={job.annotated_video_url}
            className="w-full rounded-lg bg-slate-900"
          />
        </Card>
      ) : null}

      {job.original_video_url ? (
        <details ref={originalDetailsRef} className="mb-6">
          <summary className="cursor-pointer text-sm text-cyan-700">
            Show original upload
          </summary>
          <div className="mt-3">
            <video
              ref={originalVideoRef}
              controls
              playsInline
              src={job.original_video_url}
              className="w-full rounded-lg bg-slate-900"
            />
          </div>
        </details>
      ) : null}

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          Stroke Lab is an automated technique review — share with a coach for
          personal guidance.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
