"use client";

import { parseBlockContent, serializeBlocks } from "@/components/editor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClubPicker } from "@/components/ui/ClubPicker";
import { CohortPicker } from "@/components/ui/CohortPicker";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { getCurrentAccessToken } from "@/lib/auth";
import { apiEndpoints } from "@/lib/config";
import { PartialBlock } from "@blocknote/core";
import {
  Calendar,
  ClipboardCheck,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// BlockNote pulls in browser-only deps; load on the client only.
const BlockEditor = dynamic(
  () =>
    import("@/components/editor/BlockEditor").then((mod) => ({
      default: mod.BlockEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
    ),
  },
);

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const CHALLENGE_TYPES = [
  { value: "time_trial", label: "Time Trial" },
  { value: "attendance", label: "Attendance" },
  { value: "distance", label: "Distance" },
  { value: "technique", label: "Technique" },
] as const;

const AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "community", label: "Community" },
  { value: "club", label: "Club" },
  { value: "academy", label: "Academy" },
] as const;

const FORMATS = [
  {
    value: "participatory",
    label: "Participatory — anyone who completes earns the badge",
  },
  {
    value: "competition",
    label: "Competition — admin picks one winner",
  },
] as const;

type ChallengeType = (typeof CHALLENGE_TYPES)[number]["value"];
type Audience = (typeof AUDIENCES)[number]["value"];
type Format = (typeof FORMATS)[number]["value"];

interface ExampleMediaItem {
  media_id: string;
  order_idx: number;
  caption: string | null;
  // present on responses only
  id?: string;
  file_url?: string | null;
  thumbnail_url?: string | null;
}

interface ClubChallenge {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  challenge_type: ChallengeType;
  badge_name: string;
  reward_badge_image_media_id: string | null;
  badge_image_url: string | null;
  reward_bubbles_amount: number | null;
  reward_volunteer_hours: number | null;
  audience: Audience;
  club_id: string | null;
  academy_cohort_id: string | null;
  format: Format;
  winner_submission_id: string | null;
  is_active: boolean;
  is_public: boolean;
  show_winner_media_publicly: boolean;
  starts_at: string | null;
  ends_at: string | null;
  team_enabled: boolean;
  team_min_size: number | null;
  team_max_size: number | null;
  example_media: ExampleMediaItem[];
  completion_count: number;
  submission_count: number;
}

