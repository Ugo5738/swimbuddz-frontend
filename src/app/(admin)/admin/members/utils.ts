// Helpers extracted from page.tsx during the file-size sweep.

import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

import type { Member } from "./types";

export function membershipNeedsAction(m: Member) {
  return ["approved_unpaid", "payment_pending", "expired"].includes(
    m.annual_membership_status || "inactive"
  );
}

export function hasProgrammeRequest(m: Member) {
  return (m.pending_programmes?.length ?? 0) > 0;
}

export function hasActiveClub(m: Member) {
  return m.club_programme_status === "active" && !!m.current_club_id;
}

export function programmeLabel(programme: string) {
  if (programme === "club") return "Club";
  if (programme === "academy") return "Academy";
  return programme.charAt(0).toUpperCase() + programme.slice(1);
}

export function statusTone(status?: string) {
  if (status === "active") return "success";
  if (status === "payment_pending" || status === "requested" || status === "approved_unpaid") {
    return "warning";
  }
  if (status === "expired") return "danger";
  return "neutral";
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res;
}
