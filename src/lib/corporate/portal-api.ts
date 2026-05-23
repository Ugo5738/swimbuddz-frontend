// HR-portal API client. Separate from the main api.ts because the portal
// uses its own auth (magic-link → session token stored in localStorage),
// not Supabase. Endpoints live under /api/v1/corporate/me/*.

import { API_BASE_URL } from "../config";
import type {
  EmployeeReportRow,
  ProgramOutcomeReport,
} from "./api";

const SESSION_KEY = "corporate_portal_session";

export interface PortalSession {
  session_token: string;
  expires_at: string;
  contact_id: string;
  company_name: string;
  primary_contact_name: string;
}

export interface PortalProgramSummary {
  id: string;
  name: string;
  status: string;
  employee_count: number;
  expected_start_date: string | null;
  expected_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
}

export interface PortalEmployeeRow {
  id: string;
  full_name: string;
  email: string;
  enrollment_status: string;
  invitation_sent_at: string | null;
  registered_at: string | null;
  enrolled_at: string | null;
}

export interface PortalMe {
  contact_id: string;
  company_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
}

// ─── Session storage helpers ────────────────────────────────────────────

export function loadPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalSession;
    // Defensive: if the stored token has already expired we want to nudge
    // the user back to the login screen rather than make doomed requests.
    if (new Date(parsed.expires_at).getTime() <= Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storePortalSession(session: PortalSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

// ─── Low-level fetch wrapper ────────────────────────────────────────────

interface PortalFetchOpts {
  method?: "GET" | "POST";
  body?: unknown;
  /** If true, send the stored session token as Authorization Bearer. */
  auth?: boolean;
  /** Override auth token (used by /me right after verify, before persist). */
  token?: string;
  signal?: AbortSignal;
}

async function portalFetch<T>(path: string, opts: PortalFetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  } else if (opts.auth) {
    const sess = loadPortalSession();
    if (sess) headers.Authorization = `Bearer ${sess.session_token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  if (!res.ok) {
    let detail = `Request failed with ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* swallow */
    }
    if (res.status === 401) {
      // Session is dead — wipe it so the next page-load redirects to login.
      clearPortalSession();
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Portal API surface ─────────────────────────────────────────────────

export const portalApi = {
  // Auth — no bearer needed
  requestLink: (email: string, callbackUrl: string) =>
    portalFetch<{ sent: boolean }>("/api/v1/corporate/me/auth/request-link", {
      method: "POST",
      body: { email, callback_url: callbackUrl },
    }),

  verifyToken: (token: string) =>
    portalFetch<PortalSession>("/api/v1/corporate/me/auth/verify", {
      method: "POST",
      body: { token },
    }),

  // Authenticated reads
  me: () => portalFetch<PortalMe>("/api/v1/corporate/me", { auth: true }),

  listPrograms: () =>
    portalFetch<PortalProgramSummary[]>("/api/v1/corporate/me/programs", {
      auth: true,
    }),

  getProgram: (programId: string) =>
    portalFetch<PortalProgramSummary>(
      `/api/v1/corporate/me/programs/${programId}`,
      { auth: true },
    ),

  listEmployees: (programId: string) =>
    portalFetch<PortalEmployeeRow[]>(
      `/api/v1/corporate/me/programs/${programId}/employees`,
      { auth: true },
    ),

  getReport: (programId: string) =>
    portalFetch<ProgramOutcomeReport>(
      `/api/v1/corporate/me/programs/${programId}/report`,
      { auth: true },
    ),
};

// Re-export shared report types so portal pages can import everything
// from one module.
export type { EmployeeReportRow, ProgramOutcomeReport };
