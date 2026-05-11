/**
 * Shared types, constants, and helpers for the admin Challenge form.
 *
 * Used by:
 *   - /admin/community/challenges (list view) — reads ClubChallenge
 *   - /admin/community/challenges/new (create)
 *   - /admin/community/challenges/[id]/edit (edit)
 *
 * The form is identical on create and edit; only the submit verb and
 * the initial state differ. Centralising the shape + the conversions
 * here keeps the two route pages thin.
 */

import { parseBlockContent, serializeBlocks } from "@/components/editor";
import { getCurrentAccessToken } from "@/lib/auth";
import type { PartialBlock } from "@blocknote/core";

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

export const CHALLENGE_TYPES = [
  { value: "time_trial", label: "Time Trial" },
  { value: "attendance", label: "Attendance" },
  { value: "distance", label: "Distance" },
  { value: "technique", label: "Technique" },
] as const;

export const AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "community", label: "Community" },
  { value: "club", label: "Club" },
  { value: "academy", label: "Academy" },
] as const;

export const FORMATS = [
  {
    value: "participatory",
    label: "Participatory — anyone who completes earns the badge",
  },
  {
    value: "competition",
    label: "Competition — admin picks one winner",
  },
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number]["value"];
export type Audience = (typeof AUDIENCES)[number]["value"];
export type Format = (typeof FORMATS)[number]["value"];

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ExampleMediaItem {
  media_id: string;
  order_idx: number;
  caption: string | null;
  // present on responses only
  id?: string;
  file_url?: string | null;
  thumbnail_url?: string | null;
}

export interface ClubChallenge {
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
  // Skill-ladder series (Phase B). All optional.
  series_slug: string | null;
  series_order: number | null;
  requires_challenge_id: string | null;
  completion_count: number;
  submission_count: number;
}

export interface FormState {
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
  // Skill-ladder series (Phase B). All optional.
  series_slug: string;
  series_order: string; // numeric input as string until parse on submit
  requires_challenge_id: string; // empty = no prerequisite (soft progression)
}

export const EMPTY_FORM: FormState = {
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
  series_slug: "",
  series_order: "",
  requires_challenge_id: "",
};

// ---------------------------------------------------------------------------
// Auth/fetch helper
// ---------------------------------------------------------------------------

export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
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

// ---------------------------------------------------------------------------
// Date + nullable coercion helpers
// ---------------------------------------------------------------------------

export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Convert ISO timestamp to a local "YYYY-MM-DDTHH:mm" string for the input
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(local: string): string | null {
  if (!local) return null;
  // datetime-local strings have no timezone — interpret as local then send ISO
  return new Date(local).toISOString();
}

export function nullableInt(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function nullableFloat(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function nullableUuid(s: string): string | null {
  const t = s.trim();
  return t.length ? t : null;
}

export function nullableString(s: string): string | null {
  const t = s.trim();
  return t.length ? t : null;
}

// ---------------------------------------------------------------------------
// Conversions between API + form shape
// ---------------------------------------------------------------------------

export function challengeToForm(c: ClubChallenge): FormState {
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
    reward_bubbles_amount: c.reward_bubbles_amount == null ? "" : String(c.reward_bubbles_amount),
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
    series_slug: c.series_slug ?? "",
    series_order: c.series_order == null ? "" : String(c.series_order),
    requires_challenge_id: c.requires_challenge_id ?? "",
  };
}

export function formToPayload(f: FormState) {
  const instructions = f.instructions_blocks.length ? serializeBlocks(f.instructions_blocks) : null;
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
    // Skill-ladder series. series_slug is the trigger — if empty, send
    // null for everything (a non-ladder challenge). Backend treats nulls
    // as "this challenge is standalone."
    series_slug: nullableString(f.series_slug),
    series_order: f.series_slug.trim() ? nullableInt(f.series_order) : null,
    requires_challenge_id: f.series_slug.trim() ? nullableUuid(f.requires_challenge_id) : null,
  };
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

// Heuristic: identify videos by file extension on the URL. The media
// service doesn't return a `media_type` flag inline on the example/proof
// join rows; this is good enough for the admin preview.
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".ogv"];

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const stripped = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => stripped.endsWith(ext));
}
