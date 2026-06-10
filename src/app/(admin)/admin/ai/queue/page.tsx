"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  type QueueRecentJob,
  type QueueSnapshot,
  getQueueSnapshot,
  reanalyzeJob,
  statusLabel,
  statusTone,
} from "@/lib/strokelab";
import { formatDistanceToNow } from "date-fns";
import { Activity, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_TONE_TO_BADGE = {
  slate: "default",
  amber: "warning",
  emerald: "success",
  rose: "danger",
} as const;

// Refresh cadence for the queue snapshot. 10s keeps a light load on the
// DB while still feeling live on the dashboard.
const POLL_INTERVAL_MS = 10_000;

export default function StrokeLabQueuePage() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getQueueSnapshot(50);
      setSnapshot(next);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load queue snapshot";
      setError(message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleReanalyze = async (job: QueueRecentJob) => {
    if (
      !confirm(
        `Reanalyze ${job.id}? The job resets to PENDING and the worker re-runs it.`,
      )
    ) {
      return;
    }
    setBusyJobId(job.id);
    try {
      const res = await reanalyzeJob(job.id);
      if (res.enqueued) {
        toast.success("Re-enqueued.");
      } else {
        toast.warning(
          "Reset to PENDING but couldn't reach Redis — will pick up on the next worker cycle.",
        );
      }
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Reanalyze failed";
      toast.error(message);
    } finally {
      setBusyJobId(null);
    }
  };

  if (!snapshot && !error) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-6 w-6 text-cyan-600" />
            Stroke Lab Queue
          </h1>
          <p className="text-sm text-slate-500">
            ARQ worker health, job throughput, and reanalyze controls.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh now
        </Button>
      </header>

      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {snapshot ? (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-4">
            <StatTile
              label="In flight"
              value={String(snapshot.queue_depth_approx)}
              hint={`${snapshot.counts.pending} pending · ${snapshot.counts.processing} processing`}
            />
            <StatTile
              label="Last 24h success"
              value={`${snapshot.success_rate_pct.toFixed(1)}%`}
              hint={`${snapshot.counts_last_24h.completed} done · ${snapshot.counts_last_24h.failed} failed`}
            />
            <StatTile
              label="Last 24h volume"
              value={String(
                snapshot.counts_last_24h.pending +
                  snapshot.counts_last_24h.processing +
                  snapshot.counts_last_24h.completed +
                  snapshot.counts_last_24h.failed,
              )}
              hint="Jobs created in last 24h"
            />
            <StatTile
              label="All-time total"
              value={String(snapshot.total_jobs)}
              hint={`${snapshot.counts.completed} completed · ${snapshot.counts.failed} failed`}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              Recent jobs
            </h2>
            {snapshot.recent_jobs.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500">No jobs yet.</p>
              </Card>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Job</th>
                      <th className="px-4 py-2">Stroke</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Finished</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot.recent_jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              STATUS_TONE_TO_BADGE[statusTone(job.status)]
                            }
                          >
                            {statusLabel(job.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {job.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2">{job.stroke_type}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">
                          {job.completed_at
                            ? formatDistanceToNow(
                                new Date(job.completed_at),
                                { addSuffix: true },
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReanalyze(job)}
                            disabled={busyJobId === job.id}
                            title={
                              job.error_message
                                ? `Error: ${job.error_message}`
                                : undefined
                            }
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            {busyJobId === job.id
                              ? "Working…"
                              : "Reanalyze"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </Card>
  );
}
