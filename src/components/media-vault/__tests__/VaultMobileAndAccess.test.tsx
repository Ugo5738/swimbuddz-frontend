import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet, apiPost } from "@/lib/api";
import { mediaVaultApi, type MediaVault, type VaultMedia } from "@/lib/media-vault";
import { VaultAccessPanel } from "../VaultAccessPanel";
import { VaultReviewGrid } from "../VaultReviewGrid";
import { VaultSettingsPanel } from "../VaultSettingsPanel";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));
vi.mock("@/lib/media-vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media-vault")>();
  return {
    ...actual,
    mediaVaultApi: {
      ...actual.mediaVaultApi,
      listItems: vi.fn(),
      requestPreview: vi.fn(),
      deleteVault: vi.fn(),
    },
  };
});

const vault: MediaVault = {
  id: "vault-one",
  session_id: null,
  event_id: null,
  title: "Saturday Club Swim",
  description: null,
  capture_date: "2026-09-19",
  starts_at: null,
  ends_at: null,
  timezone: "Africa/Lagos",
  location_name: null,
  upload_opens_at: "2026-09-19T08:00:00Z",
  upload_closes_at: "2026-09-22T12:00:00Z",
  shot_checklist: [],
  max_file_bytes: 1024 ** 3,
  max_total_bytes: 10 * 1024 ** 3,
  used_bytes: 0,
  auto_transcode: false,
  retention_days: 730,
  status: "review",
  consent_notice: null,
  opt_out_count: 0,
  settings_json: {},
  published_album_id: null,
  created_at: "2026-09-19T08:00:00Z",
  updated_at: "2026-09-19T08:00:00Z",
  effective_role: "admin",
  item_count: 1,
  pending_review_count: 1,
};

const video: VaultMedia = {
  id: "video-one",
  vault_id: vault.id,
  upload_batch_id: null,
  original_filename: "Main set.mov",
  media_type: "VIDEO",
  content_type: "video/quicktime",
  size_bytes: 200 * 1024 ** 2,
  captured_at: null,
  processing_status: "ready",
  review_status: "unreviewed",
  consent_status: "unreviewed",
  rating: null,
  review_notes: null,
  rejection_reason: null,
  duplicate_of_id: null,
  published_media_id: null,
  published_at: null,
  uploaded_by: "member-one",
  created_at: "2026-09-19T09:00:00Z",
  thumbnail_url: "https://example.test/poster.jpg",
  preview_url: "https://example.test/preview.mp4",
  preview_status: "ready",
  labels: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Media vault mobile playback", () => {
  it("opens a full-screen player from the video card and can rebuild an incompatible proxy", async () => {
    vi.mocked(mediaVaultApi.listItems).mockResolvedValue({
      items: [video], total: 1, page: 1, page_size: 200,
    });
    vi.mocked(mediaVaultApi.requestPreview).mockResolvedValue({ status: "pending" });
    render(<VaultReviewGrid vaultId={vault.id} admin />);

    fireEvent.click(await screen.findByRole("button", { name: "Watch Main set.mov" }));
    const dialog = screen.getByRole("dialog", { name: "Watch Main set.mov" });
    const player = within(dialog).getByLabelText("Main set.mov");
    expect(player.tagName).toBe("VIDEO");
    expect(player).toHaveAttribute("playsinline");

    fireEvent.error(player);
    fireEvent.click(within(dialog).getByRole("button", { name: "Rebuild mobile preview" }));
    await waitFor(() =>
      expect(mediaVaultApi.requestPreview).toHaveBeenCalledWith(vault.id, video.id, true)
    );
  });

  it("requests a playable proxy when only a thumbnail exists", async () => {
    vi.mocked(mediaVaultApi.listItems).mockResolvedValue({
      items: [{ ...video, preview_url: null, preview_status: "thumbnail_ready" }],
      total: 1, page: 1, page_size: 200,
    });
    vi.mocked(mediaVaultApi.requestPreview).mockResolvedValue({ status: "pending" });
    render(<VaultReviewGrid vaultId={vault.id} admin />);
    fireEvent.click(await screen.findByRole("button", { name: "Watch Main set.mov" }));
    await waitFor(() =>
      expect(mediaVaultApi.requestPreview).toHaveBeenCalledWith(vault.id, video.id, false)
    );
  });
});

describe("Media vault management", () => {
  it("keeps a newly created guest link visible and copyable", async () => {
    const uploadUrl = "https://example.test/guest/secret";
    vi.mocked(apiGet).mockImplementation(async (path) => {
      if (String(path).includes("/members/")) return [];
      return [];
    });
    vi.mocked(apiPost).mockResolvedValue({
      id: "link-one", label: "Guest", expires_at: vault.upload_closes_at,
      max_total_bytes: 100 * 1024 ** 3, used_bytes: 0,
      revoked_at: null, upload_url: uploadUrl,
    });
    const copied = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: copied },
    });
    const onVaultUpdated = vi.fn();
    render(<VaultAccessPanel vault={vault} onVaultUpdated={onVaultUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: "Create 100 GB guest link" }));
    expect(await screen.findByDisplayValue(uploadUrl)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy guest upload link" }));
    await waitFor(() => expect(copied).toHaveBeenCalledWith(uploadUrl));
    expect(onVaultUpdated).not.toHaveBeenCalled();
  });

  it("requires the vault title before deleting and returns to the vault list", async () => {
    vi.mocked(mediaVaultApi.deleteVault).mockResolvedValue(undefined);
    render(<VaultSettingsPanel vault={vault} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete vault" }));
    const confirm = screen.getByRole("button", { name: "Confirm delete vault" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type Saturday Club Swim/), {
      target: { value: vault.title },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(mediaVaultApi.deleteVault).toHaveBeenCalledWith(vault.id));
    expect(navigation.push).toHaveBeenCalledWith("/admin/media-vault");
  });
});
