/**
 * Typed client for the challenges surface.
 *
 * Mirrors the response shapes from
 *   swimbuddz-backend/services/members_service/schemas/challenge.py.
 *
 * All requests authenticate via the bearer token from `getCurrentAccessToken`.
 * GET /challenges itself is open today (the backend leaves reads public so the
 * public landing-page surface can render). The submission and review
 * endpoints are auth-gated.
 */

import { getCurrentAccessToken } from "./auth";
import { apiEndpoints } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChallengeType =
  | "time_trial"
  | "attendance"
  | "distance"
  | "technique";
export type Audience = "community" | "club" | "academy" | "all";
export type Format = "participatory" | "competition";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface ExampleMedia {
  id?: string;
  media_id: string;
  order_idx: number;
  caption: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
}

export interface ProofMedia {
  id?: string;
  media_id: string;
  order_idx: number;
  file_url: string | null;
  thumbnail_url: string | null;
}

export interface ProofMediaInput {
  media_id: string;
  order_idx?: number;
}

export interface ChallengeSubmissionMember {
  id: string;
  member_id: string;
  member_name: string | null;
  role: string | null;
  badge_awarded: boolean;
  bubbles_grant_id: string | null;
  volunteer_hours_log_id: string | null;
  rewarded_at: string | null;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  challenge_title: string | null;
  member_id: string;
  member_name: string | null;
  submitted_by_member_id: string | null;
  submission_note: string | null;
  is_team_submission: boolean;
  status: SubmissionStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  rewards_distributed_at: string | null;
  completed_at: string;
  result_data: Record<string, unknown> | null;
  proof_media: ProofMedia[];
  members: ChallengeSubmissionMember[];
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  challenge_type: ChallengeType;
  badge_name: string;
  reward_badge_image_media_id: string | null;
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
  example_media: ExampleMedia[];
  completion_count: number;
  submission_count: number;
  created_at: string;
  updated_at: string;
  // criteria_json kept loose — schema-side it's an arbitrary dict
  criteria_json?: Record<string, unknown> | null;
}

export interface ChallengeSubmissionPayload {
  challenge_id: string;
  submission_note?: string | null;
  proof_media?: ProofMediaInput[];
  team_member_ids?: string[];
  result_data?: Record<string, unknown> | null;
}

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

async function unwrap<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof body?.detail === "string" ? body.detail : `${fallback} (${res.status})`;
    throw new Error(detail);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Reads (public; auth header included if present, ignored by the backend)
// ---------------------------------------------------------------------------

export async function listChallenges(
  options: {
    activeOnly?: boolean;
    challengeType?: ChallengeType;
    audience?: Audience;
  } = {},
): Promise<Challenge[]> {
  const params = new URLSearchParams();
  if (options.activeOnly !== undefined)
    params.set("active_only", String(options.activeOnly));
  if (options.challengeType) params.set("challenge_type", options.challengeType);
  if (options.audience) params.set("audience", options.audience);
  const url = `${apiEndpoints.challenges}${params.toString() ? `?${params}` : ""}`;
  const res = await authedFetch(url);
  return unwrap<Challenge[]>(res, "Failed to load challenges");
}

export async function getChallenge(id: string): Promise<Challenge> {
  const res = await authedFetch(`${apiEndpoints.challenges}/${id}`);
  return unwrap<Challenge>(res, "Failed to load challenge");
}

// ---------------------------------------------------------------------------
// Submissions (auth required)
// ---------------------------------------------------------------------------

