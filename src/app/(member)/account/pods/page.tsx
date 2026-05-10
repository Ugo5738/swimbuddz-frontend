"use client";

/**
 * Public pod directory for members.
 *
 * Lists all `public` + `active` pods (optionally filtered by club). A
 * Club member who isn't already in a pod can self-join any pod with
 * capacity. Members already in a pod see it highlighted at the top.
 *
 * See docs/club/POD_OPERATIONS.md.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { listClubs, type Club } from "@/lib/clubs";
import {
  formatDay,
  formatTime,
  getMyPod,
  joinPod,
  leaveMyPod,
  listPublicPods,
  podDisplayName,
  type PodSummary,
} from "@/lib/pods";
import { Calendar, CheckCircle, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function MemberPodsDirectoryPage() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myPod, setMyPod] = useState<PodSummary | null>(null);
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingPodId, setActingPodId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [podList, clubList, mine] = await Promise.all([
        listPublicPods(),
        listClubs(true),
        getMyPod(),
      ]);
      setPods(podList);
      setClubs(clubList);
      setMyPod(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pods");
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

  const filtered = useMemo(() => {
    return pods.filter((p) => {
      if (clubFilter !== "all" && p.club_id !== clubFilter) return false;
      // Hide my own pod from the directory list (it's surfaced separately).
      if (myPod && p.id === myPod.id) return false;
      return true;
    });
  }, [pods, clubFilter, myPod]);

  const handleJoin = async (podId: string) => {
    setActingPodId(podId);
    setError(null);
    try {
      await joinPod(podId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join pod");
    } finally {
      setActingPodId(null);
    }
  };

  const handleLeave = async () => {
    if (
      !confirm(
        "Leave your current pod? You can join another one with capacity, but the spot you free will be open to others.",
      )
    )
      return;
    setActingPodId(myPod?.id ?? "leave");
    setError(null);
    try {
      await leaveMyPod();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave pod");
    } finally {
      setActingPodId(null);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pods</h1>
        <p className="mt-1 text-sm text-gray-500">
          A pod is a 2–5 swimmer crew that trains together every week. Pods
          have a Pod Lead who runs sessions and keeps the chat alive.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {/* Current pod */}
      {myPod && (
        <Card className="overflow-hidden border-cyan-300">
          <div className="border-b border-cyan-100 bg-cyan-50 px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
              You're in
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-cyan-900">
              {podDisplayName(myPod)}
              <span className="ml-2 text-xs font-normal text-cyan-700">
                {clubsById.get(myPod.club_id)?.name ?? ""}
              </span>
            </h2>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                {myPod.active_member_count}/{myPod.max_size} swimmers
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDay(myPod.default_session_day, true)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatTime(myPod.default_session_time)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLeave()}
              disabled={actingPodId === myPod.id || actingPodId === "leave"}
            >
              {actingPodId ? "Leaving…" : "Leave pod"}
            </Button>
          </div>
        </Card>
      )}

      {/* Filter */}
      <Card className="p-4">
        <Select
          label="Filter by club"
          hideLabel
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
        >
          <option value="all">All clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      {/* Directory */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-600">
            {pods.length === 0
              ? "No public pods yet. Check back soon!"
              : myPod
                ? "No other public pods to browse right now."
                : "No public pods match this filter."}
          </p>
          {!myPod && (
            <Link href="/account" className="mt-3 inline-block text-sm text-cyan-700 hover:underline">
              ← Back to dashboard
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              clubName={clubsById.get(pod.club_id)?.name}
              canJoin={!myPod}
              joining={actingPodId === pod.id}
              onJoin={() => void handleJoin(pod.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pod card
// ---------------------------------------------------------------------------

interface PodCardProps {
  pod: PodSummary;
  clubName?: string;
  canJoin: boolean;
  joining: boolean;
  onJoin: () => void;
}

function PodCard({ pod, clubName, canJoin, joining, onJoin }: PodCardProps) {
  const isFull = pod.active_member_count >= pod.max_size;

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{podDisplayName(pod)}</h3>
          {clubName && <p className="text-xs text-gray-500">{clubName}</p>}
        </div>
        {isFull && <Badge variant="warning">Full</Badge>}
      </div>

      {pod.description && (
        <p className="text-sm text-gray-600">{pod.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
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
      </div>

      <div className="mt-auto pt-2">
        {canJoin ? (
          <Button
            size="sm"
            disabled={isFull || joining}
            onClick={onJoin}
            className="w-full"
          >
            {joining ? (
              "Joining…"
            ) : isFull ? (
              "Pod is full"
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Join this pod
              </>
            )}
          </Button>
        ) : (
          <p className="text-xs italic text-gray-400">
            Leave your current pod to join another.
          </p>
        )}
      </div>
    </Card>
  );
}
