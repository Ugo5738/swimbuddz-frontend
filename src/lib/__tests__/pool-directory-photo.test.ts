import { describe, expect, it } from "vitest";
import { resolvePublicPoolPhotoUrl } from "../pool-directory-photo";

const publicMedia = (url: string) => async () => ({
  media_type: "image",
  file_url: url,
  metadata_info: { purpose: "general" },
});

describe("pool directory uploaded photo publication", () => {
  it("resolves a stable public uploaded photo by media ID", async () => {
    const url = await resolvePublicPoolPhotoUrl(
      { media_id: "media-1", url: null },
      publicMedia("https://cdn.example.org/pool.jpg"),
    );
    expect(url).toBe("https://cdn.example.org/pool.jpg");
  });

  it("does not disclose private-purpose files", async () => {
    await expect(resolvePublicPoolPhotoUrl(
      { media_id: "private", url: null },
      async () => ({
        media_type: "image", file_url: "https://cdn.example.org/private.jpg",
        metadata_info: { purpose: "payment_proof" },
      }),
    )).rejects.toThrow(/public general-purpose/);
  });

  it("rejects temporary signed or insecure URLs", async () => {
    await expect(resolvePublicPoolPhotoUrl(
      { media_id: "temporary", url: null },
      publicMedia("https://cdn.example.org/pool.jpg?X-Amz-Signature=abc"),
    )).rejects.toThrow(/Temporary signed/);
    await expect(resolvePublicPoolPhotoUrl(
      { media_id: null, url: "http://example.org/pool.jpg" },
    )).rejects.toThrow(/HTTPS/);
  });

  it("allows a stable HTTPS direct link without a media ID", async () => {
    expect(await resolvePublicPoolPhotoUrl({
      media_id: null, url: "https://cdn.example.org/pool.jpg",
    })).toBe("https://cdn.example.org/pool.jpg");
  });
});
