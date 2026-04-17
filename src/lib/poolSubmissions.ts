import { apiGet, apiPost } from "./api";

// --- Types ---

export type PoolSubmissionStatus = "pending" | "approved" | "rejected";

export type PoolType = "community" | "club" | "academy" | "private" | "public" | "hotel";

export interface PoolSubmissionCreate {
  pool_name: string;
  location_area?: string;
  address?: string;
  pool_type?: PoolType;

  contact_phone?: string;
  contact_email?: string;

  has_changing_rooms?: boolean;
  has_showers?: boolean;
  has_lockers?: boolean;
  has_parking?: boolean;
  has_lifeguard?: boolean;

  visit_frequency?: string;
  member_rating?: number;
  member_notes?: string;
  photo_url?: string;
}

export interface PoolSubmission {
  id: string;
  submitter_auth_id: string;
  submitter_display_name: string | null;
  submitter_email: string | null;

  pool_name: string;
  location_area: string | null;
  address: string | null;
  pool_type: PoolType | null;
  contact_phone: string | null;
  contact_email: string | null;

  has_changing_rooms: boolean | null;
  has_showers: boolean | null;
  has_lockers: boolean | null;
  has_parking: boolean | null;
  has_lifeguard: boolean | null;

  visit_frequency: string | null;
  member_rating: number | null;
  member_notes: string | null;
  photo_url: string | null;

  status: PoolSubmissionStatus;
  reviewed_by_auth_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  promoted_pool_id: string | null;

  reward_granted: boolean;
  reward_bubbles: number | null;

  created_at: string;
  updated_at: string;
}

export interface PoolSubmissionListResponse {
  items: PoolSubmission[];
  total: number;
  page: number;
  page_size: number;
}

// --- API ---

export const PoolSubmissionsApi = {
  // Member
  create: (payload: PoolSubmissionCreate) =>
    apiPost<PoolSubmission>("/api/v1/pools/submissions", payload, { auth: true }),

  listMine: (page = 1, pageSize = 20) =>
    apiGet<PoolSubmissionListResponse>(
      `/api/v1/pools/submissions/mine?page=${page}&page_size=${pageSize}`,
      { auth: true },
    ),

  // Admin
  listAll: (params: { status?: PoolSubmissionStatus; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(params.page ?? 1));
    qs.set("page_size", String(params.pageSize ?? 20));
    return apiGet<PoolSubmissionListResponse>(
      `/api/v1/admin/pools/submissions?${qs.toString()}`,
      { auth: true },
    );
  },

  approve: (id: string, rewardBubbles = 500, reviewNotes?: string) =>
    apiPost<PoolSubmission>(
      `/api/v1/admin/pools/submissions/${id}/approve`,
      { reward_bubbles: rewardBubbles, review_notes: reviewNotes },
      { auth: true },
    ),

  reject: (id: string, reviewNotes: string) =>
    apiPost<PoolSubmission>(
      `/api/v1/admin/pools/submissions/${id}/reject`,
      { review_notes: reviewNotes },
      { auth: true },
    ),
};
