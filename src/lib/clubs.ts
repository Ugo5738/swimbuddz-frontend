/**
 * Typed client for the Club entity (members_service).
 *
 * Public list endpoint is open; create/update/delete require admin auth.
 */

import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

const BASE = `${API_BASE_URL}/api/v1/clubs`;

/** Day-of-week enum on Club.default_session_day. Mirrors backend
 * ``services.members_service.models.enums.DayOfWeek``. */
export type ClubDayOfWeek =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  is_active: boolean;
  /** Default session day pods inherit at creation. */
  default_session_day: ClubDayOfWeek;
  /** Default session start time pods inherit. ISO HH:MM:SS. */
  default_session_time: string;
  /** Default session length in minutes pods inherit. */
  default_session_duration_minutes: number;
  /** Default pool pods inherit (cross-service ref → pools_service.pools.id). */
  default_pool_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubInput {
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  is_active?: boolean;
  default_session_day?: ClubDayOfWeek;
  /** HH:MM (5 chars) or HH:MM:SS — backend accepts both. */
  default_session_time?: string;
  default_session_duration_minutes?: number;
  default_pool_id?: string | null;
}

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
      typeof body?.detail === "string"
        ? body.detail
        : `${fallback} (${res.status})`;
    throw new Error(detail);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export async function listClubs(activeOnly = true): Promise<Club[]> {
  const params = new URLSearchParams();
  params.set("active_only", String(activeOnly));
  const res = await fetch(`${BASE}/?${params}`, { cache: "no-store" });
  return unwrap<Club[]>(res, "Failed to load clubs");
}

export async function getClub(id: string): Promise<Club> {
  const res = await fetch(`${BASE}/${id}`, { cache: "no-store" });
  return unwrap<Club>(res, "Failed to load club");
}

export async function createClub(input: ClubInput): Promise<Club> {
  const res = await authedFetch(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return unwrap<Club>(res, "Failed to create club");
}

export async function updateClub(
  id: string,
  patch: Partial<ClubInput>,
): Promise<Club> {
  const res = await authedFetch(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrap<Club>(res, "Failed to update club");
}

export async function deleteClub(id: string): Promise<void> {
  const res = await authedFetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to delete club (${res.status})`);
  }
}
