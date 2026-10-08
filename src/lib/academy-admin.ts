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

export type AcademyEnrollmentChangeReview = {
  id: string;
  journey_id: string;
  member_id: string | null;
  original_cohort_name: string | null;
  target_cohort_name: string | null;
  from_enrollment_id: string;
  target_cohort_id: string;
  state: "needs_review";
  snapshot: {
    old_cohort_id?: string;
    target_cohort_id?: string;
    old_price_kobo?: number | null;
    target_base_price_kobo?: number | null;
    payment_references?: string[];
    payment_statuses?: string[];
    requires_financial_review?: boolean;
  };
  created_at: string;
};

export type AcademySharedReceipt = {
  id: string;
  external_reference: string;
  amount_kobo: number;
  allocated_kobo: number;
  unallocated_kobo: number;
  currency: string;
  verification_note: string;
  allocations: Array<{
    id: string; enrollment_id: string; member_auth_id: string;
    amount_kobo: number; state: string; idempotency_key: string;
  }>;
};

export type ReviewedAcademyFinancePreview = {
  change_id: string;
  source_enrollment_id: string;
  member_auth_id: string | null;
  verified_paid_tuition_kobo: number;
  verified_allocation_credit_kobo: number;
  verified_total_kobo: number;
  destination_base_tuition_kobo: number;
  recorded_progress_count: number;
  eligible: boolean;
  blocked_payment_references: string[];
  attempts: Array<{ reference: string; status: string; amount_kobo: number }>;
};

export type ReviewedAcademyTransferPayload = {
  reason: string;
  transferable_credit_kobo: number;
  consumed_services_kobo: number;
  discount_kobo: number;
  discount_reason?: string;
  confirmed_attendance_review: boolean;
};

export const AdminAcademyApi = {
  verifyAcademyReceipt: (body: {
    external_reference: string; amount_kobo: number; verification_note: string;
  }) => apiPost<AcademySharedReceipt>(
    "/api/v1/payments/admin/academy-receipts", body, { auth: true },
  ),
  getAcademyReceipt: (id: string) =>
    apiGet<AcademySharedReceipt>(
      `/api/v1/payments/admin/academy-receipts/${id}`, { auth: true },
    ),
  allocateAcademyReceipt: (id: string, body: {
    enrollment_id: string; amount_kobo: number; idempotency_key: string;
  }) => apiPost<AcademySharedReceipt>(
    `/api/v1/payments/admin/academy-receipts/${id}/allocations`,
    body, { auth: true },
  ),
  applyAcademyReceiptAllocation: (receiptId: string, allocationId: string) =>
    apiPost<{ state: string; enrollment_id: string }>(
      `/api/v1/payments/admin/academy-receipts/${receiptId}/allocations/${allocationId}/apply`,
      {}, { auth: true },
    ),
  previewReviewedAcademyTransfer: (id: string) =>
    apiGet<ReviewedAcademyFinancePreview>(
      `/api/v1/academy/admin/academy/enrollment-changes/${id}/finance-preview`,
      { auth: true },
    ),
  approveReviewedAcademyTransfer: (id: string, body: ReviewedAcademyTransferPayload) =>
    apiPost<{ state: string; enrollment_id: string; remaining_tuition_kobo: number }>(
      `/api/v1/academy/admin/academy/enrollment-changes/${id}/approve-reviewed`,
      body, { auth: true },
    ),

  approveUnpaidEnrollmentChange: (changeId: string, reason: string) =>
    apiPost<{ state: string; enrollment_id: string }>(
      `/api/v1/academy/admin/academy/enrollment-changes/${changeId}/approve-unpaid`,
      { reason }, { auth: true },
    ),
  previewCheckoutAttempt: (reference: string) =>
    apiGet<{ payment: { status: string; amount: number; metadata: Record<string, unknown> }; preview_token: string }>(
      `/api/v1/payments/admin/checkout-reconciliation/${encodeURIComponent(reference)}`,
      { auth: true },
    ),
  closeUnpaidCheckoutAttempt: (
    reference: string,
    body: { preview_token: string; provider_closure_evidence: string; note: string; apply: boolean },
  ) =>
    apiPost<{ applied: boolean; closed_unpaid?: boolean }>(
      `/api/v1/payments/admin/checkout-reconciliation/${encodeURIComponent(reference)}/close-unpaid`,
      body, { auth: true },
    ),
  rejectEnrollmentChange: (changeId: string) =>
    apiPost<{ state: string; change_id: string }>(
      `/api/v1/academy/admin/academy/enrollment-changes/${changeId}/reject`,
      {}, { auth: true },
    ),
  listEnrollmentChangeReviews: () => apiGet<AcademyEnrollmentChangeReview[]>(
    "/api/v1/academy/admin/academy/enrollment-changes", { auth: true }
  ),
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
