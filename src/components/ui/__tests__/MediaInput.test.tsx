import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaInput } from "../MediaInput";

const mediaMocks = vi.hoisted(() => ({
  uploadAdjustedImage: vi.fn(),
  uploadMedia: vi.fn(),
  registerMediaUrl: vi.fn(),
}));

vi.mock("@/lib/media", () => mediaMocks);

vi.mock("@/components/ui/ImageCropDialog", () => ({
  ImageCropDialog: ({ onConfirm }: { onConfirm: (recipe: unknown) => void }) => {
    const recipe = {
      version: 1,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rotation: 0,
      flip_horizontal: false,
      flip_vertical: false,
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        warmth: 0,
        highlights: 0,
        shadows: 0,
      },
      filter: { name: "original", strength: 100 },
    };
    return (
      <button type="button" onClick={() => onConfirm(recipe)}>
        Confirm edit
      </button>
    );
  },
}));

describe("MediaInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:selected-image"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("waits for edit confirmation before uploading a presentation image", async () => {
    mediaMocks.uploadAdjustedImage.mockResolvedValue({
      id: "variant-id",
      file_url: "https://cdn.example.com/variant.jpg",
    });
    const onChange = vi.fn();
    const { container } = render(<MediaInput purpose="content_image" onChange={onChange} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["image"], "portrait.jpg", { type: "image/jpeg" });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(mediaMocks.uploadAdjustedImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm edit" }));

    await waitFor(() => {
      expect(mediaMocks.uploadAdjustedImage).toHaveBeenCalledWith(file, "content_image", {
        version: 1,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        rotation: 0,
        flip_horizontal: false,
        flip_vertical: false,
        adjustments: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          warmth: 0,
          highlights: 0,
          shadows: 0,
        },
        filter: { name: "original", strength: 100 },
      });
      expect(onChange).toHaveBeenCalledWith("variant-id", "https://cdn.example.com/variant.jpg");
    });
  });

  it("does not offer an uncropped URL bypass for presentation images", () => {
    render(<MediaInput purpose="content_image" mode="both" onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Paste URL" })).not.toBeInTheDocument();
    expect(screen.getByText("Drop file here or")).toBeInTheDocument();
  });

  it("keeps evidence uploads on the unmodified upload path", async () => {
    mediaMocks.uploadMedia.mockResolvedValue({
      id: "evidence-id",
      file_url: "https://cdn.example.com/evidence.jpg",
    });
    const onChange = vi.fn();
    const { container } = render(<MediaInput purpose="payment_proof" onChange={onChange} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["proof"], "proof.jpg", { type: "image/jpeg" });

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(mediaMocks.uploadMedia).toHaveBeenCalledWith(file, "payment_proof");
      expect(mediaMocks.uploadAdjustedImage).not.toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith("evidence-id", "https://cdn.example.com/evidence.jpg");
    });
  });
});
