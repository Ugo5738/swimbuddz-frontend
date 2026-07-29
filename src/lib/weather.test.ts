import { describe, expect, it } from "vitest";

import {
  presentWeatherSummary,
  weatherWindowSummaryPath,
  type WeatherWindowSummaryResponse,
} from "./weather";

const response: WeatherWindowSummaryResponse = {
  pool_id: "pool-1",
  timezone: "Africa/Lagos",
  forecast_days: 14,
  stale: false,
  window_start: "2026-06-20T10:00:00+01:00",
  window_end: "2026-06-20T12:00:00+01:00",
  max_precipitation_probability: 88,
  total_precipitation_mm: 2.4,
  temperature_high_c: 29,
  temperature_low_c: 27,
  representative_weather_code: 63,
  kind: "rain",
  condition_text: "Rain",
  explanation: "Light rain likely — warm and swimmable.",
};

describe("presentWeatherSummary", () => {
  it("maps the canonical API response to the session-card view model", () => {
    expect(presentWeatherSummary(response)).toEqual({
      maxProb: 88,
      totalPrecip: 2.4,
      tempHigh: 29,
      tempLow: 27,
      kind: "rain",
      conditionText: "Rain",
      explanation: "Light rain likely — warm and swimmable.",
    });
  });

  it("returns null when the backend has no forecast for the window", () => {
    expect(presentWeatherSummary(null)).toBeNull();
    expect(presentWeatherSummary(undefined)).toBeNull();
  });
});

describe("weatherWindowSummaryPath", () => {
  it("preserves timezone offsets while encoding the query", () => {
    const path = weatherWindowSummaryPath(
      "pool-1",
      "2026-06-20T10:00:00+01:00",
      "2026-06-20T12:00:00+01:00"
    );

    expect(path).toBe(
      "/api/v1/weather/pools/pool-1/window-summary?" +
        "starts_at=2026-06-20T10%3A00%3A00%2B01%3A00&" +
        "ends_at=2026-06-20T12%3A00%3A00%2B01%3A00"
    );
  });
});
