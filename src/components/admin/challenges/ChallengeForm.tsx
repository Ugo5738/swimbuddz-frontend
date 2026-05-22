"use client";

/**
 * Admin Challenge form — shared between create and edit routes.
 *
 * The list page (`/admin/community/challenges`) no longer hosts the form
 * inline; instead it links to `/new` and `/[id]/edit`, each of which
 * renders this component. The hosting page owns the submit handler and
 * the redirect-on-success behaviour — keeps this component dumb.
 *
 * The prerequisite picker only offers challenges that share the same
 * `series_slug` (a hard-gate to a different ladder makes no sense), so
 * the hosting page also passes `allChallenges` for that filter.
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClubPicker } from "@/components/ui/ClubPicker";
import { CohortPicker } from "@/components/ui/CohortPicker";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { useMemo, useState } from "react";
import {
  AUDIENCES,
  CHALLENGE_TYPES,
  ClubChallenge,
  ExampleMediaItem,
  FORMATS,
  FormState,
  isVideoUrl,
  type Audience,
  type ChallengeType,
  type Format,
} from "./types";

// BlockNote pulls in browser-only deps; load on the client only.
const BlockEditor = dynamic(
  () =>
    import("@/components/editor/BlockEditor").then((mod) => ({
      default: mod.BlockEditor,
    })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-slate-100" />,
  }
);

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function ChallengeForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  editing,
  editingId,
  saving,
  error,
  allChallenges,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  editing: boolean;
  editingId: string | null;
  saving: boolean;
  error: string | null;
  allChallenges: ClubChallenge[];
}) {
  // Prerequisite picker only offers challenges in the SAME series — a
  // hard-gate to a challenge in a different series doesn't make sense.
  // Empty when this isn't a series challenge yet (no series_slug).
  const prerequisiteOptions = useMemo(() => {
    const slug = form.series_slug.trim();
    if (!slug) return [];
    return allChallenges
      .filter((c) => c.series_slug === slug && c.id !== editingId)
      .sort(
        (a, b) =>
          (a.series_order ?? Number.MAX_SAFE_INTEGER) - (b.series_order ?? Number.MAX_SAFE_INTEGER)
      );
  }, [allChallenges, form.series_slug, editingId]);

  // Stable initial content so BlockEditor doesn't re-mount on every keystroke
  const editorInitial = useMemo(
    () => form.instructions_blocks,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing] // re-init when entering edit mode for a different challenge
  );

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {editing ? "Edit Challenge" : "Create Club Challenge"}
        </h2>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Section title="Basics">
          <Input
            label="Challenge Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="e.g., Bottle Balance Backstroke"
          />
          <Textarea
            label="Short Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="One-line summary shown in lists and cards"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Challenge Type"
              value={form.challenge_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  challenge_type: e.target.value as ChallengeType,
                })
              }
              required
            >
              {CHALLENGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Input
              label="Badge Name"
              value={form.badge_name}
              onChange={(e) => setForm({ ...form, badge_name: e.target.value })}
              required
              placeholder="e.g., Iron Lung, Bottle Balancer"
            />
          </div>
        </Section>

        <Section
          title="Instructions"
          description="Rich text shown on the challenge detail page (BlockNote — type '/' for blocks)."
        >
          <BlockEditor
            initialContent={editorInitial}
            onChange={(blocks) => setForm((prev) => ({ ...prev, instructions_blocks: blocks }))}
            placeholder="Describe the challenge, rules, and tips…"
          />
        </Section>

        <Section title="Example Media">
          <p className="text-sm text-slate-500">
            Upload one or more photos/videos demonstrating the challenge. Members see these on the
            detail page.
          </p>
          <ExampleMediaList
            items={form.example_media}
            onChange={(next) => setForm({ ...form, example_media: next })}
          />
        </Section>

        <Section
          title="Audience & Scope"
          description="Audience tier filters who sees the challenge. Optionally narrow to a specific club or academy cohort."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Audience"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
            <ClubPicker
              label="Club (optional)"
              value={form.club_id || null}
              onChange={(clubId) => setForm({ ...form, club_id: clubId ?? "" })}
              placeholder="Any club"
              helpText="Leave blank to apply to all clubs in the audience tier."
            />
            <CohortPicker
              label="Academy Cohort (optional)"
              value={form.academy_cohort_id || null}
              onChange={(cohortId) => setForm({ ...form, academy_cohort_id: cohortId ?? "" })}
              placeholder="Any cohort"
              helpText="Leave blank to apply to all cohorts in the audience tier."
            />
          </div>
        </Section>

        <Section
          title="Format"
          description="Participatory awards the badge to anyone approved. Competition lets the admin pick a single winner."
        >
          <Select
            label="Format"
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value as Format })}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Section>

        <Section title="Schedule (optional)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts at"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </div>
        </Section>

        <Section
          title="Skill Ladder (optional)"
          description="Group challenges into an ordered ladder. Members see ladders on the Club page and track progression on their profile. Leave the slug empty for a standalone challenge."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Series slug"
              value={form.series_slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  series_slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .slice(0, 64),
                })
              }
              placeholder="e.g. club-fundamentals"
              hint="Lowercase letters, digits, hyphens. All challenges sharing a slug form one ladder."
            />
            <Input
              label="Step number"
              type="number"
              min={1}
              value={form.series_order}
              onChange={(e) => setForm({ ...form, series_order: e.target.value })}
              placeholder="e.g. 1"
              disabled={!form.series_slug.trim()}
              hint="Position in the ladder. 1 = first step."
            />
          </div>
          {form.series_slug.trim() && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Prerequisite (hard gating — optional)
              </label>
              <Select
                value={form.requires_challenge_id}
                onChange={(e) => setForm({ ...form, requires_challenge_id: e.target.value })}
              >
                <option value="">No prerequisite (soft progression)</option>
                {prerequisiteOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.series_order ? `${c.series_order}. ` : ""}
                    {c.title}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">
                If set, members must have an approved badge for the prerequisite before they can
                submit this step. Leave on &quot;No prerequisite&quot; for the recommended
                soft-progression model — order is suggested, not enforced.
              </p>
            </div>
          )}
        </Section>

        <Section title="Visibility">
          <div className="space-y-2">
            <Checkbox
              label="Active (visible to members)"
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Checkbox
              label="Public — show on the public landing page"
              checked={form.is_public}
              onChange={(v) => setForm({ ...form, is_public: v })}
            />
            {form.format === "competition" && (
              <Checkbox
                label="Show winner's submission media publicly"
                checked={form.show_winner_media_publicly}
                onChange={(v) => setForm({ ...form, show_winner_media_publicly: v })}
              />
            )}
          </div>
        </Section>

        <Section
          title="Rewards"
          description="The badge is always awarded. Bubbles credits and volunteer hours are optional — leave blank to skip."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Badge image (optional)
              </label>
              <MediaInput
                purpose="badge_image"
                mode="upload-only"
                value={form.reward_badge_image_media_id}
                onChange={(mediaId) =>
                  setForm({
                    ...form,
                    reward_badge_image_media_id: mediaId,
                  })
                }
              />
              {form.reward_badge_image_media_id && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reward_badge_image_media_id: null })}
                  className="mt-1 text-xs text-red-600 hover:underline"
                >
                  Remove badge image
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Input
                label="Bubbles reward (optional)"
                type="number"
                min={0}
                value={form.reward_bubbles_amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reward_bubbles_amount: e.target.value,
                  })
                }
                placeholder="e.g. 50"
              />
              <Input
                label="Volunteer hours reward (optional)"
                type="number"
                min={0}
                step="0.25"
                value={form.reward_volunteer_hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reward_volunteer_hours: e.target.value,
                  })
                }
                placeholder="e.g. 1.5"
              />
            </div>
          </div>
        </Section>

        <Section title="Team Submissions">
          <Checkbox
            label="Allow team submissions"
            checked={form.team_enabled}
            onChange={(v) => setForm({ ...form, team_enabled: v })}
          />
          {form.team_enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Min team size"
                type="number"
                min={1}
                value={form.team_min_size}
                onChange={(e) => setForm({ ...form, team_min_size: e.target.value })}
                placeholder="e.g. 2"
              />
              <Input
                label="Max team size"
                type="number"
                min={1}
                value={form.team_max_size}
                onChange={(e) => setForm({ ...form, team_max_size: e.target.value })}
                placeholder="e.g. 4"
              />
            </div>
          )}
        </Section>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Challenge"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function MediaPreview({
  url,
  alt,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className ?? ""}`}>
        <ImageIcon className="h-7 w-7 text-slate-400" />
      </div>
    );
  }
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className={`bg-slate-900 ${className ?? ""}`}
      />
    );
  }
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <NextImage src={url} alt={alt} fill sizes="160px" className="object-cover" />
    </div>
  );
}

function ExampleMediaList({
  items,
  onChange,
}: {
  items: ExampleMediaItem[];
  onChange: (next: ExampleMediaItem[]) => void;
}) {
  const [stagingError, setStagingError] = useState<string | null>(null);

  const removeAt = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateCaption = (idx: number, caption: string) => {
    onChange(items.map((m, i) => (i === idx ? { ...m, caption: caption || null } : m)));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((m, idx) => {
          const previewUrl = m.thumbnail_url || m.file_url || null;
          const isVideo = isVideoUrl(previewUrl);
          return (
            <div
              key={m.media_id + ":" + idx}
              className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-start"
            >
              <div
                className={`shrink-0 overflow-hidden rounded ${
                  isVideo ? "w-full sm:w-64" : "h-20 w-20"
                }`}
              >
                <MediaPreview
                  url={previewUrl}
                  alt={m.caption || "Example media"}
                  className={isVideo ? "h-40 w-full" : "h-20 w-20"}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  label="Caption (optional)"
                  value={m.caption ?? ""}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  placeholder="What does this clip show?"
                />
                <p className="break-all text-xs text-slate-400">media_id: {m.media_id}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeAt(idx)}
                className="shrink-0 text-red-600 hover:bg-red-50"
                aria-label="Remove media"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-dashed border-slate-300 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Add example media</p>
        <MediaInput
          purpose="challenge_example"
          mode="upload-only"
          showPreview={false}
          onError={setStagingError}
          onChange={(mediaId, fileUrl) => {
            if (!mediaId) return;
            onChange([
              ...items,
              {
                media_id: mediaId,
                order_idx: items.length,
                caption: null,
                file_url: fileUrl ?? null,
                thumbnail_url: fileUrl ?? null,
              },
            ]);
          }}
        />
        {stagingError && <p className="mt-2 text-sm text-red-600">{stagingError}</p>}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-slate-100 pb-5 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}
