/**
 * Typed client for Club pods (members_service).
 *
 * Pods are 2–5 member persistent training sub-groups within a Club. They're
 * peer-led — exactly one ``Pod Lead`` (required), an optional ``Assistant Pod
 * Lead``, and no coaches (coaches live in the Academy layer). Each pod has
 * a 3-month review cycle and an inherited-from-club default session schedule.
 *
 * See:
 *   - ../../docs/club/POD_OPERATIONS.md (operating model)
 *   - ../../swimbuddz-backend/docs/API_ENDPOINTS.md §17 (API surface)
 *
 * Path conventions:
 *   /api/v1/admin/members/pods/*  — admin only
 *   /api/v1/members/pods/*        — member-facing (auth required)
 */

import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

const ADMIN_BASE = `${API_BASE_URL}/api/v1/admin/members/pods`;
const MEMBER_BASE = `${API_BASE_URL}/api/v1/members/pods`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type PodVisibility = "public" | "private";
export type PodStatus = "active" | "inactive";
export type PodAssignmentSource = "admin" | "self" | "lead_transfer";

export interface PodMemberOut {
  id: string;
  member_id: string;
  joined_at: string;
  assigned_by: PodAssignmentSource;
}

/** Compact pod shape used in list views and dashboards. */
export interface PodSummary {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  handle: string | null;
  description: string | null;
  pod_lead_id: string;
  assistant_pod_lead_id: string | null;
  visibility: PodVisibility;
  status: PodStatus;
  min_size: number;
  max_size: number;
  active_member_count: number;
  default_session_day: DayOfWeek;
  default_session_time: string; // HH:MM:SS
  default_session_duration_minutes: number;
  default_pool_id: string | null;
  cycle_started_at: string;
  review_due_at: string;
  dissolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Full pod view — includes the active assignment list. */
export interface PodDetail extends PodSummary {
  members: PodMemberOut[];
}

export interface PodCreateInput {
  club_id: string;
  pod_lead_id: string;
  /** If blank, the server auto-names ``{club_slug}-pod-{N}``. */
  name?: string;
  /** Public "username" e.g. "dolphins". Unique per club. */
  handle?: string;
  description?: string;
  assistant_pod_lead_id?: string;
  min_size?: number;
  max_size?: number;
  /** Schedule fields all default to the parent Club's defaults if omitted. */
  default_session_day?: DayOfWeek;
  default_session_time?: string; // HH:MM
  default_session_duration_minutes?: number;
  default_pool_id?: string;
  visibility?: PodVisibility;
}

export type PodUpdateInput = Partial<Omit<PodCreateInput, "club_id">>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
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
    const detail = typeof body?.detail === "string" ? body.detail : `${fallback} (${res.status})`;
    throw new Error(detail);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Admin endpoints (require_admin)
// ---------------------------------------------------------------------------

export async function adminCreatePod(input: PodCreateInput): Promise<PodSummary> {
  const res = await authedFetch(ADMIN_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return unwrap<PodSummary>(res, "Failed to create pod");
}

export async function adminGetPod(podId: string): Promise<PodDetail> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}`);
  return unwrap<PodDetail>(res, "Failed to load pod");
}

export async function adminUpdatePod(podId: string, patch: PodUpdateInput): Promise<PodSummary> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrap<PodSummary>(res, "Failed to update pod");
}

export async function adminDissolvePod(podId: string): Promise<PodSummary> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}/dissolve`, {
    method: "POST",
  });
  return unwrap<PodSummary>(res, "Failed to dissolve pod");
}

export async function adminExtendPod(podId: string): Promise<PodSummary> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}/extend`, {
    method: "POST",
  });
  return unwrap<PodSummary>(res, "Failed to extend pod cycle");
}

export async function adminAddMember(podId: string, memberId: string): Promise<PodMemberOut> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}/members`, {
    method: "POST",
    body: JSON.stringify({ member_id: memberId }),
  });
  return unwrap<PodMemberOut>(res, "Failed to add member");
}

