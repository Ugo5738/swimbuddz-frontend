"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  AdminTestimonial,
  TESTIMONIAL_TRACKS,
  TestimonialCreate,
  TestimonialTrack,
  TestimonialsApi,
} from "@/lib/communications";
import { useEffect, useState } from "react";

type FormState = TestimonialCreate & {
  // UI-only helpers
  _editingId?: string | null;
};

const emptyForm: FormState = {
  author_name: "",
  author_role: "",
  author_since: "",
  author_initials: "",
  author_photo_url: "",
  quote: "",
  tracks: ["academy"],
  is_published: false,
  sort_order: 100,
  consent_note: "",
  _editingId: null,
};

function computeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await TestimonialsApi.listAdmin();
      setItems(data ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load testimonials",
      );
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ ...emptyForm });
    setError(null);
    setMessage(null);
    setModalOpen(true);
  }

  function openEdit(t: AdminTestimonial) {
    setForm({
      _editingId: t.id,
      author_name: t.author_name,
      author_role: t.author_role,
      author_since: t.author_since ?? "",
      author_initials: t.author_initials,
      author_photo_url: t.author_photo_url ?? "",
      quote: t.quote,
      tracks: t.tracks,
      is_published: t.is_published,
      sort_order: t.sort_order,
      consent_note: t.consent_note ?? "",
    });
    setError(null);
    setMessage(null);
    setModalOpen(true);
  }

  function toggleTrack(track: TestimonialTrack) {
    setForm((f) => {
      const has = f.tracks.includes(track);
      return {
        ...f,
        tracks: has
          ? f.tracks.filter((t) => t !== track)
          : [...f.tracks, track],
      };
    });
  }

  async function handleSave() {
    setError(null);
    setMessage(null);

    // Validation
    if (!form.author_name.trim()) {
      setError("Author name is required.");
      return;
    }
    if (!form.author_role.trim()) {
      setError("Author role is required.");
      return;
    }
    if (!form.author_initials.trim()) {
      setError("Author initials are required (max 4 chars).");
      return;
    }
    if (form.quote.trim().length < 10) {
      setError("Quote must be at least 10 characters.");
      return;
    }
    if (form.tracks.length === 0) {
      setError("Pick at least one track.");
      return;
    }

    const payload: TestimonialCreate = {
      author_name: form.author_name.trim(),
      author_role: form.author_role.trim(),
      author_since: form.author_since?.trim() || null,
      author_initials: form.author_initials.trim().toUpperCase(),
      author_photo_url: form.author_photo_url?.trim() || null,
      quote: form.quote.trim(),
      tracks: form.tracks,
      is_published: form.is_published,
      sort_order: form.sort_order ?? 100,
      consent_note: form.consent_note?.trim() || null,
    };

    setSaving(true);
    try {
      if (form._editingId) {
        await TestimonialsApi.update(form._editingId, payload);
        setMessage("Testimonial updated.");
      } else {
        await TestimonialsApi.create(payload);
        setMessage("Testimonial created.");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: AdminTestimonial) {
    if (
      !window.confirm(
        `Delete testimonial from "${t.author_name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await TestimonialsApi.delete(t.id);
      setMessage("Testimonial deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  async function togglePublished(t: AdminTestimonial) {
    try {
      await TestimonialsApi.update(t.id, { is_published: !t.is_published });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Testimonials</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Manage text testimonials shown on public landing pages. Only
            publish content with explicit member consent.
          </p>
        </div>
        <Button onClick={openNew}>+ New Testimonial</Button>
      </header>

      {message && (
        <Alert variant="success">{message}</Alert>
      )}
      {error && !modalOpen && (
        <Alert variant="error">{error}</Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600 mb-4">No testimonials yet.</p>
          <Button onClick={openNew}>Create your first testimonial</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {t.author_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.author_photo_url}
                      alt={t.author_name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {t.author_initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {t.author_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {t.author_role}
                      {t.author_since ? ` · since ${t.author_since}` : ""}
                    </p>
                  </div>
                </div>
                {t.is_published ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Published
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    Draft
                  </Badge>
                )}
              </div>

              <blockquote className="text-sm text-slate-700 italic leading-relaxed line-clamp-3 border-l-2 border-slate-200 pl-3">
                {t.quote}
              </blockquote>

              <div className="flex flex-wrap gap-1">
                {t.tracks.map((tr) => (
                  <Badge
                    key={tr}
                    className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200 capitalize"
                  >
                    {tr}
                  </Badge>
                ))}
                <Badge className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 ml-auto">
                  sort: {t.sort_order}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(t)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePublished(t)}
                >
                  {t.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(t)}
                  className="ml-auto"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form._editingId ? "Edit Testimonial" : "New Testimonial"}
      >
        <div className="space-y-4">
          {error && modalOpen && <Alert variant="error">{error}</Alert>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Author Name
              </label>
              <Input
                value={form.author_name}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({
                    ...f,
                    author_name: val,
                    // Auto-fill initials if empty/matches prior auto-fill
                    author_initials:
                      !f.author_initials ||
                      f.author_initials === computeInitials(f.author_name)
                        ? computeInitials(val)
                        : f.author_initials,
                  }));
                }}
                placeholder="Uche"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Initials (max 4)
              </label>
              <Input
                value={form.author_initials}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    author_initials: e.target.value.slice(0, 4).toUpperCase(),
                  }))
                }
                placeholder="UO"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Role
              </label>
              <Input
                value={form.author_role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author_role: e.target.value }))
                }
                placeholder="Academy Graduate"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Since (year, optional)
              </label>
              <Input
                value={form.author_since ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author_since: e.target.value }))
                }
                placeholder="2025"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Photo URL (optional)
            </label>
            <Input
              value={form.author_photo_url ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, author_photo_url: e.target.value }))
              }
              placeholder="https://…"
            />
            <p className="text-xs text-slate-500 mt-1">
              Falls back to initials avatar when empty.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Quote
            </label>
            <Textarea
              value={form.quote}
              onChange={(e) =>
                setForm((f) => ({ ...f, quote: e.target.value }))
              }
              placeholder="When I joined, I couldn't put my face in the water…"
              rows={4}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
              Tracks (which pages can show this)
            </label>
            <div className="flex flex-wrap gap-4">
              {TESTIMONIAL_TRACKS.map((t) => (
                <label
                  key={t}
                  className="inline-flex items-center gap-2 text-sm text-slate-700 capitalize cursor-pointer"
                >
                  <Checkbox
                    checked={form.tracks.includes(t)}
                    onChange={() => toggleTrack(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
                Sort Order (lower first)
              </label>
              <Input
                type="number"
                value={form.sort_order ?? 100}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sort_order: parseInt(e.target.value) || 100,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2">
                <Checkbox
                  checked={form.is_published ?? false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_published: e.target.checked,
                    }))
                  }
                />
                Published (visible on public pages)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 block">
              Consent Note (internal audit)
            </label>
            <Textarea
              value={form.consent_note ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, consent_note: e.target.value }))
              }
              placeholder="e.g. Verbal consent via WhatsApp, Mar 2026"
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving…"
                : form._editingId
                  ? "Save Changes"
                  : "Create Testimonial"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
