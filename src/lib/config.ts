/**
 * Environment configuration for SwimBuddz Frontend
 * Centralizes all environment-dependent URLs and values
 */

// API Base URL - changes between dev/prod
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// External Links
export const WHATSAPP_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://chat.whatsapp.com/BVtV5iKH9LhCBphqXqDVYv';

// Feature Flags
export const ENABLE_REGISTRATION = process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== 'false';
export const ENABLE_GALLERY = process.env.NEXT_PUBLIC_ENABLE_GALLERY !== 'false';

// API Endpoints Builder
export const apiEndpoints = {
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

    // Academy
    academy: `${API_BASE_URL}/api/v1/academy`,

    // Payments
    payments: `${API_BASE_URL}/api/v1/payments`,
} as const;

// Helper function to build full endpoint URLs
export function buildApiUrl(endpoint: string, params?: Record<string, string | number>): string {
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
