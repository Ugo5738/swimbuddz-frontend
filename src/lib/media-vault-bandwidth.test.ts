import { describe, expect, it } from "vitest";
import { unattributedPreviewBytes, type BandwidthSummary } from "./media-vault";

const month = (
  values: Partial<BandwidthSummary["months"][number]>
): BandwidthSummary["months"][number] => ({
  month: "2026-11",
  upload_bytes: 400,
  download_authorized_bytes: 1000,
  download_completed_bytes: 0,
  download_reconciled_bytes: 500,
  download_pending_estimate_bytes: 1000,
  download_effective_bytes: 1800,
  ...values,
});

describe("Vault S3 bandwidth breakdown", () => {
  it("shows unmatched derivative S3 delivery separately from matched originals", () => {
    expect(unattributedPreviewBytes(month({}))).toBe(300);
  });

  it("does not double count pending original authorizations", () => {
    expect(
      unattributedPreviewBytes(
        month({
          download_reconciled_bytes: 500,
          download_pending_estimate_bytes: 1000,
          download_effective_bytes: 1500,
        })
      )
    ).toBe(0);
  });

  it("never displays a negative preview measurement for legacy responses", () => {
    expect(
      unattributedPreviewBytes(
        month({ download_effective_bytes: 250 })
      )
    ).toBe(0);
  });
});
