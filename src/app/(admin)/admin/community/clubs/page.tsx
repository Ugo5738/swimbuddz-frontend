"use client";

/**
 * Admin Clubs Management.
 *
 * SwimBuddz has Community / Club / Academy as membership tiers but the
 * "Club" was conceptually implicit until now. This page is the lightweight
 * CRUD that lets admins seed Club rows so the challenges form (and any
 * future club-scoped feature) has something to point at.
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
  updateClub,
} from "@/lib/clubs";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setModalOpen(true);
  };

  const openEdit = (club: Club) => {
    setEditingId(club.id);
    setForm({
      name: club.name,
      slug: club.slug,
      description: club.description ?? "",
      location: club.location ?? "",
      is_active: club.is_active,
    });
    setAutoSlug(false);
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
      if (editingId) {
        await updateClub(editingId, payload);
      } else {
        await createClub(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (club: Club) => {
    if (
      !confirm(
        `Delete "${club.name}"? Existing challenges that point to this club will keep their stale club_id but lose the link in the picker.`,
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
        // Active first, then alphabetical
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
            Manage SwimBuddz clubs. Used to scope challenges and other
            club-tier features.
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
            Create the first club so you can scope challenges to it.
          </p>
          <div className="mt-4">
            <Button onClick={openCreate}>Create club</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedClubs.map((club) => (
            <Card
              key={club.id}
              className={`flex flex-wrap items-start justify-between gap-3 p-4 ${
                club.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">
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
                {club.location && (
                  <p className="text-sm text-slate-600">📍 {club.location}</p>
                )}
                {club.description && (
                  <p className="line-clamp-2 text-sm text-slate-700">
                    {club.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => openEdit(club)}
                  className="flex items-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDelete(club)}
                  className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit club" : "Create club"}
      >
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
            placeholder="e.g. Yaba Swim Club"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setAutoSlug(false);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
            required
            placeholder="e.g. yaba-swim-club"
            hint="Lowercase letters, digits, single hyphens. Used in URLs."
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
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="What is this club about?"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Active (visible in pickers)
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editingId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
