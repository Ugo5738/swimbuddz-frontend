import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// --- Enums ---

export enum AnnouncementCategory {
  RAIN_UPDATE = "rain_update",
  SCHEDULE_CHANGE = "schedule_change",
  ACADEMY_UPDATE = "academy_update",
  EVENT = "event",
  COMPETITION = "competition",
  GENERAL = "general",
}

const announcementCategoryLabels: Record<string, string> = {
  rain_update: "Rain Update",
  schedule_change: "Schedule Change",
  academy_update: "Academy Update",
  event: "Event",
  competition: "Competition",
  general: "General",
};

export function formatAnnouncementCategory(category: string): string {
  if (!category) return "";
  const normalized = category.toLowerCase();
  return (
    announcementCategoryLabels[normalized] || normalized.replace(/_/g, " ")
  );
}

// --- Types ---

export interface Announcement {
  id: string;
  title: string;
  summary?: string;
  body: string;
  category: AnnouncementCategory;
  status: "draft" | "published" | "archived";
  audience: "community" | "club" | "academy";
  expires_at?: string | null;
  notify_email: boolean;
  notify_push: boolean;
  is_pinned: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementCreate {
  title: string;
  summary?: string;
  body: string;
  category?: AnnouncementCategory;
  status?: "draft" | "published" | "archived";
  audience?: "community" | "club" | "academy";
  expires_at?: string | null;
  notify_email?: boolean;
  notify_push?: boolean;
  is_pinned?: boolean;
  published_at?: string | null;
}

export interface AnnouncementUpdate {
  title?: string;
  summary?: string;
  body?: string;
  category?: AnnouncementCategory;
  status?: "draft" | "published" | "archived";
  audience?: "community" | "club" | "academy";
  expires_at?: string | null;
  notify_email?: boolean;
  notify_push?: boolean;
  is_pinned?: boolean;
  published_at?: string | null;
}

// --- API Functions ---

export const CommunicationsApi = {
  // Announcements
  listAnnouncements: (includeAll = false) =>
    apiGet<Announcement[]>(
      `/api/v1/communications/announcements/${includeAll ? "?include_all=true" : ""}`,
      includeAll ? { auth: true } : undefined,
    ),

  getAnnouncement: (id: string) =>
    apiGet<Announcement>(`/api/v1/communications/announcements/${id}`),

  createAnnouncement: (data: AnnouncementCreate) =>
    apiPost<Announcement>("/api/v1/communications/announcements/", data, {
      auth: true,
    }),

  updateAnnouncement: (id: string, data: AnnouncementUpdate) =>
    apiPatch<Announcement>(`/api/v1/communications/announcements/${id}`, data, {
      auth: true,
    }),

  deleteAnnouncement: (id: string) =>
    apiDelete<void>(`/api/v1/communications/announcements/${id}`, {
      auth: true,
    }),
};
