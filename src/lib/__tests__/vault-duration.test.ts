import { describe, expect, it } from "vitest";
import { formatDuration } from "../media-vault";

describe("vault video duration", () => {
  it("formats short videos and hour-long recordings", () => {
    expect(formatDuration(65.3)).toBe("1:05");
    expect(formatDuration(3665)).toBe("1:01:05");
    expect(formatDuration(0.3)).toBe("0:01");
  });
  it("does not invent a duration for unprocessed videos", () => {
    for (const value of [undefined, null, 0, -1, Infinity, NaN]) {
      expect(formatDuration(value)).toBe("Duration pending");
    }
  });
});
