/**
 * Typed client for the Club entity (members_service).
 *
 * Public list endpoint is open; create/update/delete require admin auth.
 */

import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

const BASE = `${API_BASE_URL}/api/v1/clubs`;

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubInput {
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  is_active?: boolean;
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
