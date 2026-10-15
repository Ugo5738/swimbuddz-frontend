"use client";

/**
 * Location-first view of SwimBuddz Club training crews.
 * An individual Club owns its Pods; a Pod never grants access to a different Club.
 */
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { listClubs, type Club } from "@/lib/clubs";
import {
  adminListPods,
  formatDay,
  formatTime,
  podDisplayName,
  type PodSummary,
} from "@/lib/pods";
import { AlertTriangle, ArrowRight, CalendarDays, Clock3, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusFilter = "active" | "inactive" | "all";

function isReviewDue(pod: PodSummary, now: number) {
  return pod.status === "active" && new Date(pod.review_due_at).getTime() <= now;
}

function PodTile({ pod }: { pod: PodSummary }) {
  const occupied = pod.active_member_count;
  const capacity = pod.max_size;
  const full = occupied >= capacity;
  const due = isReviewDue(pod, Date.now());

  return (
    <Link
      href={`/admin/community/pods/${pod.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{podDisplayName(pod)}</h3>
          <p className="mt-1 text-xs text-slate-600">
            {pod.visibility === "private" ? "Private crew · Admin-assigned" : "Visible in Pod directory"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {pod.status === "inactive" ? <Badge variant="default">Dissolved</Badge> : null}
          {due && <Badge variant="warning">Review due</Badge>}
          {full && pod.status === "active" ? <Badge variant="warning">Full</Badge> : null}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-700"><strong className="text-xl text-slate-900">{occupied}</strong> / {capacity} swimmers</p>
        <span className="text-xs text-cyan-700">Manage Pod <ArrowRight className="inline h-3.5 w-3.5" /></span>
      </div>
      <div
        role="progressbar"
        aria-label={`${podDisplayName(pod)} occupancy`}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(occupied, capacity)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-cyan-600"}`} style={{ width: `${Math.min(100, capacity > 0 ? (occupied / capacity) * 100 : 0)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        <span><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{formatDay(pod.default_session_day)}</span>
        <span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{formatTime(pod.default_session_time)}</span>
      </div>
    </Link>
  );
}

export default function AdminPodsListPage() {
  const params = useSearchParams();
  const initialClubId = params?.get("club_id") || "all";
  const [clubs, setClubs] = useState<Club[]>([]);
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clubFilter, setClubFilter] = useState(initialClubId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [locations, crews] = await Promise.all([listClubs(false), adminListPods()]);
      setClubs(locations);
      setPods(crews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Clubs and Pods.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setClubFilter(initialClubId); }, [initialClubId]);

  const now = Date.now();
  const reviewDue = pods.filter(pod => isReviewDue(pod, now));
  const active = pods.filter(pod => pod.status === "active");
  const openSpaces = active.reduce((sum, pod) => sum + Math.max(0, pod.max_size - pod.active_member_count), 0);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pods.filter(pod => {
      if (clubFilter !== "all" && pod.club_id !== clubFilter) return false;
      if (statusFilter !== "all" && pod.status !== statusFilter) return false;
      const location = clubs.find(club => club.id === pod.club_id);
      return !term || [pod.name, pod.handle, pod.slug, location?.name, location?.location]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [pods, clubs, statusFilter, clubFilter, search]);
  const groups = useMemo(() => clubs
    .filter(club => clubFilter === "all" || club.id === clubFilter)
    .map(club => ({
      club,
      pods: matches.filter(pod => pod.club_id === club.id),
    }))
    .filter(group => group.pods.length > 0 || clubFilter !== "all" || (!search && statusFilter === "active" && group.club.is_active)),
  [clubs, matches, clubFilter, search, statusFilter]);
  const unassigned = matches.filter(pod => !clubs.some(club => club.id === pod.club_id));

  if (loading) return <LoadingPage text="Loading Club crews..." />;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/community/clubs" className="text-sm text-cyan-700 underline">← Club locations</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Training Pods</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Small, peer-led swimming crews organised by home Club. Manage membership, Pod Leads,
            capacity and reviews without changing anyone's Club enrollment.
          </p>
        </div>
        <Link href={clubFilter !== "all" ? `/admin/community/pods/new?club_id=${clubFilter}` : "/admin/community/pods/new"}>
          <Button><Plus className="mr-2 h-4 w-4" />Create Pod</Button>
        </Link>
      </header>

      {error && <Card className="border-rose-200 p-4 text-sm text-rose-700" role="alert">{error}
        <button className="ml-3 underline" onClick={() => { setRefreshing(true); void load(); }} disabled={refreshing}>Retry</button>
      </Card>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-slate-600">Active Pods</p><p className="mt-1 text-2xl font-bold">{active.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-600">Available Pod places</p><p className="mt-1 text-2xl font-bold">{openSpaces}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-600">Reviews due</p><p className="mt-1 text-2xl font-bold">{reviewDue.length}</p>
          {reviewDue.length > 0 && <Link href="/admin/community/pods/review-queue" className="mt-1 inline-block text-sm font-medium text-cyan-700 underline">Review crews →</Link>}
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Search Pods
            <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dolphin, VI, Pod handle…" className="pl-9" />
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-700">Club location
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={clubFilter} onChange={e => setClubFilter(e.target.value)}>
              <option value="all">All locations</option>
              {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Pod status
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="active">Active</option>
              <option value="inactive">Dissolved</option>
              <option value="all">All statuses</option>
            </select>
          </label>
        </div>
      </Card>

      {groups.length === 0 && unassigned.length === 0 ? (
        <Card className="space-y-3 p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-slate-400" />
          <p className="font-semibold">{search || statusFilter !== "active" || clubFilter !== "all" ? "No Pods match these filters" : "No Club Pods yet"}</p>
          <p className="text-sm text-slate-600">Try another location or create a Pod for a Club with an active swimming schedule.</p>
          <div><Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("active"); setClubFilter("all"); }}>Clear filters</Button></div>
        </Card>
      ) : groups.map(({ club, pods: locationPods }) => (
        <section key={club.id} className="space-y-3" aria-label={`${club.name} Pods`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{club.name}</h2>
              <p className="text-xs text-slate-600">{locationPods.length} {locationPods.length === 1 ? "Pod" : "Pods"} · {club.location || "Location not configured"}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href={`/admin/community/clubs/${club.id}`} className="text-cyan-700 underline">Club setup</Link>
              <Link href={`/admin/community/pods/new?club_id=${club.id}`} className="font-medium text-cyan-700 underline">Add Pod</Link>
            </div>
          </div>
          {locationPods.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locationPods.map(pod => <PodTile key={pod.id} pod={pod} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
              No active training crews at this location yet. <Link href={`/admin/community/pods/new?club_id=${club.id}`} className="text-cyan-700 underline">Create its first Pod</Link>.
            </div>
          )}
        </section>
      ))}
      {unassigned.length > 0 && (
        <section className="space-y-3" aria-label="Pods needing Club attention">
          <h2 className="font-semibold text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />Pods with an unavailable Club</h2>
          <div className="grid gap-3 sm:grid-cols-2">{unassigned.map(pod => <PodTile key={pod.id} pod={pod} />)}</div>
        </section>
      )}
    </main>
  );
}