interface FormState {
  title: string;
  description: string;
  instructions_blocks: PartialBlock[];
  challenge_type: ChallengeType;
  badge_name: string;
  reward_badge_image_media_id: string | null;
  reward_bubbles_amount: string; // as string for the input; coerced on submit
  reward_volunteer_hours: string;
  audience: Audience;
  club_id: string;
  academy_cohort_id: string;
  format: Format;
  is_active: boolean;
  is_public: boolean;
  show_winner_media_publicly: boolean;
  starts_at: string; // datetime-local string
  ends_at: string;
  team_enabled: boolean;
  team_min_size: string;
  team_max_size: string;
  example_media: ExampleMediaItem[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  instructions_blocks: [],
  challenge_type: "technique",
  badge_name: "",
  reward_badge_image_media_id: null,
  reward_bubbles_amount: "",
  reward_volunteer_hours: "",
  audience: "all",
  club_id: "",
  academy_cohort_id: "",
  format: "participatory",
  is_active: true,
  is_public: true,
  show_winner_media_publicly: true,
  starts_at: "",
  ends_at: "",
  team_enabled: false,
  team_min_size: "",
  team_max_size: "",
  example_media: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function authedFetch(url: string, init: RequestInit = {}) {
  const token = await getCurrentAccessToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...init, headers });
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Convert ISO timestamp to a local "YYYY-MM-DDTHH:mm" string for the input
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(local: string): string | null {
  if (!local) return null;
  // datetime-local strings have no timezone — interpret as local then send ISO
  return new Date(local).toISOString();
}

function nullableInt(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function nullableFloat(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function nullableUuid(s: string): string | null {
  const t = s.trim();
  return t.length ? t : null;
}

function nullableString(s: string): string | null {
  const t = s.trim();
  return t.length ? t : null;
}

function challengeToForm(c: ClubChallenge): FormState {
  let blocks: PartialBlock[] = [];
  if (c.instructions) {
    const parsed = parseBlockContent(c.instructions);
    if (parsed) blocks = parsed;
  }
  return {
    title: c.title,
    description: c.description ?? "",
    instructions_blocks: blocks,
    challenge_type: c.challenge_type,
    badge_name: c.badge_name,
    reward_badge_image_media_id: c.reward_badge_image_media_id,
    reward_bubbles_amount:
      c.reward_bubbles_amount == null ? "" : String(c.reward_bubbles_amount),
    reward_volunteer_hours:
      c.reward_volunteer_hours == null ? "" : String(c.reward_volunteer_hours),
    audience: c.audience,
    club_id: c.club_id ?? "",
    academy_cohort_id: c.academy_cohort_id ?? "",
    format: c.format,
    is_active: c.is_active,
    is_public: c.is_public,
    show_winner_media_publicly: c.show_winner_media_publicly,
    starts_at: toDateTimeLocal(c.starts_at),
    ends_at: toDateTimeLocal(c.ends_at),
    team_enabled: c.team_enabled,
    team_min_size: c.team_min_size == null ? "" : String(c.team_min_size),
    team_max_size: c.team_max_size == null ? "" : String(c.team_max_size),
    example_media: c.example_media.map((m, idx) => ({
      media_id: m.media_id,
      order_idx: m.order_idx ?? idx,
      caption: m.caption ?? null,
      id: m.id,
      file_url: m.file_url ?? null,
      thumbnail_url: m.thumbnail_url ?? null,
    })),
  };
}

function formToPayload(f: FormState) {
  const instructions = f.instructions_blocks.length
    ? serializeBlocks(f.instructions_blocks)
    : null;
  return {
    title: f.title.trim(),
    description: nullableString(f.description),
    instructions,
    challenge_type: f.challenge_type,
    badge_name: f.badge_name.trim(),
    reward_badge_image_media_id: f.reward_badge_image_media_id,
    reward_bubbles_amount: nullableInt(f.reward_bubbles_amount),
    reward_volunteer_hours: nullableFloat(f.reward_volunteer_hours),
    audience: f.audience,
    club_id: nullableUuid(f.club_id),
    academy_cohort_id: nullableUuid(f.academy_cohort_id),
    format: f.format,
    is_active: f.is_active,
    is_public: f.is_public,
    show_winner_media_publicly: f.show_winner_media_publicly,
    starts_at: fromDateTimeLocal(f.starts_at),
    ends_at: fromDateTimeLocal(f.ends_at),
    team_enabled: f.team_enabled,
    team_min_size: f.team_enabled ? nullableInt(f.team_min_size) : null,
    team_max_size: f.team_enabled ? nullableInt(f.team_max_size) : null,
    example_media: f.example_media.map((m, idx) => ({
      media_id: m.media_id,
      order_idx: idx,
      caption: m.caption,
    })),
  };
}

// ---------------------------------------------------------------------------
// Subcomponent: example media list
// ---------------------------------------------------------------------------

// Heuristic: identify videos by file extension on the URL. The media
// service doesn't return a `media_type` flag inline on the example/proof
// join rows; this is good enough for the admin preview.
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".avi",
  ".mkv",
  ".ogv",
];

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const stripped = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => stripped.endsWith(ext));
}

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
      <div
        className={`flex items-center justify-center bg-slate-100 ${className ?? ""}`}
      >
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
  return <img src={url} alt={alt} className={`object-cover ${className ?? ""}`} />;
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
    onChange(
      items.map((m, i) => (i === idx ? { ...m, caption: caption || null } : m)),
    );
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
                <p className="break-all text-xs text-slate-400">
                  media_id: {m.media_id}
                </p>
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
        <p className="mb-2 text-sm font-medium text-slate-700">
          Add example media
        </p>
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
        {stagingError && (
          <p className="mt-2 text-sm text-red-600">{stagingError}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      // Trailing slash on the collection root avoids a 307 redirect to
      // `/challenges/` that the proxy rewrites to http:// (mixed content).
      const response = await authedFetch(
        `${apiEndpoints.challenges}/?active_only=false`,
      );
      if (response.ok) {
        const data: ClubChallenge[] = await response.json();
        setChallenges(data);
      } else {
        console.error("Failed to fetch challenges:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (challenge: ClubChallenge) => {
    setEditingId(challenge.id);
    setForm(challengeToForm(challenge));
    setSaveError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload = formToPayload(form);
      // Light client-side validation
      if (!payload.title) {
        throw new Error("Title is required");
      }
      if (!payload.badge_name) {
        throw new Error("Badge name is required");
      }
      if (
        payload.team_enabled &&
        payload.team_min_size != null &&
        payload.team_max_size != null &&
        payload.team_min_size > payload.team_max_size
      ) {
        throw new Error("Min team size cannot exceed max team size");
      }
      if (
        payload.starts_at &&
        payload.ends_at &&
        new Date(payload.starts_at) > new Date(payload.ends_at)
      ) {
        throw new Error("Start time cannot be after end time");
      }

      const url = editingId
        ? `${apiEndpoints.challenges}/${editingId}`
        : `${apiEndpoints.challenges}/`; // trailing slash for the create POST
      const method = editingId ? "PATCH" : "POST";

      const response = await authedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.detail ||
            `Save failed (${response.status} ${response.statusText})`,
        );
      }

      await fetchChallenges();
      closeForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (
    challenge: ClubChallenge,
  ): Promise<void> => {
    try {
      const response = await authedFetch(
        `${apiEndpoints.challenges}/${challenge.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: !challenge.is_active }),
        },
      );
      if (response.ok) await fetchChallenges();
    } catch (error) {
      console.error("Failed to toggle challenge status:", error);
    }
  };

  const handleDelete = async (challenge: ClubChallenge) => {
    if (
      !confirm(
        `Delete "${challenge.title}"? Existing submissions and media will also be removed.`,
      )
    )
      return;
    try {
      const response = await authedFetch(
        `${apiEndpoints.challenges}/${challenge.id}`,
        { method: "DELETE" },
      );
      if (response.ok) await fetchChallenges();
    } catch (error) {
      console.error("Failed to delete challenge:", error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Club Challenge Management
          </h1>
          <p className="mt-2 text-slate-600">
            Create and manage challenges, badges, and submission rewards
          </p>
        </div>
        {!showForm && (
          <div className="flex w-fit items-center gap-2">
            <Link href="/admin/community/challenges/submissions">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                Review submissions
              </Button>
            </Link>
            <Button
              onClick={openCreate}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Challenge
            </Button>
          </div>
        )}
      </header>

      {showForm && (
        <ChallengeForm
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          onCancel={closeForm}
          editing={!!editingId}
          saving={saving}
          error={saveError}
        />
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-600">
          Loading challenges...
        </div>
      ) : challenges.length === 0 && !showForm ? (
        <Card className="p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No challenges yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Create your first challenge to get started.
          </p>
        </Card>
      ) : challenges.length > 0 ? (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onEdit={() => openEdit(challenge)}
              onToggle={() => handleToggleActive(challenge)}
              onDelete={() => handleDelete(challenge)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponent: rendered challenge card
// ---------------------------------------------------------------------------

function ChallengeCard({
  challenge,
  onEdit,
  onToggle,
  onDelete,
}: {
  challenge: ClubChallenge;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50 text-amber-600">
            {challenge.badge_image_url ? (
              <img
                src={challenge.badge_image_url}
                alt={challenge.badge_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Trophy className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {challenge.title}
              </h3>
              <Chip color={challenge.is_active ? "green" : "gray"}>
                {challenge.is_active ? "Active" : "Inactive"}
              </Chip>
              <Chip color="cyan">{challenge.challenge_type}</Chip>
              <Chip color="indigo">{challenge.audience}</Chip>
              <Chip color={challenge.format === "competition" ? "rose" : "blue"}>
                {challenge.format}
              </Chip>
              {challenge.is_public && <Chip color="violet">public</Chip>}
              {challenge.team_enabled && <Chip color="amber">team</Chip>}
            </div>

            {challenge.badge_name && (
              <div className="inline-flex items-center gap-1 text-sm text-amber-700">
                🏅 <span className="font-medium">{challenge.badge_name}</span>
              </div>
            )}

            {challenge.description && (
              <p className="text-sm text-slate-700">{challenge.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>
                <strong>{challenge.completion_count}</strong> approved
              </span>
              <span>
                <strong>{challenge.submission_count}</strong> submitted
              </span>
              {challenge.reward_bubbles_amount != null && (
                <span>💧 {challenge.reward_bubbles_amount} Bubbles</span>
              )}
              {challenge.reward_volunteer_hours != null && (
                <span>⏱ {challenge.reward_volunteer_hours} hrs</span>
              )}
              {challenge.starts_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(challenge.starts_at).toLocaleDateString()}
                  {challenge.ends_at &&
                    ` – ${new Date(challenge.ends_at).toLocaleDateString()}`}
                </span>
              )}
              {challenge.team_enabled && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {challenge.team_min_size ?? 1}–{challenge.team_max_size ?? "∞"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={onToggle}>
            {challenge.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="secondary"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Chip({
  children,
  color,
}: {
  children: React.ReactNode;
  color:
    | "green"
    | "gray"
    | "cyan"
    | "indigo"
    | "rose"
    | "blue"
    | "violet"
    | "amber";
}) {
  const palette: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-slate-100 text-slate-600",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${palette[color]}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Subcomponent: the create/edit form
// ---------------------------------------------------------------------------

function ChallengeForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  editing,
  saving,
  error,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  editing: boolean;
  saving: boolean;
  error: string | null;
}) {
  // Stable initial content so BlockEditor doesn't re-mount on every keystroke
  const editorInitial = useMemo(
    () => form.instructions_blocks,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing], // re-init when entering edit mode for a different challenge
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
              onChange={(e) =>
                setForm({ ...form, badge_name: e.target.value })
              }
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
            onChange={(blocks) =>
              setForm((prev) => ({ ...prev, instructions_blocks: blocks }))
            }
            placeholder="Describe the challenge, rules, and tips…"
          />
        </Section>

        <Section title="Example Media">
          <p className="text-sm text-slate-500">
            Upload one or more photos/videos demonstrating the challenge.
            Members see these on the detail page.
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
              onChange={(e) =>
                setForm({ ...form, audience: e.target.value as Audience })
              }
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
              onChange={(clubId) =>
                setForm({ ...form, club_id: clubId ?? "" })
              }
              placeholder="Any club"
              helpText="Leave blank to apply to all clubs in the audience tier."
            />
            <CohortPicker
              label="Academy Cohort (optional)"
              value={form.academy_cohort_id || null}
              onChange={(cohortId) =>
                setForm({ ...form, academy_cohort_id: cohortId ?? "" })
              }
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
            onChange={(e) =>
              setForm({ ...form, format: e.target.value as Format })
            }
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
              onChange={(e) =>
                setForm({ ...form, starts_at: e.target.value })
              }
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </div>
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
                onChange={(v) =>
                  setForm({ ...form, show_winner_media_publicly: v })
                }
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
                  onClick={() =>
                    setForm({ ...form, reward_badge_image_media_id: null })
                  }
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
                onChange={(e) =>
                  setForm({ ...form, team_min_size: e.target.value })
                }
                placeholder="e.g. 2"
              />
              <Input
                label="Max team size"
                type="number"
                min={1}
                value={form.team_max_size}
                onChange={(e) =>
                  setForm({ ...form, team_max_size: e.target.value })
                }
                placeholder="e.g. 4"
              />
            </div>
          )}
        </Section>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : editing
                ? "Save Changes"
                : "Create Challenge"}
          </Button>
        </div>
      </form>
    </Card>
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
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
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
