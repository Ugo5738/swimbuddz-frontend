import { describe, expect, it } from "vitest";
import { sessionDayKey } from "@/components/swims/MySwimsCalendar";

describe("personal swim calendar date grouping", () => {
  it("uses the pool local timezone rather than the viewer browser timezone", () => {
    expect(sessionDayKey({
      starts_at: "2026-11-20T23:30:00Z", timezone: "Africa/Lagos",
    })).toBe("2026-11-21");
  });

  it("retains the correct date for sessions shortly after midnight", () => {
    expect(sessionDayKey({
      starts_at: "2026-11-20T23:20:00+01:00", timezone: "Africa/Lagos",
    })).toBe("2026-11-20");
  });

  it("does not group malformed dates", () => {
    expect(sessionDayKey({ starts_at: "not-a-date", timezone: "Africa/Lagos" })).toBe("");
  });
});
