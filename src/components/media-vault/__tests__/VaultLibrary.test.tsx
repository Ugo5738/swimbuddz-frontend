import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VaultLibrary } from "../VaultLibrary";
import { mediaVaultApi, type MediaVault, type VaultMedia } from "@/lib/media-vault";

vi.mock("@/lib/media-vault", () => ({
  mediaVaultApi: { library: vi.fn(), tags: vi.fn(), review: vi.fn() },
}));
const vault = {
  id: "vault-one",
  title: "Saturday at Yaba",
  effective_role: "curator",
} as MediaVault;
const item = {
  id: "clip-one",
  vault_id: vault.id,
  media_type: "VIDEO",
  original_filename: "Freestyle practice.mp4",
  labels: ["Coaching"],
  thumbnail_url: null,
  preview_url: null,
} as VaultMedia;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mediaVaultApi.tags).mockResolvedValue(["Freestyle", "Coaching"]);
  vi.mocked(mediaVaultApi.library).mockResolvedValue({
    items: [item],
    total: 49,
    page: 1,
    page_size: 24,
  });
  vi.mocked(mediaVaultApi.review).mockResolvedValue([item]);
});

describe("Vault media library", () => {
  it("paginates across vaults and sends multiple selected tags with the chosen matching rule", async () => {
    render(<VaultLibrary vaults={[vault]} />);
    await screen.findByText(item.original_filename!);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(vi.mocked(mediaVaultApi.library).mock.calls.at(-1)![0].get("page")).toBe("2")
    );
    fireEvent.click(screen.getByText("Filter by tags"));
    fireEvent.click(screen.getByRole("button", { name: "Freestyle" }));
    fireEvent.click(screen.getByRole("button", { name: "Coaching" }));
    fireEvent.change(screen.getByLabelText("Show media matching"), { target: { value: "all" } });
    await waitFor(() => {
      const query = vi.mocked(mediaVaultApi.library).mock.calls.at(-1)![0];
      expect(query.getAll("tags")).toEqual(["Freestyle", "Coaching"]);
      expect(query.get("tag_match")).toBe("all");
      expect(query.get("page")).toBe("1");
    });
  });

  it("saves existing and new tags to the selected file's actual vault", async () => {
    render(<VaultLibrary vaults={[vault]} />);
    fireEvent.click(await screen.findByRole("button", { name: /Edit tags/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Freestyle" }));
    fireEvent.change(within(dialog).getByLabelText("Create a tag"), {
      target: { value: "  Week 12  progress " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save tags" }));
    await waitFor(() =>
      expect(mediaVaultApi.review).toHaveBeenCalledWith(vault.id, [item.id], {
        labels: ["Coaching", "Freestyle", "Week 12 progress"],
      })
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not show tag editing to contributors", async () => {
    render(<VaultLibrary vaults={[{ ...vault, effective_role: "contributor" }]} />);
    await screen.findByText(item.original_filename!);
    expect(screen.queryByRole("button", { name: /Edit tags/ })).not.toBeInTheDocument();
  });
});
