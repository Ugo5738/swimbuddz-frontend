"use client";

/**
 * Admin Pods Management — list view.
 *
 * Lists all pods (across all clubs), with filters for club + status. Each
 * row links to the per-pod detail page where leads, members, schedule
 * and lifecycle actions live.
 *
 * See docs/club/POD_OPERATIONS.md.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { listClubs, type Club } from "@/lib/clubs";
import {
  formatDay,
  formatTime,
  podDisplayName,
  type PodSummary,
} from "@/lib/pods";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StatusFilter = "active" | "inactive" | "all";

/**
 * Admin pod listing — there's no /api/v1/admin/members/pods GET endpoint
 * (the only admin GET is review-queue + per-pod). For an admin "all pods"
 * view, we read the same internal list endpoint sessions_service uses.
 * This needs a service-role JWT, which the admin doesn't have, so we
 * proxy through the public /members/pods/public endpoint and then layer
 * any private/inactive ones from the review-queue. Simple and avoids
 * adding a new admin GET endpoint right now.
 */
async function fetchAllPodsForAdmin(): Promise<PodSummary[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const [publicRes, reviewRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/members/pods/public`, { headers }),
    fetch(`${API_BASE_URL}/api/v1/admin/members/pods/review-queue`, {
      headers,
    }),
  ]);

  const publicPods = publicRes.ok ? ((await publicRes.json()) as PodSummary[]) : [];
  const reviewPods = reviewRes.ok ? ((await reviewRes.json()) as PodSummary[]) : [];

  // Merge by id, preferring fresher copies
  const map = new Map<string, PodSummary>();
  for (const p of publicPods) map.set(p.id, p);
  for (const p of reviewPods) map.set(p.id, p);
  return Array.from(map.values()).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
}

export default function AdminPodsListPage() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clubFilter, setClubFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [podList, clubList] = await Promise.all([
        fetchAllPodsForAdmin(),
        listClubs(false),
      ]);
      setPods(podList);
      setClubs(clubList);
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
    const needle = search.trim().toLowerCase();
    return pods.filter((p) => {
      if (clubFilter !== "all" && p.club_id !== clubFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (needle) {
        const haystack = [p.handle, p.name, p.slug].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [pods, clubFilter, statusFilter, search]);

  const reviewDueCount = pods.filter(
    (p) => p.status === "active" && new Date(p.review_due_at) <= new Date(),
  ).length;

  if (loading) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Club Pods</h1>
          <p className="mt-1 text-sm text-gray-500">
            2–5 member training crews. Each pod has a Pod Lead and runs on a
            3-month review cycle.
          </p>
        </div>
        <div className="flex gap-2">
          {reviewDueCount > 0 && (
            <Link href="/admin/community/pods/review-queue">
              <Button variant="secondary">
                <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
                Review queue ({reviewDueCount})
              </Button>
            </Link>
          )}
          <Link href="/admin/community/pods/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create pod
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by handle, name, or slug…"
              className="pl-9"
            />
          </div>
          <Select
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
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="active">Active only</option>
            <option value="inactive">Dissolved only</option>
            <option value="all">All statuses</option>
          </Select>
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No pods match these filters.</p>
          {pods.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">
              Create your first pod to get started.
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pod) => (
            <PodCard key={pod.id} pod={pod} clubName={clubsById.get(pod.club_id)?.name} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pod card
// ---------------------------------------------------------------------------

function PodCard({ pod, clubName }: { pod: PodSummary; clubName?: string }) {
  const isFull = pod.active_member_count >= pod.max_size;
  const reviewOverdue =
    pod.status === "active" && new Date(pod.review_due_at) <= new Date();

  return (
    <Link href={`/admin/community/pods/${pod.id}`}>
      <Card className="group flex h-full flex-col gap-3 p-4 transition hover:border-blue-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-blue-700">
              {podDisplayName(pod)}
            </h3>
            <p className="truncate text-xs text-gray-500">
              {clubName ?? "Unknown club"} · {pod.slug}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={pod.status} />
            {reviewOverdue && <Badge variant="warning">Review due</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className={isFull ? "font-semibold text-amber-700" : ""}>
              {pod.active_member_count}/{pod.max_size}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDay(pod.default_session_day)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(pod.default_session_time)}
          </span>
          {pod.visibility === "private" && (
            <Badge variant="default">Private</Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: PodSummary["status"] }) {
  if (status === "inactive") return <Badge variant="default">Dissolved</Badge>;
  return <Badge variant="success">Active</Badge>;
}
