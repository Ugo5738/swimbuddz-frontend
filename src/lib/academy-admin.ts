/**
 * Admin-only client for academy + media surfaces.
 *
 * Lives in its own module (rather than under `src/lib/academy/api.ts`)
 * so member/coach bundles don't import admin code — the import graph
 * keeps admin paths out of non-admin pages by construction.
 *
 * Endpoints mapped here are:
 *
 *  - GET  /api/v1/media/admin/enrollments/{enrollmentId}/evidence
 *  - GET  /api/v1/media/admin/items/{mediaId}/download
 *  - POST /api/v1/academy/admin/progress/override
 *
 * See `docs/design/ACADEMY_ADMIN_CONTROLS_DESIGN.md` for the
 * end-to-end design.
 */

import { apiGet, apiPost } from "@/lib/api";

export type AdminEvidenceItem = {
  media_id: string;
  media_type: "IMAGE" | "VIDEO" | "DOCUMENT" | string;
  file_url: string | null;
  thumbnail_url: string | null;
  is_processed: boolean;
  media_created_at: string; // ISO-8601
  enrollment_id: string;
  milestone_id: string;
  progress_id: string;
  progress_status: "pending" | "achieved" | string;
  student_notes: string | null;
  claim_achieved_at: string | null;
};

export type AdminEvidenceList = {
  items: AdminEvidenceItem[];
  enrollment_id: string;
  total: number;
};

export type MediaDownload = {
  download_url: string;
  expires_at: string; // ISO-8601
};

export type OverrideProgressRequest = {
  enrollment_id: string;
  milestone_id: string;
  new_status: "pending" | "achieved";
  override_reason: string;
  coach_notes?: string | null;
  score?: number | null;
  /** Carried on the audit row; admins typically leave this unset. */
  ai_metadata?: Record<string, unknown> | null;
};

export type StudentProgressRow = {
  id: string;
  enrollment_id: string;
  milestone_id: string;
  status: "pending" | "achieved";
  achieved_at: string | null;
  evidence_media_id: string | null;
  student_notes: string | null;
  coach_notes: string | null;
  score: number | null;
  reviewed_by_coach_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const AdminAcademyApi = {
  /**
   * Fetch the evidence gallery for an enrollment. Returns one
   * item per StudentProgress claim that has a linked media item;
   * claims with no upload are silently omitted.
   */
  listEnrollmentEvidence: (enrollmentId: string) =>
    apiGet<AdminEvidenceList>(
      `/api/v1/media/admin/enrollments/${enrollmentId}/evidence`,
      { auth: true },
    ),

  /**
   * Request a 60-second presigned download URL for a media item.
   * The caller is expected to navigate / save immediately — the URL
   * expires quickly enough that storing it in component state for
   * later use is not the right pattern.
   */
  getDownloadUrl: (mediaId: string) =>
    apiGet<MediaDownload>(
      `/api/v1/media/admin/items/${mediaId}/download`,
      { auth: true },
    ),

  /**
   * Override (or reverse) the prior decision on a milestone claim.
   * The backend records an OVERRIDE event and leaves the original
   * coach attribution on the live row intact.
   */
  overrideProgress: (payload: OverrideProgressRequest) =>
    apiPost<StudentProgressRow>(
      "/api/v1/academy/admin/progress/override",
      payload,
      { auth: true },
    ),
};
