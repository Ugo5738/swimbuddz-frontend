import { apiGet } from "./api";

// Assuming types from schema or defining them here if not imported
export interface CoachProfile {
    id: string;
    member_id: string;
    display_name: string;
    coach_profile_photo_url: string;
    short_bio: string;
    full_bio: string;
    certifications: string[];
    coaching_years: number;
    coaching_specialties: string[];
    // ... add more if needed
    status: string;
}

export interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    membership_tier: string;
    coach_profile?: CoachProfile;
    // ...
}

export const MembersApi = {
    getMe: () => apiGet<Member>("/api/v1/members/me", { auth: true }),

    listCoaches: () => apiGet<Member[]>("/api/v1/members/coaches", { auth: true }),

    // Admin
    listMembers: (skip = 0, limit = 100) =>
        apiGet<Member[]>(`/api/v1/members/?skip=${skip}&limit=${limit}`, { auth: true }),

    getMember: (id: string) => apiGet<Member>(`/api/v1/members/${id}`, { auth: true }),
};
