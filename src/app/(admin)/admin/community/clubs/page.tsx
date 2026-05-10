"use client";

/**
 * Admin Clubs Management — list view.
 *
 * Each row links to a per-club detail page where you can edit defaults
 * (schedule, pool, location) and manage the club's pods. Inline create
 * form here is for the bare minimum needed to seed a row; the rich
 * editing UI lives in [id]/page.tsx.
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  Club,
  ClubInput,
  createClub,
  deleteClub,
  listClubs,
} from "@/lib/clubs";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const emptyForm: ClubInput = {
  name: "",
  slug: "",
  description: "",
  location: "",
  is_active: true,
};

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClubInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClubs(false);
      setClubs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setAutoSlug(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: ClubInput = {
        ...form,
        description: form.description?.trim() || null,
        location: form.location?.trim() || null,
      };
      await createClub(payload);
      setModalOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, club: Club) => {
    e.preventDefault(); // Don't trigger the row's <Link> nav
    e.stopPropagation();
    if (
      !confirm(
        `Delete "${club.name}"? Pods under this club will be left orphaned (their club_id stays but the picker won't show this club).`,
      )
    )
      return;
    try {
      await deleteClub(club.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const sortedClubs = useMemo(
    () =>
      [...clubs].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [clubs],
  );

  if (loading) return <LoadingPage text="Loading clubs..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Clubs
          </h1>
          <p className="mt-2 text-slate-600">
            One Club per location (e.g. <em>SwimBuddz Yaba</em>). Pods are
            small training crews inside a Club — open a Club to manage its
            pods and default schedule.
          </p>
        </div>
        <Button onClick={openCreate} className="flex w-fit items-center gap-2">
          <Plus className="h-4 w-4" />
          New Club
        </Button>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {sortedClubs.length === 0 ? (
        <Card className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            No clubs yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Create the first club so you can add pods to it.
          </p>
          <div className="mt-4">
            <Button onClick={openCreate}>Create club</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedClubs.map((club) => (
            <Link key={club.id} href={`/admin/community/clubs/${club.id}`}>
              <Card
                className={`group flex flex-wrap items-start justify-between gap-3 p-4 transition hover:border-cyan-300 hover:shadow-md ${
                  club.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-700">
                      {club.name}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {club.slug}
                    </span>
                    {!club.is_active && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    {club.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {club.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {DAY_LABELS[club.default_session_day] ??
                        club.default_session_day}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {club.default_session_time.slice(0, 5)} ·{" "}
                      {club.default_session_duration_minutes}m
                    </span>
                  </div>
                  {club.description && (
                    <p className="line-clamp-2 text-sm text-slate-700">
                      {club.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={(e) => handleDelete(e, club)}
                    className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-cyan-600" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal — minimal fields. Schedule/pool/edit lives in the
          per-club detail page (linked to from the row). */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create club">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                slug: autoSlug ? slugify(name) : f.slug,
              }));
            }}
            required
            placeholder="e.g. SwimBuddz Yaba"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setAutoSlug(false);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
            required
            placeholder="e.g. sb-yaba"
            hint="Auto-generated from name. Lowercase letters/digits, single hyphens."
          />
          <Input
            label="Location (optional)"
            value={form.location ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Yaba, Lagos"
          />
          <Textarea
            label="Description (optional)"
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What is this club about?"
          />
          <p className="text-xs text-slate-500">
            Default session schedule (day, time, duration, pool) and pods are
            configured on the next page after you create the club.
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
