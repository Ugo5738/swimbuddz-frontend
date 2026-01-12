import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// --- Enums ---

export enum AnnouncementCategory {
    RAIN_UPDATE = "rain_update",
    SCHEDULE_CHANGE = "schedule_change",
    ACADEMY = "academy",
    EVENT = "event",
    COMPETITION = "competition",
    GENERAL = "general",
}

// --- Types ---

export interface Announcement {
    id: string;
    title: string;
    summary?: string;
    body: string;
    category: AnnouncementCategory;
    is_pinned: boolean;
    published_at: string;
    created_at: string;
    updated_at: string;
}

export interface AnnouncementCreate {
    title: string;
    summary?: string;
    body: string;
    category?: AnnouncementCategory;
    is_pinned?: boolean;
    published_at: string;
}

export interface AnnouncementUpdate {
    title?: string;
    summary?: string;
    body?: string;
    category?: AnnouncementCategory;
    is_pinned?: boolean;
    published_at?: string;
}

// --- API Functions ---

export const CommunicationsApi = {
    // Announcements
    listAnnouncements: () => apiGet<Announcement[]>("/api/v1/communications/announcements/"),

    getAnnouncement: (id: string) => apiGet<Announcement>(`/api/v1/communications/announcements/${id}`),

    createAnnouncement: (data: AnnouncementCreate) =>
        apiPost<Announcement>("/api/v1/communications/announcements/", data, { auth: true }),

    updateAnnouncement: (id: string, data: AnnouncementUpdate) =>
        apiPatch<Announcement>(`/api/v1/communications/announcements/${id}`, data, { auth: true }),

    deleteAnnouncement: (id: string) =>
        apiDelete<void>(`/api/v1/communications/announcements/${id}`, { auth: true }),
};
