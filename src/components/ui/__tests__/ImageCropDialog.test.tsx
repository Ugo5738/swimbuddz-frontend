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
  it("normalizes the approved crop before saving", () => {
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
      x: 0.1,
      y: 0.2,
      width: 0.7,
      height: 0.6,
    });
  });
});
