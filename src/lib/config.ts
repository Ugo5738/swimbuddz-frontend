/**
 * Environment configuration for SwimBuddz Frontend
 * Centralizes all environment-dependent URLs and values
 */

// API Base URL - changes between dev/prod.
const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

// Public app URL used for auth email redirects.
const envAppBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
const fallbackAppBaseUrl =
  typeof window === "undefined" ? "http://localhost:3000" : "";

// Ensure HTTPS in production to prevent mixed content errors
function normalizeApiUrl(url: string | undefined): string {
  if (url) {
    // In production (non-localhost), enforce HTTPS
    if (!url.includes("localhost") && url.startsWith("http://")) {
      return url.replace("http://", "https://");
    }
    return url;
  }

  // No env var set — decide based on context.
  // Browser: use relative URLs so Netlify's /api/* rewrite proxies to the
  // real backend (see netlify.toml). This is the documented dev/prod path
  // for client-side fetches.
  if (typeof window !== "undefined") return "";

  // Server-side with no env var: fail loud in production rather than
  // silently calling localhost from a Netlify Function.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be set in production " +
        "(server-side code cannot rely on the Netlify /api/* rewrite).",
    );
  }
  return "http://localhost:8000";
}

function normalizeAppUrl(url: string | undefined): string {
  if (url && url.trim().length > 0) {
    return url.trim().replace(/\/+$/, "");
  }

  // In the browser, fallback to current origin so local dev still works.
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return fallbackAppBaseUrl;
}

export const API_BASE_URL = normalizeApiUrl(envApiBaseUrl);
export const APP_BASE_URL = normalizeAppUrl(envAppBaseUrl);

// External Links
export const WHATSAPP_GROUP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://chat.whatsapp.com/BVtV5iKH9LhCBphqXqDVYv";

// Feature Flags
export const ENABLE_REGISTRATION =
  process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "false";
export const ENABLE_GALLERY =
  process.env.NEXT_PUBLIC_ENABLE_GALLERY !== "false";

// API Endpoints Builder
export const apiEndpoints = {
  // Base URL for direct access
  baseUrl: API_BASE_URL,

  // Members
  members: `${API_BASE_URL}/api/v1/members`,
  pendingRegistrations: `${API_BASE_URL}/api/v1/pending-registrations`,

  // Sessions
  sessions: `${API_BASE_URL}/api/v1/sessions`,

  // Events
  events: `${API_BASE_URL}/api/v1/events`,

  // Attendance
  attendance: `${API_BASE_URL}/api/v1/attendance`,

  // Volunteers
  volunteers: `${API_BASE_URL}/api/v1/volunteers`,

  // Media/Gallery
  media: `${API_BASE_URL}/api/v1/media`,

  // Communications
  announcements: `${API_BASE_URL}/api/v1/communications/announcements`,
  content: `${API_BASE_URL}/api/v1/content`,
  messages: `${API_BASE_URL}/api/v1/messages`,

  // Academy
  academy: `${API_BASE_URL}/api/v1/academy`,

  // Payments
  payments: `${API_BASE_URL}/api/v1/payments`,

  // Transport
  transport: `${API_BASE_URL}/api/v1/transport`,

  // Challenges
  challenges: `${API_BASE_URL}/api/v1/challenges`,
} as const;

// Helper function to build full endpoint URLs
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number>,
): string {
  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  return url;
}

export function buildAppUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_URL}${normalizedPath}`;
}
