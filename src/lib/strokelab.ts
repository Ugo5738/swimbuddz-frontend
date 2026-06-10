import { apiDelete, apiGet, apiPost } from "./api";
import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

// ─── Types ────────────────────────────────────────────────────────────
//
// Mirrors the Pydantic schemas in services/ai_service/schemas/analysis.py.
// Kept inline (like src/lib/chat.ts) so the page code is decoupled from
// the OpenAPI regeneration cadence. Re-sync if the backend payload
// changes — the response_model decorators on the router are the source
// of truth.

export type AnalysisJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type AnalysisJob = {
  id: string;
  member_auth_id: string;
  stroke_type: string;
  status: AnalysisJobStatus;
  error_message: string | null;
  is_public: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type DrillSuggestion = {
  key: string;
  title: string;
  why: string;
  how: string;
  academy_ref: string | null;
};

export type ObservationSeverity = "good" | "suggestion" | "unavailable";

export type Observation = {
  key: string;
  severity: ObservationSeverity;
  title: string;
  detail: string;
  timestamp_s: number | null;
  drill: DrillSuggestion | null;
};

export type TrackingGap = {
  start_s: number;
  end_s: number;
  duration_s: number;
};

export type AnalysisResultPayload = {
  detected_stroke: string;
  pose_detection_rate: number;
  frames_total: number;
  frames_with_pose: number;
  stroke_rate_spm: number | null;
  body_roll_proxy_degrees: number | null;
  breath_count_left: number | null;
  breath_count_right: number | null;
  breath_balance_left_ratio: number | null;
  summary_text: string | null;
  observations: Observation[];
  tracking_gaps: TrackingGap[];
};

export type AnalysisJobDetail = AnalysisJob & {
  result: AnalysisResultPayload | null;
  original_video_url: string | null;
  annotated_video_url: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────

// Keep in lock-step with MAX_UPLOAD_BYTES + storage bucket limits on the
// backend. Update here AND in services/ai_service/routers/analyze.py
// AND in scripts/strokelab/setup_buckets.py if you change it.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_DURATION_SECONDS = 60;

export const ACCEPTED_VIDEO_MIME = "video/mp4,video/quicktime,video/x-m4v,video/webm";

// ─── API calls ────────────────────────────────────────────────────────

export type CreateAnalysisJobInput = {
  file: File;
  strokeType?: "freestyle";
  isPublic?: boolean;
};

/**
 * Multipart upload. Inlined fetch (not via apiPost) because the shared
 * client JSON-serialises bodies — FormData must go raw with browser-set
 * boundary headers.
 */
export async function createAnalysisJob({
  file,
  strokeType = "freestyle",
  isPublic = false,
}: CreateAnalysisJobInput): Promise<AnalysisJob> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Video is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is ${
        MAX_UPLOAD_BYTES / 1024 / 1024
      } MB.`,
    );
  }

  const formData = new FormData();
  formData.append("video", file);
  formData.append("stroke_type", strokeType);
  formData.append("is_public", isPublic ? "true" : "false");

  const headers: Record<string, string> = {};
  const token = await getCurrentAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text || `${response.status} ${response.statusText}`;
    if (response.headers.get("content-type")?.includes("application/json")) {
      try {
        const parsed = JSON.parse(text);
        detail = parsed.detail ?? parsed.message ?? detail;
      } catch {
        // fall through with raw text
      }
    }
    throw new Error(detail);
  }

  return (await response.json()) as AnalysisJob;
}

export function getAnalysisJob(jobId: string) {
  return apiGet<AnalysisJobDetail>(`/api/v1/ai/analyze/${jobId}`, {
    auth: true,
  });
}

export function listMyAnalyses(limit = 20) {
  return apiGet<AnalysisJob[]>(`/api/v1/ai/analyze/me?limit=${limit}`, {
    auth: true,
  });
}

export function deleteAnalysisJob(jobId: string) {
  return apiDelete<void>(`/api/v1/ai/analyze/${jobId}`, { auth: true });
}

// ─── Admin types + calls ──────────────────────────────────────────────

export type QueueStatusCounts = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

export type QueueRecentJob = {
  id: string;
  member_auth_id: string;
  status: AnalysisJobStatus;
  stroke_type: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type QueueSnapshot = {
  total_jobs: number;
  counts: QueueStatusCounts;
  counts_last_24h: QueueStatusCounts;
  success_rate_pct: number;
  recent_jobs: QueueRecentJob[];
  queue_depth_approx: number;
};

export function getQueueSnapshot(recentLimit = 25) {
  return apiGet<QueueSnapshot>(
    `/api/v1/ai/admin/analyze/queue?recent_limit=${recentLimit}`,
    { auth: true },
  );
}

export type ReanalyzeResponse = {
  job_id: string;
  status: AnalysisJobStatus;
  enqueued: boolean;
};

export function reanalyzeJob(jobId: string) {
  return apiPost<ReanalyzeResponse>(
    `/api/v1/ai/admin/analyze/reanalyze/${jobId}`,
    {},
    { auth: true },
  );
}

// ─── Founding-members pre-sale ────────────────────────────────────────

export type FoundingStats = {
  seats_total: number;
  seats_taken: number;
  seats_remaining: number;
  price_kobo: number;
  price_ngn: number;
  is_sold_out: boolean;
};

export type FoundingStatus = {
  is_founding_member: boolean;
  claimed_at: string | null;
  paystack_reference: string | null;
};

export type FoundingClaimResult = {
  seat_number: number;
  paystack_reference: string;
  amount_paid_kobo: number;
};

export type FoundingInitializeResult = {
  authorization_url: string;
  reference: string;
};

export function getFoundingStats() {
  // Public — no auth required. Used both on the unauthed landing page and
  // by signed-in members for the live counter.
  return apiGet<FoundingStats>(`/api/v1/ai/founding-members/stats`);
}

export function getMyFoundingStatus() {
  return apiGet<FoundingStatus>(`/api/v1/ai/founding-members/me`, {
    auth: true,
  });
}

/**
 * Start a Paystack checkout. The backend (ai_service → payments_service)
 * creates the Payment intent and returns a hosted authorization_url; the
 * caller redirects the browser there. Matches the wallet-topup flow.
 */
export function initializeFoundingPayment() {
  return apiPost<FoundingInitializeResult>(
    `/api/v1/ai/founding-members/initialize`,
    {},
    { auth: true },
  );
}

/**
 * Client-side fallback after Paystack redirects back. The webhook is the
 * source of truth, but in local/dev (no public webhook URL) and for instant
 * feedback this verifies the reference via payments_service and records.
 */
export function claimFoundingMember(paystackReference: string) {
  return apiPost<FoundingClaimResult>(
    `/api/v1/ai/founding-members/claim`,
    { paystack_reference: paystackReference },
    { auth: true },
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────

export function statusLabel(status: AnalysisJobStatus): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Analyzing";
    case "completed":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

export function statusTone(
  status: AnalysisJobStatus,
): "slate" | "amber" | "emerald" | "rose" {
  switch (status) {
    case "pending":
      return "slate";
    case "processing":
      return "amber";
    case "completed":
      return "emerald";
    case "failed":
      return "rose";
  }
}

/**
 * Client-side duration check using a hidden <video> element. Used by the
 * upload form to fail fast before pushing 50 MB through the wire.
 */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}
