import { describe, expect, it } from "vitest";

import { daysUntilSession, summarizeDay, toDateParam } from "./weather";

describe("toDateParam", () => {
  it("formats a local YYYY-MM-DD", () => {
    expect(toDateParam("2026-06-20T13:00:00")).toBe("2026-06-20");
  });
});

describe("daysUntilSession", () => {
  // Local-time ISO strings (no 'Z') keep the calendar math timezone-stable.
  const now = new Date("2026-06-10T09:00:00");

  it("is 0 for a session later the same day", () => {
    expect(daysUntilSession("2026-06-10T20:00:00", now)).toBe(0);
  });

  it("counts whole calendar days ahead", () => {
    expect(daysUntilSession("2026-06-16T06:00:00", now)).toBe(6);
  });

  it("is negative for past days", () => {
    expect(daysUntilSession("2026-06-08T06:00:00", now)).toBe(-2);
  });
});

describe("summarizeDay", () => {
  const forecast = {
    hourly: {
      time: [
        "2026-06-20T10:00",
        "2026-06-20T11:00",
        "2026-06-20T12:00",
        "2026-06-21T00:00",
      ],
      precipitation_probability: [40, 88, 60, 10],
      precipitation: [0.2, 1.8, 0.4, 0.0],
      temperature_2m: [27, 28.4, 29, 25],
      weather_code: [3, 63, 61, 1],
    },
  };

  it("reduces a day's hours to peak prob, total mm, and high temp", () => {
    const s = summarizeDay(forecast, "2026-06-20");
    expect(s).not.toBeNull();
    expect(s!.maxProb).toBe(88);
    expect(s!.totalPrecip).toBe(2.4); // 0.2 + 1.8 + 0.4
    expect(s!.tempHigh).toBe(29);
    expect(s!.kind).toBe("rain"); // peak hour weather_code 63 = rain
  });

  it("ignores hours from other days", () => {
    const s = summarizeDay(forecast, "2026-06-21");
    expect(s!.maxProb).toBe(10);
    expect(s!.kind).toBe("partly"); // weather_code 1
  });

  it("returns null when no hour matches the date", () => {
    expect(summarizeDay(forecast, "2026-12-25")).toBeNull();
  });

  it("returns null for an undefined forecast", () => {
    expect(summarizeDay(undefined, "2026-06-20")).toBeNull();
  });
});
