import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export type VaultRole = "contributor" | "curator" | "admin";

export type MediaVault = {
  id: string;
  session_id: string | null;
  event_id: string | null;
  title: string;
  description: string | null;
  capture_date: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  location_name: string | null;
  status: "scheduled" | "open" | "review" | "published" | "archived";
  upload_opens_at: string;
  upload_closes_at: string;
  max_file_bytes: number;
  max_total_bytes: number;
  used_bytes: number;
  auto_transcode: false;
  retention_days: number;
  consent_notice: string | null;
  opt_out_count: number;
  shot_checklist: string[];
  settings_json: Record<string, unknown>;
  published_album_id: string | null;
  created_at: string;
  updated_at: string;
  effective_role: VaultRole | null;
  item_count: number;
  pending_review_count: number;
};

export type GuestVault = {
  vault_id: string;
  title: string;
  capture_date: string;
  location_name: string | null;
  upload_closes_at: string;
  max_file_bytes: number;
  remaining_bytes: number;
  consent_notice: string | null;
  shot_checklist: string[];
  link_label: string;
};

export type VaultMedia = {
  id: string;
  vault_id: string;
  upload_batch_id: string | null;
  media_type: "IMAGE" | "VIDEO";
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  captured_at: string | null;
  processing_status: string;
  review_status: "unreviewed" | "shortlisted" | "approved" | "rejected" | "published";
  consent_status: "unreviewed" | "cleared" | "restricted" | "takedown";
  rating: number | null;
  review_notes: string | null;
  rejection_reason: string | null;
  duplicate_of_id: string | null;
  published_media_id: string | null;
  published_at: string | null;
  uploaded_by: string;
  created_at: string;
  preview_url: string | null;
  thumbnail_url: string | null;
};

export type VaultList = { items: MediaVault[]; total: number };
export type VaultMediaList = {
  items: VaultMedia[];
  total: number;
  page: number;
  page_size: number;
};

export type UploadBatch = {
  id: string;
  vault_id: string;
  status: string;
  expected_files: number;
  expected_bytes: number;
  completed_files: number;
  completed_bytes: number;
};

export type MultipartUpload = {
  media_item_id: string;
  object_key: string;
  upload_id: string;
  part_size: number;
  part_count: number;
  expires_in_seconds: number;
  duplicate_of_id: string | null;
};

export type ExportJob = {
  id: string;
  vault_id: string;
  preset: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  media_item_ids: string[];
  size_bytes: number;
  error_message: string | null;
  expires_at: string;
  created_at: string;
};

export type BandwidthSummary = {
  months: {
    month: string;
    upload_bytes: number;
    download_authorized_bytes: number;
    download_completed_bytes: number;
    download_reconciled_bytes: number;
    download_pending_estimate_bytes: number;
    download_effective_bytes: number;
  }[];
  current_month_download_bytes: number;
  global_free_allowance_bytes: number;
  allowance_remaining_bytes: number;
  reconciliation_enabled: boolean;
  reconciliation_last_processed_at: string | null;
  measurement_note: string;
};

export const MEDIA_VAULT_CONTRIBUTOR_REOPEN_DAYS = 7;

export const DEFAULT_MEDIA_VAULT_CHECKLIST = [
  "Establishing shot and preparation or arrival",
  "Warm-up wide shot and two drill close-ups",
  "Side-angle footage showing complete movement",
  "Coaching sequence: instruction, attempt, correction, improved attempt",
  "Two members completing meaningful parts of the main set",
  "One uninterrupted complete-length swim",
  "Cool-down or coach, peer, or pod review",
  "Progress, reaction, or encouragement moment",
  "Group or pod photo and a candid community moment",
  "At least two useful horizontal clips for the website or YouTube",
];

export const MEDIA_COVERAGE_STORY = ["Prepare", "Practise", "Coach", "Progress", "Belong"];

export const MEDIA_RECORDING_STANDARDS = [
  "Clean the lens and confirm battery and free storage.",
  "Use vertical 9:16 for most clips; capture at least two horizontal clips.",
  "Use 1080p routinely and reserve higher resolution for deliberate hero footage.",
  "Keep ordinary clips steady and about 8-15 seconds long.",
  "Start two seconds before the action and continue two seconds afterwards.",
  "Keep complete movement in frame; avoid unnecessary zooming and panning.",
];

