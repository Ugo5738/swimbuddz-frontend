"use client";

/**
 * Admin Club detail — settings + pods.
 *
 * Two stacked cards:
 *   1. Club info form (editable in place): name, slug, location,
 *      description, default schedule (day/time/duration/pool), is_active.
 *   2. Pods in this club — list + "Create pod" CTA. Pod rows link to
 *      the per-pod admin page. The general /admin/community/pods routes
 *      (list, new, [id]) still exist; this just surfaces them in club
 *      context.
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PoolPicker } from "@/components/admin/PoolPicker";
import { useApi } from "@/hooks/useApi";
import type { ClubPlan } from "@/lib/clubOnboarding";
import { OperatingArea, PoolPricingApi } from "@/lib/poolPricing";
import { getClub, updateClub, type Club, type ClubDayOfWeek, type ClubInput } from "@/lib/clubs";
import { formatDay, formatTime, podDisplayName, type PodSummary } from "@/lib/pods";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { ArrowLeft, Calendar, Clock, MapPin, Pencil, Plus, Save, Users, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DAYS: { value: ClubDayOfWeek; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Fetch all pods for this club. Re-uses the same admin-side merge of
 * public + review-queue endpoints as the (now-orphaned) pods list page. */
async function fetchPodsForClub(clubId: string): Promise<PodSummary[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const [publicRes, reviewRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/members/pods/public?club_id=${encodeURIComponent(clubId)}`, {
      headers,
    }),
    fetch(`${API_BASE_URL}/api/v1/admin/members/pods/review-queue`, { headers }),
  ]);

  const publicPods = publicRes.ok ? ((await publicRes.json()) as PodSummary[]) : [];
  const reviewPods = reviewRes.ok ? ((await reviewRes.json()) as PodSummary[]) : [];

  const map = new Map<string, PodSummary>();
  for (const p of publicPods) map.set(p.id, p);
  for (const p of reviewPods) {
    if (p.club_id === clubId) map.set(p.id, p);
  }
  return Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export default function AdminClubDetailPage() {
  const params = useParams<{ id: string }>();
  const clubId = params?.id;

  const [club, setClub] = useState<Club | null>(null);
  const [pods, setPods] = useState<PodSummary[]>([]);
  const quarters = useApi<ClubPlan[]>("/api/v1/clubs/admin/plans");
  const [operatingAreas, setOperatingAreas] = useState<OperatingArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClubInput>({
    name: "",
    slug: "",
    description: "",
    location: "",
    is_active: true,
  });
  const [autoSlug, setAutoSlug] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!clubId) return;
    setError(null);
    try {
      const [c, ps, areas] = await Promise.all([
        getClub(clubId),
        fetchPodsForClub(clubId),
        PoolPricingApi.listAreas().catch(() => []),
      ]);
      setClub(c);
      setPods(ps);
      setOperatingAreas(areas);
      setForm(toForm(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load club");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [clubId]);

  const handleSave = async () => {
    if (!club) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ClubInput = {
        ...form,
        description: form.description?.trim() || null,
        location: form.location?.trim() || null,
      };
      // Strip empty schedule fields so the backend keeps existing values.
      if (!payload.default_session_time) delete payload.default_session_time;
      const updated = await updateClub(club.id, payload);
      setClub(updated);
      setForm(toForm(updated));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const clubQuarters = (quarters.data ?? []).filter(plan => plan.club_id === clubId);
  const activeQuarter = clubQuarters.find(plan => plan.published_at && plan.is_active && plan.period_start <= new Date().toISOString().slice(0, 10) && plan.period_end >= new Date().toISOString().slice(0, 10));
  const clubReady = Boolean(club?.is_active && club.location && club.default_pool_id && club.default_session_day && club.default_session_time && pods.some(pod => pod.status === "active") && activeQuarter);
  const unfilledPlaces = pods.filter(pod => pod.status === "active").reduce((sum, pod) => sum + Math.max(0, pod.max_size - pod.active_member_count), 0);
  const sortedPods = useMemo(
    () =>
      [...pods].sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return podDisplayName(a).localeCompare(podDisplayName(b));
      }),
    [pods]
  );

  if (loading) return <LoadingPage text="Loading club..." />;

  if (!club) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error ?? "Club not found"}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/admin/community/clubs"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clubs
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{club.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          <code className="rounded bg-slate-100 px-1 text-xs">{club.slug}</code>
          {!club.is_active && (
            <Badge variant="default" className="ml-2">
              Inactive
            </Badge>
          )}
        </p>
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</Card>
      )}

      <Card className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><p className="text-sm text-slate-600">Club practice</p><p className="mt-1 font-semibold">{club.default_session_day ? formatDay(club.default_session_day) : "Not set"} · {club.default_session_time ? formatTime(club.default_session_time) : "No time"}</p></div>
          <div><p className="text-sm text-slate-600">Training Pods</p><p className="mt-1 font-semibold">{pods.filter(pod => pod.status === "active").length} active · {unfilledPlaces} spaces</p></div>
          <div><p className="text-sm text-slate-600">Current Club quarter</p><p className="mt-1 font-semibold">{activeQuarter ? `${activeQuarter.name} · Published` : quarters.loading ? "Checking…" : "No active published quarter"}</p></div>
        </div>
        <div className="border-t border-slate-200 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Set up this Club</h2>
            <p className="text-sm text-slate-600">Complete the pool, weekly practice, and Pod before inviting swimmers. Create the quarter from the plans workspace.</p>
          </div>
          <Link className="text-sm font-medium text-cyan-700 underline" href={`/admin/club-plans?club_id=${club.id}`}>Create or review quarter →</Link>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Club details and location", ready: Boolean(club.location && club.is_active) },
            { label: "Partner pool selected", ready: Boolean(club.default_pool_id) },
            { label: "Weekly practice schedule", ready: Boolean(club.default_session_day && club.default_session_time) },
            { label: "Training pods created", ready: pods.some(pod => pod.status === "active") },
          ].map((step, index) => (
            <li key={step.label} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <span aria-hidden className="font-semibold text-slate-500">{index + 1}.</span>
              <span className="flex-1">{step.label}</span>
              <span className={step.ready ? "font-medium text-emerald-700" : "text-amber-700"}>
                {step.ready ? "Ready" : "Needs setup"}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500">The current-quarter status above is checked against published Club plans; Pod capacity is managed separately from quarter seats.</p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div><p className="font-semibold">{clubReady ? "Club operational setup ready" : "Club setup needs attention"}</p>
          <p className="text-sm text-slate-600">{clubReady ? "Club, pool, schedule, Pod and current published quarter are configured. Verify member eligibility and actual session availability before transfer." : "Complete the location, pool, schedule, Pod and published quarter before moving members here."}</p></div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/admin/club-plans?club_id=${club.id}`} className="font-medium text-cyan-700 underline">Quarter plans</Link>
          <Link href={`/admin/community/pods?club_id=${club.id}`} className="font-medium text-cyan-700 underline">Manage Pods</Link>
          <Link href="/admin/sessions" className="font-medium text-cyan-700 underline">Session templates</Link>
        </div>
      </div>
      {/* Settings */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Settings</h2>
          {editing ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setForm(toForm(club));
                  setAutoSlug(false);
                }}
                disabled={saving}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <ClubEditForm
            form={form}
            setForm={setForm}
            autoSlug={autoSlug}
            setAutoSlug={setAutoSlug}
            operatingAreas={operatingAreas}
          />
        ) : (
          <ClubReadView club={club} operatingAreas={operatingAreas} />
        )}
      </Card>

      {/* Pods */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">Training Pods ({pods.filter(pod => pod.status === "active").length} active)</h2>
            <p className="text-xs text-slate-500">
              Peer-led swimming crews at this Club. Pod membership is separate from enrollment
              and the quarterly price; swimmers may move between Pods here, not between Clubs.
            </p>
          </div>
          <Link href={`/admin/community/pods/new?club_id=${club.id}`}>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Create pod
            </Button>
          </Link>
        </div>

        {sortedPods.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No pods in this club yet. Create the first one — handle like "dolphins" gets you the
            WhatsApp group name <code className="text-xs">SB Club – Dolphins</code>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedPods.map((pod) => {
              const reviewOverdue =
                pod.status === "active" && new Date(pod.review_due_at) <= new Date();
              return (
                <li key={pod.id}>
                  <Link
                    href={`/admin/community/pods/${pod.id}`}
                    className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900 group-hover:text-cyan-700">
                          {podDisplayName(pod)}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {pod.slug}
                        </span>
                        {pod.status === "inactive" && <Badge variant="default">Dissolved</Badge>}
                        {reviewOverdue && <Badge variant="warning">Review due</Badge>}
                        {pod.visibility === "private" && <Badge variant="default">Private</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
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
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toForm(c: Club): ClubInput {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    location: c.location ?? "",
    is_active: c.is_active,
    default_session_day: c.default_session_day,
    default_session_time: c.default_session_time.slice(0, 5),
    default_session_duration_minutes: c.default_session_duration_minutes,
    default_pool_id: c.default_pool_id,
    operating_area_id: c.operating_area_id,
  };
}

// ---------------------------------------------------------------------------
// Read-only view & edit form
// ---------------------------------------------------------------------------

function ClubReadView({ club, operatingAreas }: { club: Club; operatingAreas: OperatingArea[] }) {
  const areaName = operatingAreas.find((area) => area.id === club.operating_area_id)?.name;
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <Field label="Location">
        {club.location ?? <span className="italic text-slate-400">Not set</span>}
      </Field>
      <Field label="Status">
        {club.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        )}
      </Field>
      <Field label="Default session day">
        {DAYS.find((d) => d.value === club.default_session_day)?.label ?? club.default_session_day}
      </Field>
      <Field label="Default session time">
        {club.default_session_time.slice(0, 5)} · {club.default_session_duration_minutes} min
      </Field>
      <Field label="Default pool">
        {club.default_pool_id ? (
          <code className="text-xs">{club.default_pool_id.slice(0, 8)}…</code>
        ) : (
          <span className="italic text-slate-400">Not set</span>
        )}
      </Field>
      <Field label="Operating area">
        {areaName ?? <span className="italic text-slate-400">Not set</span>}
      </Field>
      <Field label="Description" wide>
        {club.description || <span className="italic text-slate-400">None</span>}
      </Field>
    </dl>
  );
}

function ClubEditForm({
  form,
  setForm,
  autoSlug,
  setAutoSlug,
  operatingAreas,
}: {
  form: ClubInput;
  setForm: (f: ClubInput) => void;
  autoSlug: boolean;
  setAutoSlug: (v: boolean) => void;
  operatingAreas: OperatingArea[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm({
              ...form,
              name,
              slug: autoSlug ? slugify(name) : form.slug,
            });
          }}
          required
          placeholder="e.g. SwimBuddz Yaba"
        />
        <Input
          label="Slug"
          value={form.slug}
          onChange={(e) => {
            setAutoSlug(false);
            setForm({ ...form, slug: slugify(e.target.value) });
          }}
          required
          placeholder="e.g. sb-yaba"
          hint="Lowercase letters/digits, hyphens"
        />
      </div>

      <Input
        label="Location"
        value={form.location ?? ""}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="e.g. Yaba, Lagos"
      />

      <Textarea
        label="Description"
        rows={2}
        value={form.description ?? ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Default session day"
          value={form.default_session_day ?? "sat"}
          onChange={(e) =>
            setForm({
              ...form,
              default_session_day: e.target.value as ClubDayOfWeek,
            })
          }
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        <Input
          label="Default session time"
          type="time"
          value={form.default_session_time ?? "09:00"}
          onChange={(e) => setForm({ ...form, default_session_time: e.target.value })}
        />
        <Input
          label="Duration (min)"
          type="number"
          min={15}
          max={480}
          value={form.default_session_duration_minutes ?? 180}
          onChange={(e) =>
            setForm({
              ...form,
              default_session_duration_minutes: Number(e.target.value),
            })
          }
        />
      </div>

      <Select
        label="Operating area"
        value={form.operating_area_id ?? ""}
        onChange={(e) => {
          const operatingAreaId = e.target.value || null;
          setForm({
            ...form,
            operating_area_id: operatingAreaId,
            // A pool from the previous area can never remain silently paired
            // with the new area. The server enforces the same invariant.
            default_pool_id: null,
          });
        }}
      >
        <option value="">Select Mainland, Island, or another configured area</option>
        {operatingAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </Select>

      <PoolPicker
        label="Default pool"
        value={form.default_pool_id}
        operatingAreaId={form.operating_area_id}
        disabled={!form.operating_area_id}
        activePartnersOnly
        required={Boolean(form.operating_area_id)}
        onChange={(poolId, _poolName, pool) =>
          setForm({
            ...form,
            default_pool_id: poolId ?? null,
            operating_area_id: pool?.operating_area_id ?? form.operating_area_id ?? null,
          })
        }
        hint={
          form.operating_area_id
            ? "Only active partner pools in this operating area are shown."
            : "Select an operating area first, then choose its default pool."
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Active (visible in pickers)
      </label>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}
