// Presentation adapter for the pools service's canonical window summary.
// Weather aggregation and interpretation deliberately stay on the backend so
// browser cards and communications emails cannot drift apart.

export type WeatherKind = "clear" | "partly" | "cloudy" | "rain" | "storm";

export type WeatherWindowSummaryResponse = {
  pool_id?: string | null;
  timezone: string;
  forecast_days: number;
  stale: boolean;
  window_start: string;
  window_end: string;
  max_precipitation_probability: number;
  total_precipitation_mm: number;
  temperature_high_c: number | null;
  temperature_low_c: number | null;
  representative_weather_code: number;
  kind: WeatherKind;
  condition_text: string;
  explanation: string;
};

export type WeatherSummary = {
  maxProb: number;
  totalPrecip: number;
  tempHigh: number | null;
  tempLow: number | null;
  kind: WeatherKind;
  conditionText: string;
  explanation: string;
};

/** Build an encoded request path for a pool's canonical window summary. */
export function weatherWindowSummaryPath(poolId: string, startsAt: string, endsAt: string): string {
  const query = new URLSearchParams({
    starts_at: startsAt,
    ends_at: endsAt,
  });
  return `/api/v1/weather/pools/${poolId}/window-summary?${query.toString()}`;
}

/** Map the neutral API shape to the camel-cased view model used by React. */
export function presentWeatherSummary(
  summary: WeatherWindowSummaryResponse | null | undefined
): WeatherSummary | null {
  if (!summary) return null;
  return {
    maxProb: summary.max_precipitation_probability,
    totalPrecip: summary.total_precipitation_mm,
    tempHigh: summary.temperature_high_c,
    tempLow: summary.temperature_low_c,
    kind: summary.kind,
    conditionText: summary.condition_text,
    explanation: summary.explanation,
  };
}
