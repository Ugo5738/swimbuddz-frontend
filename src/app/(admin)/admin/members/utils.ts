// Helpers extracted from page.tsx during the file-size sweep.

import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

import type { Member } from "./types";

export function tierPaid(d?: string) {
  return d ? new Date(d) > new Date() : false;
}

export function isPaid(m: Member) {
  return (
    tierPaid(m.community_paid_until) ||
    tierPaid(m.club_paid_until) ||
    tierPaid(m.academy_paid_until)
  );
}

export function hasUpgrade(m: Member) {
  const t = m.requested_tiers || m.requested_membership_tiers;
  return !!t && t.length > 0;
}

export function tier(m: Member) {
  return m.primary_tier || m.membership_tier || "community";
}

export function upgradeTiers(m: Member) {
  return (m.requested_tiers || m.requested_membership_tiers || []).join(", ");
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
