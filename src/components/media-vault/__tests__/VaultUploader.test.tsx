import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { MediaVault } from "@/lib/media-vault";
import { VaultUploadQueue, type UploadFile } from "../VaultUploadQueue";
import { VaultUploader } from "../VaultUploader";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
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
  status: "open",
  upload_opens_at: "2026-09-19T08:00:00Z",
  upload_closes_at: "2026-09-22T12:00:00Z",
  max_file_bytes: 500 * 1024 ** 3,
  max_total_bytes: 2 * 1024 ** 4,
  used_bytes: 0,
  auto_transcode: false,
  retention_days: 730,
  consent_notice: "I followed member consent preferences.",
  opt_out_count: 0,
  shot_checklist: ["Opening shot"],
  settings_json: {},
  published_album_id: null,
  created_at: "2026-09-19T08:00:00Z",
  updated_at: "2026-09-19T08:00:00Z",
  effective_role: "curator",
  item_count: 0,
  pending_review_count: 0,
};

describe("Vault uploader mobile UX", () => {
  it("puts consent and upload immediately after iPhone files reach the page", () => {
    const { container } = render(
      <VaultUploader vault={vault} scope={{ kind: "member", vaultId: vault.id }} />
    );
    const file = new File(["video"], "main-set.mov", { type: "video/quicktime" });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("main-set.mov")).toBeInTheDocument();
    expect(screen.getByText("Consent and safeguarding confirmation")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start full-quality upload" });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Consent and safeguarding/ }));
    expect(start).toBeEnabled();
  });

  it("explains the curator window separately from admin access", () => {
    render(<VaultUploader vault={vault} scope={{ kind: "member", vaultId: vault.id }} />);
    expect(screen.getByText(/curator upload access/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin access working after this time/)).toBeInTheDocument();
  });

  it("shows measured upload speed and an ETA", () => {
    const file = new File(["video"], "main-set.mov", { type: "video/quicktime" });
    Object.defineProperty(file, "size", { value: 100 * 1024 ** 2 });
    const entry: UploadFile = {
      key: "video",
      file,
      status: "uploading",
      progress: 25,
      bytesUploaded: 25 * 1024 ** 2,
      bytesPerSecond: 5 * 1024 ** 2,
    };
    render(
      <VaultUploadQueue
        files={[entry]}
        totalBytes={file.size}
        completed={0}
        uploading
        onClear={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText(/5.0 MB\/s/)).toHaveTextContent("about 15 sec remaining");
  });
});
