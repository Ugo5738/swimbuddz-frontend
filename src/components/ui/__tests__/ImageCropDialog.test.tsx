import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageCropDialog } from "../ImageCropDialog";

vi.mock("react-easy-crop", () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (area: { x: number; y: number; width: number; height: number }) => void;
  }) => (
    <button type="button" onClick={() => onCropComplete({ x: 10, y: 20, width: 70, height: 60 })}>
      Set crop
    </button>
  ),
}));

describe("ImageCropDialog", () => {
  it("returns one normalized recipe for the approved edit", () => {
    const onConfirm = vi.fn();
    render(
      <ImageCropDialog
        isOpen
        imageUrl="blob:test"
        purpose="content_image"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const save = screen.getByRole("button", { name: "Use image" });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Set crop" }));
    expect(save).toBeEnabled();
    fireEvent.click(save);

    expect(onConfirm).toHaveBeenCalledWith({
      version: 1,
      crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
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
  });

  it("uses the same standard toolset for every image purpose", () => {
    render(
      <ImageCropDialog
        isOpen
        imageUrl="blob:test"
        purpose="profile_photo"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Crop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adjust" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hold to compare with original" })
    ).toBeInTheDocument();
  });

  it("records transforms and filters and can undo an edit", () => {
    const onConfirm = vi.fn();
    render(
      <ImageCropDialog
        isOpen
        imageUrl="blob:test"
        purpose="content_image"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Set crop" }));
    fireEvent.click(screen.getByRole("button", { name: "Transform" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate right 90 degrees" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Flip horizontally" }));
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Pool" }));
    fireEvent.click(screen.getByRole("button", { name: "Use image" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        rotation: 0,
        flip_horizontal: true,
        filter: { name: "pool", strength: 100 },
      })
    );
  });
});
