import { describe, expect, it } from "vitest";
import { swimDay } from "@/components/swims/PersonalSwimCalendar";

describe("member swim calendar projection", () => {
  it("groups sessions by Lagos date, regardless of device timezone", () => {
    expect(swimDay("2026-11-19T23:30:00Z")).toBe("2026-11-20");
    expect(swimDay("2026-11-19T10:00:00Z")).toBe("2026-11-19");
  });

  it("does not invent a date when the source has none", () => {
    expect(swimDay(null)).toBe("");
    expect(swimDay(undefined)).toBe("");
    expect(swimDay("not-a-date")).toBe("");
  });
});
