/**
 * Members API client and type exports.
 * 
 * Types are generated from backend OpenAPI schema.
 * Run `npm run generate:types` to update types after backend changes.
 */
import { apiGet } from "./api";
import type { components } from "./api-types";

// Re-export generated types for convenience
export type Member = components["schemas"]["MemberResponse"];
export type MemberListItem = components["schemas"]["MemberListResponse"];
export type MemberUpdate = components["schemas"]["MemberUpdate"];
export type CoachProfile = components["schemas"]["CoachProfileResponse"];

export const MembersApi = {
    getMe: () => apiGet<Member>("/api/v1/members/me", { auth: true }),

    listCoaches: () => apiGet<Member[]>("/api/v1/members/coaches", { auth: true }),

    // Admin
    listMembers: (skip = 0, limit = 100) =>
        apiGet<MemberListItem[]>(`/api/v1/members/?skip=${skip}&limit=${limit}`, { auth: true }),

    getMember: (id: string) => apiGet<Member>(`/api/v1/members/${id}`, { auth: true }),
};
