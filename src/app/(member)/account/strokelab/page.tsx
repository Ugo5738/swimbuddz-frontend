"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  ACCEPTED_VIDEO_MIME,
  type AnalysisJob,
  MAX_DURATION_SECONDS,
  MAX_UPLOAD_BYTES,
  createAnalysisJob,
  listMyAnalyses,
  readVideoDuration,
  statusLabel,
  statusTone,
} from "@/lib/strokelab";
import { compressVideoForUpload } from "@/lib/videoCompress";
import { formatDistanceToNow } from "date-fns";
import { Activity, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STATUS_TONE_TO_BADGE: Record<
  ReturnType<typeof statusTone>,
  "default" | "warning" | "success" | "danger"
> = {
  slate: "default",
  amber: "warning",
  emerald: "success",
  rose: "danger",
};

export default function StrokeLabPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<AnalysisJob[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  // phase drives the submit button + status text: idle → compressing → uploading
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">(
    "idle",
  );
  const [compressPct, setCompressPct] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = phase !== "idle";

  const loadJobs = useCallback(async () => {
    try {
      const result = await listMyAnalyses(20);
      setJobs(result);
      setListError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load your analyses";
      setListError(message);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setUploadError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setUploadError("Pick a video first.");
      return;
    }
    setUploadError(null);
    try {
      // Fail fast on duration before we spend time compressing.
      try {
        const duration = await readVideoDuration(file);
        if (duration > MAX_DURATION_SECONDS + 1) {
          setUploadError(
            `That clip is ${Math.round(duration)}s. Keep it under ${MAX_DURATION_SECONDS}s for v0.`,
          );
          return;
        }
      } catch {
        // Browser couldn't read metadata — let the server adjudicate.
      }

      // Downscale + re-encode in the browser so a 4K phone clip (often
      // 60-200 MB) becomes a few MB. The analysis downscales to 1280px
      // anyway, so this loses nothing and saves a huge upload on mobile.
      setPhase("compressing");
      setCompressPct(0);
      const result = await compressVideoForUpload(file, {
        onProgress: (f) => setCompressPct(Math.round(f * 100)),
      });

      if (result.skipped && result.reason === "mediarecorder-unsupported") {
        toast.message(
          "Your browser can't compress video — uploading the original.",
        );
      } else if (!result.skipped) {
        const fromMb = (result.originalBytes / 1024 / 1024).toFixed(1);
        const toMb = (result.compressedBytes / 1024 / 1024).toFixed(1);
        toast.success(`Compressed ${fromMb} MB → ${toMb} MB`);
      }

      // After compression it should be well under the cap; if it somehow
      // isn't (compression unsupported + a huge original), stop with a
      // clear message rather than a 413 from the server.
      if (result.file.size > MAX_UPLOAD_BYTES) {
        setUploadError(
          `Even after compression this is ${(
            result.file.size /
            1024 /
            1024
          ).toFixed(1)} MB (limit ${MAX_UPLOAD_BYTES / 1024 / 1024} MB). ` +
            `Try a shorter clip.`,
        );
        setPhase("idle");
        return;
      }

      setPhase("uploading");
      const job = await createAnalysisJob({
        file: result.file,
        strokeType: "freestyle",
        isPublic,
      });
      toast.success("Upload received — analysing now.");
      router.push(`/account/strokelab/${job.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
      toast.error(message);
    } finally {
      setPhase("idle");
    }
  };

  if (jobs === null && !listError) {
    return <LoadingPage />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Activity className="h-6 w-6 text-cyan-600" />
          Stroke Lab
        </h1>
        <p className="text-sm text-slate-500">
          Upload a freestyle clip; we measure stroke rate, body roll, and
          breath balance. Surface-only, single swimmer, mobile clips work
          best.
        </p>
      </header>

      <Card className="mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="strokelab-video"
              className="block text-sm font-medium text-slate-700"
            >
              Freestyle video (mp4 / mov, ≤ {MAX_DURATION_SECONDS}s)
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Big 4K clips are fine — we shrink them on your phone before
              uploading, so it&apos;s fast even on mobile data.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="strokelab-video"
                type="file"
                accept={ACCEPTED_VIDEO_MIME}
                onChange={handleFileChange}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500"
              />
            </div>
            {file ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Video className="h-4 w-4" />
                {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Make this analysis shareable via a link.
          </label>

          {uploadError ? (
            <Alert variant="error">{uploadError}</Alert>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!file || isBusy}
            >
              <Upload className="mr-2 h-4 w-4" />
              {phase === "compressing"
                ? `Compressing… ${compressPct}%`
                : phase === "uploading"
                  ? "Uploading…"
                  : "Analyse my stroke"}
            </Button>
            <p className="text-xs text-slate-500">
              Stroke Lab is a measurement tool — not a coach replacement.
            </p>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Your recent analyses
        </h2>
        {listError ? <Alert variant="error">{listError}</Alert> : null}
        {jobs && jobs.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No analyses yet. Upload a clip above and we&apos;ll get you a
              first read in under two minutes.
            </p>
          </Card>
        ) : null}
        {jobs && jobs.length > 0 ? (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/account/strokelab/${job.id}`}
                  className="block"
                >
                  <Card className="flex items-center justify-between p-4 hover:border-cyan-200">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {job.stroke_type.charAt(0).toUpperCase() +
                          job.stroke_type.slice(1)}{" "}
                        analysis
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(job.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge variant={STATUS_TONE_TO_BADGE[statusTone(job.status)]}>
                      {statusLabel(job.status)}
                    </Badge>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
