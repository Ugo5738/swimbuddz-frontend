import { describe, expect, it } from "vitest";

import { applyPixelAdjustments } from "../imageEditorPreview";

describe("applyPixelAdjustments", () => {
  it("warms pixels without changing their alpha channel", () => {
    const pixels = new Uint8ClampedArray([80, 100, 140, 127]);

    applyPixelAdjustments(pixels, {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      warmth: 50,
      highlights: 0,
      shadows: 0,
    });

    expect(pixels[0]).toBeGreaterThan(80);
    expect(pixels[2]).toBeLessThan(140);
    expect(pixels[3]).toBe(127);
  });
});
