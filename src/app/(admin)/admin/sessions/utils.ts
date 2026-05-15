// Helpers extracted from page.tsx during the file-size sweep.
// Kept local to this route — `apiFetch` is page-specific (it uses the
// page's error-formatting + supabase auth). The date formatters are
// candidates for promotion to a shared lib if other routes need them.

import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  LOCATION_LABELS as SHARED_LOCATION_LABELS,
  SESSION_TYPE_LABELS as SHARED_TYPE_LABELS,
} from "@/lib/sessions";

import type { SessionType } from "./types";

export const PER_PAGE = 20;

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const LOCATION_LABELS = SHARED_LOCATION_LABELS;
export const TYPE_LABELS: Record<SessionType, string> =
  SHARED_TYPE_LABELS as Record<SessionType, string>;

export const LEGEND_ITEMS: { key: SessionType; label: string; cls: string }[] = [
  { key: "club", label: "Club", cls: "bg-cyan-600" },
  { key: "community", label: "Community", cls: "bg-purple-600" },
  { key: "cohort_class", label: "Academy", cls: "bg-orange-600" },
  { key: "one_on_one", label: "1-on-1", cls: "bg-emerald-600" },
  { key: "group_booking", label: "Group", cls: "bg-blue-600" },
  { key: "event", label: "Event", cls: "bg-rose-600" },
];

export function formatApiError(body: any, status: number): string {
  const detail = body?.detail;
  if (typeof detail === "string" && detail) return detail;
  // FastAPI 422: detail is an array of { loc: string[], msg: string, type: string }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        const loc = Array.isArray(d?.loc)
          ? d.loc.filter((p: any) => p !== "body").join(".")
          : "";
        const msg = d?.msg || "";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return `Request failed (${status})`;
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
    throw new Error(formatApiError(body, res.status));
  }
  return res;
}

export function formatDateTimeLocal(date: Date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function locationLabel(loc: string | null | undefined) {
  if (!loc) return "";
  return LOCATION_LABELS[loc] || loc;
}