export function accessWindowForRole(
  vault: Pick<MediaVault, "upload_opens_at" | "upload_closes_at">,
  role: "contributor" | "curator",
  now = new Date()
) {
  const opensAt = new Date(vault.upload_opens_at);
  const closesAt = new Date(vault.upload_closes_at);
  const contributorMinimum = new Date(
    now.getTime() + MEDIA_VAULT_CONTRIBUTOR_REOPEN_DAYS * 24 * 60 * 60 * 1000
  );
  return {
    startsAt: new Date(Math.min(opensAt.getTime(), now.getTime())).toISOString(),
    expiresAt:
      role === "curator"
        ? new Date(closesAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Math.max(closesAt.getTime(), contributorMinimum.getTime())).toISOString(),
  };
}

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 2 ? 2 : 1)} ${units[index]}`;
};

export const mediaVaultApi = {
  list: () => apiGet<VaultList>("/api/v1/media/vaults", { auth: true }),
  get: (vaultId: string) => apiGet<MediaVault>(`/api/v1/media/vaults/${vaultId}`, { auth: true }),
  create: (body: Record<string, unknown>) =>
    apiPost<MediaVault>("/api/v1/media/vaults", body, { auth: true }),
  update: (vaultId: string, body: Record<string, unknown>) =>
    apiPatch<MediaVault>(`/api/v1/media/vaults/${vaultId}`, body, {
      auth: true,
    }),
  getGuest: (token: string) =>
    apiGet<GuestVault>(`/api/v1/media/vaults/guest/${token}`, {
      auth: false,
    }),
  createBatch: (
    scope: { vaultId: string } | { guestToken: string },
    body: Record<string, unknown>
  ) => {
    const path =
      "guestToken" in scope
        ? `/api/v1/media/vaults/guest/${scope.guestToken}/batches`
        : `/api/v1/media/vaults/${scope.vaultId}/batches`;
    return apiPost<UploadBatch>(path, body, {
      auth: !("guestToken" in scope),
    });
  },
  listItems: (vaultId: string, query = "") =>
    apiGet<VaultMediaList>(`/api/v1/media/vaults/${vaultId}/items${query}`, { auth: true }),
  review: (vaultId: string, mediaItemIds: string[], body: Record<string, unknown>) =>
    apiPatch<VaultMedia[]>(
      `/api/v1/media/vaults/${vaultId}/items`,
      { media_item_ids: mediaItemIds, ...body },
      { auth: true }
    ),
  requestPreview: (vaultId: string, itemId: string) =>
    apiPost<{ status: string }>(
      `/api/v1/media/vaults/${vaultId}/items/${itemId}/preview/generate`,
      {},
      { auth: true }
    ),
  publish: (vaultId: string, mediaItemIds: string[], makePublic = false) =>
    apiPost<VaultMedia[]>(
      `/api/v1/media/vaults/${vaultId}/publish`,
      {
        media_item_ids: mediaItemIds,
        make_album_public: makePublic,
      },
      { auth: true }
    ),
  authorizeDownload: (vaultId: string, itemId: string) =>
    apiPost<{
      transfer_id: string;
      url: string;
      expires_in_seconds: number;
      bytes_authorized: number;
      filename: string;
    }>(`/api/v1/media/vaults/${vaultId}/items/${itemId}/download`, {}, { auth: true }),
  createExport: (
    vaultId: string,
    mediaItemIds: string[],
    preset: "original" | "social-square" | "social-portrait" = "original"
  ) =>
    apiPost<ExportJob>(
      `/api/v1/media/vaults/${vaultId}/exports`,
      { media_item_ids: mediaItemIds, preset },
      { auth: true }
    ),
  listExports: (vaultId: string) =>
    apiGet<ExportJob[]>(`/api/v1/media/vaults/${vaultId}/exports`, {
      auth: true,
    }),
  downloadExport: (vaultId: string, exportId: string) =>
    apiPost<{
      transfer_id: string;
      url: string;
      bytes_authorized: number;
      filename: string;
    }>(`/api/v1/media/vaults/${vaultId}/exports/${exportId}/download`, {}, { auth: true }),
  bandwidth: () =>
    apiGet<BandwidthSummary>("/api/v1/media/vaults/admin/bandwidth", {
      auth: true,
    }),
  syncVolunteers: (vaultId: string) =>
    apiPost(`/api/v1/media/vaults/${vaultId}/grants/sync-volunteers`, {}, { auth: true }),
  revokeGrant: (vaultId: string, grantId: string) =>
    apiDelete<void>(`/api/v1/media/vaults/${vaultId}/grants/${grantId}`, { auth: true }),
};
