"use client";

/**
 * Admin pod review queue.
 *
 * Pods become "review-due" 90 days after their cycle starts. The team
 * decides per-pod: extend (continue another 3 months), rebalance members,
 * or dissolve. This page surfaces the queue and the lifecycle actions —
 * see docs/club/POD_OPERATIONS.md "Lifecycle: 3-month review cycle".
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { listClubs, type Club } from "@/lib/clubs";
import {
  adminDissolvePod,
  adminExtendPod,
  adminListReviewQueue,
  formatDay,
  formatTime,
  podDisplayName,
  type PodSummary,
} from "@/lib/pods";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  RotateCw,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PodReviewQueuePage() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [podList, clubList] = await Promise.all([
        adminListReviewQueue(),
        listClubs(false),
      ]);
      setPods(podList);
      setClubs(clubList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clubsById = useMemo(
    () => new Map(clubs.map((c) => [c.id, c] as const)),
    [clubs],
  );

  const handleExtend = async (pod: PodSummary) => {
    if (
      !confirm(
        `Extend "${podDisplayName(pod)}" for another 3 months? The cycle resets to today.`,
      )
    )
      return;
    setActingId(pod.id);
    setError(null);
    try {
      await adminExtendPod(pod.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extend failed");
    } finally {
      setActingId(null);
    }
  };

  const handleDissolve = async (pod: PodSummary) => {
    if (
      !confirm(
        `Dissolve "${podDisplayName(pod)}"? All ${pod.active_member_count} member(s) will be soft-removed and the chat archived.`,
      )
    )
      return;
    setActingId(pod.id);
    setError(null);
    try {
      await adminDissolvePod(pod.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dissolve failed");
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/community/pods"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pods
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Review queue</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Pods past their 3-month review window. Decide per pod: extend,
          rebalance members (via the pod detail page), or dissolve.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {pods.length === 0 ? (
        <Card className="p-10 text-center">
          <RotateCw className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-600">All pods are within their review window.</p>
          <p className="mt-1 text-sm text-gray-400">
            Nothing to review right now — check back when a cycle ends.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pods.map((pod) => {
            const dueDays = Math.floor(
              (Date.now() - new Date(pod.review_due_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const club = clubsById.get(pod.club_id);
            const isActing = actingId === pod.id;

            return (
              <Card key={pod.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/community/pods/${pod.id}`}
                        className="font-semibold text-gray-900 hover:text-cyan-700"
                      >
                        {podDisplayName(pod)}
                      </Link>
                      <Badge variant="warning">
                        {dueDays === 0
                          ? "Due today"
                          : `${dueDays} day${dueDays === 1 ? "" : "s"} overdue`}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {club?.name ?? "Unknown club"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {pod.active_member_count}/{pod.max_size}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDay(pod.default_session_day)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(pod.default_session_time)}
                      </span>
                      <span>
                        Cycle started{" "}
                        {new Date(pod.cycle_started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/community/pods/${pod.id}`}>
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleExtend(pod)}
                      disabled={isActing}
                    >
                      <RotateCw className="mr-1 h-4 w-4" />
                      Extend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDissolve(pod)}
                      disabled={isActing}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Dissolve
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
