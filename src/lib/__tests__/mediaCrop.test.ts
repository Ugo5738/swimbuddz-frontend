import { describe, expect, it } from "vitest";

import { DEFAULT_IMAGE_ADJUSTMENTS, getEffectiveImageAdjustments } from "../mediaCrop";

describe("getEffectiveImageAdjustments", () => {
  it("combines filter strength with manual adjustments and clamps the result", () => {
    expect(
      getEffectiveImageAdjustments(
        { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 96, warmth: -10 },
        { name: "pool", strength: 50 }
      )
    ).toEqual({
      brightness: 1,
      contrast: 100,
      saturation: 6,
      warmth: -13,
      highlights: 0,
      shadows: 0,
    });
  });
});