export async function adminRemoveMember(podId: string, memberId: string): Promise<void> {
  const res = await authedFetch(`${ADMIN_BASE}/${podId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to remove member (${res.status})`);
  }
}

export async function adminTransferMember(
  sourcePodId: string,
  memberId: string,
  targetPodId: string
): Promise<void> {
  const res = await authedFetch(
    `${ADMIN_BASE}/${sourcePodId}/transfers?member_id=${encodeURIComponent(memberId)}`,
    {
      method: "POST",
      body: JSON.stringify({ target_pod_id: targetPodId }),
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to transfer member (${res.status})`);
  }
}

export async function adminListReviewQueue(): Promise<PodSummary[]> {
  const res = await authedFetch(`${ADMIN_BASE}/review-queue`);
  return unwrap<PodSummary[]>(res, "Failed to load review queue");
}

export async function adminListPods(options?: {
  clubId?: string;
  status?: PodStatus;
}): Promise<PodSummary[]> {
  const params = new URLSearchParams();
  if (options?.clubId) params.set("club_id", options.clubId);
  if (options?.status) params.set("status", options.status);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const res = await authedFetch(`${ADMIN_BASE}${suffix}`);
  return unwrap<PodSummary[]>(res, "Failed to load pods");
}

// ---------------------------------------------------------------------------
// Member endpoints (auth required, no admin)
// ---------------------------------------------------------------------------

/** The current member's pod, or null if not in one. */
export async function getMyPod(): Promise<PodSummary | null> {
  const res = await authedFetch(`${MEMBER_BASE}/me`);
  return unwrap<PodSummary | null>(res, "Failed to load your pod");
}

/** Pods I'm the lead OR assistant lead of. Empty list when I lead none.
 *
 * Powers two member-facing surfaces:
 *   * The conditional "Pod Lead Review" sidebar entry — only shown when
 *     this returns at least one pod.
 *   * The Pod-Lead-side review page — uses the list for context
 *     ("Reviewing as Pod Lead of {pod.name}").
 *
 * 401/403 responses are coerced to an empty list so unauthenticated
 * callers (e.g. in a sidebar render race) don't crash. */
export async function listPodsILead(): Promise<PodSummary[]> {
  const res = await authedFetch(`${MEMBER_BASE}/i-lead`);
  if (res.status === 401 || res.status === 403) return [];
  return unwrap<PodSummary[]>(res, "Failed to load pods I lead");
}

/** Public pod directory (filterable by club). No auth required — pods
 *  with visibility='public' are intentionally browseable, including
 *  from the unauthenticated /club marketing page. */
export async function listPublicPods(clubId?: string): Promise<PodSummary[]> {
  const url = clubId
    ? `${MEMBER_BASE}/public?club_id=${encodeURIComponent(clubId)}`
    : `${MEMBER_BASE}/public`;
  const res = await fetch(url, { cache: "no-store" });
  return unwrap<PodSummary[]>(res, "Failed to load public pods");
}

export async function joinPod(podId: string): Promise<PodMemberOut> {
  const res = await authedFetch(`${MEMBER_BASE}/${podId}/join`, {
    method: "POST",
  });
  return unwrap<PodMemberOut>(res, "Failed to join pod");
}

export async function leaveMyPod(): Promise<void> {
  const res = await authedFetch(`${MEMBER_BASE}/me/leave`, { method: "POST" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to leave pod (${res.status})`);
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};
const DAY_FULL: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function formatDay(day: DayOfWeek, full = false): string {
  return (full ? DAY_FULL : DAY_LABELS)[day] ?? day;
}

/** Strip seconds from a "HH:MM:SS" time. */
export function formatTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

/** Render the pod's friendly handle ("Dolphins") if present, else the slug. */
export function podDisplayName(pod: Pick<PodSummary, "handle" | "slug" | "name">): string {
  if (pod.handle) {
    return pod.handle.charAt(0).toUpperCase() + pod.handle.slice(1);
  }
  return pod.name || pod.slug;
}
