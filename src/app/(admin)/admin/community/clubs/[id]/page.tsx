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
import {
  getClub,
  updateClub,
  type Club,
  type ClubDayOfWeek,
  type ClubInput,
} from "@/lib/clubs";
import {
  formatDay,
  formatTime,
  podDisplayName,
  type PodSummary,
} from "@/lib/pods";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";
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
    fetch(
      `${API_BASE_URL}/api/v1/members/pods/public?club_id=${encodeURIComponent(clubId)}`,
      { headers },
    ),
    fetch(`${API_BASE_URL}/api/v1/admin/members/pods/review-queue`, { headers }),
  ]);

  const publicPods = publicRes.ok ? ((await publicRes.json()) as PodSummary[]) : [];
  const reviewPods = reviewRes.ok ? ((await reviewRes.json()) as PodSummary[]) : [];

  const map = new Map<string, PodSummary>();
  for (const p of publicPods) map.set(p.id, p);
  for (const p of reviewPods) {
    if (p.club_id === clubId) map.set(p.id, p);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
}

export default function AdminClubDetailPage() {
  const params = useParams<{ id: string }>();
  const clubId = params?.id;

  const [club, setClub] = useState<Club | null>(null);
  const [pods, setPods] = useState<PodSummary[]>([]);
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
      const [c, ps] = await Promise.all([
        getClub(clubId),
        fetchPodsForClub(clubId),
      ]);
      setClub(c);
      setPods(ps);
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

  const sortedPods = useMemo(
    () =>
      [...pods].sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return podDisplayName(a).localeCompare(podDisplayName(b));
      }),
    [pods],
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          {club.name}
        </h1>
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
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </Card>
      )}

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
          />
        ) : (
          <ClubReadView club={club} />
        )}
      </Card>

      {/* Pods */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Pods in this club ({pods.length})
            </h2>
            <p className="text-xs text-slate-500">
              Small training crews (2–5 swimmers each). New pods inherit
              this club's default schedule.
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
            No pods in this club yet. Create the first one — handle like
            "dolphins" gets you the WhatsApp group name{" "}
            <code className="text-xs">SB Club – Dolphins</code>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedPods.map((pod) => {
              const reviewOverdue =
                pod.status === "active" &&
                new Date(pod.review_due_at) <= new Date();
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
                        {pod.status === "inactive" && (
                          <Badge variant="default">Dissolved</Badge>
                        )}
                        {reviewOverdue && (
                          <Badge variant="warning">Review due</Badge>
                        )}
                        {pod.visibility === "private" && (
                          <Badge variant="default">Private</Badge>
                        )}
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
  };
}

// ---------------------------------------------------------------------------
// Read-only view & edit form
// ---------------------------------------------------------------------------

function ClubReadView({ club }: { club: Club }) {
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
        {DAYS.find((d) => d.value === club.default_session_day)?.label ??
          club.default_session_day}
      </Field>
      <Field label="Default session time">
        {club.default_session_time.slice(0, 5)} ·{" "}
        {club.default_session_duration_minutes} min
      </Field>
      <Field label="Default pool">
        {club.default_pool_id ? (
          <code className="text-xs">{club.default_pool_id.slice(0, 8)}…</code>
        ) : (
          <span className="italic text-slate-400">Not set</span>
        )}
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
}: {
  form: ClubInput;
  setForm: (f: ClubInput) => void;
  autoSlug: boolean;
  setAutoSlug: (v: boolean) => void;
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
          onChange={(e) =>
            setForm({ ...form, default_session_time: e.target.value })
          }
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

      <PoolPicker
        label="Default pool"
        value={form.default_pool_id}
        onChange={(poolId) =>
          setForm({ ...form, default_pool_id: poolId ?? null })
        }
        hint="Where this club's sessions are held by default. Pods inherit this."
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