export async function submitChallenge(
  payload: ChallengeSubmissionPayload,
): Promise<ChallengeSubmission> {
  const res = await authedFetch(
    `${apiEndpoints.challenges}/${payload.challenge_id}/submissions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return unwrap<ChallengeSubmission>(res, "Failed to submit attempt");
}

export type SubmissionListStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "all";

export async function listSubmissions(
  status: SubmissionListStatus = "pending",
  challengeId?: string,
): Promise<ChallengeSubmission[]> {
  const params = new URLSearchParams();
  params.set("status", status);
  if (challengeId) params.set("challenge_id", challengeId);
  const res = await authedFetch(
    `${apiEndpoints.challenges}/submissions/list?${params}`,
  );
  return unwrap<ChallengeSubmission[]>(res, "Failed to load submissions");
}

/** @deprecated use listSubmissions("pending", ...) instead */
export async function listPendingSubmissions(
  challengeId?: string,
): Promise<ChallengeSubmission[]> {
  return listSubmissions("pending", challengeId);
}

// ---------------------------------------------------------------------------
// Member-side: my earned badges (auth required)
// ---------------------------------------------------------------------------

export interface ChallengeBadgeAward {
  id: string;
  member_id: string;
  challenge_id: string;
  submission_id: string | null;
  badge_name: string;
  badge_image_media_id: string | null;
  badge_image_url: string | null;
  awarded_at: string;
}

export async function listMyBadges(): Promise<ChallengeBadgeAward[]> {
  const res = await authedFetch(`${apiEndpoints.members}/me/badges`);
  return unwrap<ChallengeBadgeAward[]>(res, "Failed to load badges");
}

export async function reviewSubmission(
  submissionId: string,
  status: "approved" | "rejected",
  reviewNote?: string,
): Promise<ChallengeSubmission> {
  const res = await authedFetch(
    `${apiEndpoints.challenges}/submissions/${submissionId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, review_note: reviewNote ?? null }),
    },
  );
  return unwrap<ChallengeSubmission>(res, "Failed to review submission");
}

/**
 * List the authenticated member's submissions. Optionally narrow to a
 * single challenge for the detail page's "your past attempts" panel.
 *
 * Includes team submissions where the member is on the roster — not just
 * ones they created — so a teammate sees attempts they were added to.
 */
export async function listMySubmissions(
  challengeId?: string,
): Promise<ChallengeSubmission[]> {
  const params = new URLSearchParams();
  if (challengeId) params.set("challenge_id", challengeId);
  const url = `${apiEndpoints.challenges}/submissions/mine${
    params.toString() ? `?${params}` : ""
  }`;
  const res = await authedFetch(url);
  return unwrap<ChallengeSubmission[]>(res, "Failed to load your submissions");
}

/**
 * Mark a submission as the winner of its (competition) challenge. Backend
 * also fires an in-app notification to every member on the winning
 * submission's roster.
 */
export async function markSubmissionAsWinner(
  submissionId: string,
): Promise<ChallengeSubmission> {
  const res = await authedFetch(
    `${apiEndpoints.challenges}/submissions/${submissionId}/mark-winner`,
    { method: "POST" },
  );
  return unwrap<ChallengeSubmission>(res, "Failed to mark winner");
}

// ---------------------------------------------------------------------------
// Public surface (no auth required)
// ---------------------------------------------------------------------------

export interface ChallengeWinnerPublicInfo {
  submission_id: string;
  captain_name: string;
  teammate_names: string[];
  is_team_submission: boolean;
  proof_media: ProofMedia[];
}

export interface PublicChallenge {
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
  format: Format;
  starts_at: string | null;
  ends_at: string | null;
  team_enabled: boolean;
  team_min_size: number | null;
  team_max_size: number | null;
  completion_count: number;
  example_media: ExampleMedia[];
  winner: ChallengeWinnerPublicInfo | null;
  is_finished: boolean;
  created_at: string;
}

export type PublicChallengeStatus = "active" | "finished" | "all";

export async function listPublicChallenges(
  status: PublicChallengeStatus = "all",
): Promise<PublicChallenge[]> {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  const url = `${apiEndpoints.challenges}/public/all${
    params.toString() ? `?${params}` : ""
  }`;
  const res = await fetch(url, { cache: "no-store" });
  return unwrap<PublicChallenge[]>(res, "Failed to load challenges");
}

export async function getPublicChallenge(id: string): Promise<PublicChallenge> {
  const res = await fetch(`${apiEndpoints.challenges}/public/${id}`, {
    cache: "no-store",
  });
  return unwrap<PublicChallenge>(res, "Failed to load challenge");
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".avi",
  ".mkv",
  ".ogv",
];

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const stripped = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => stripped.endsWith(ext));
}
