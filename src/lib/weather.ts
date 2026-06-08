// Weather helpers for the session weather chip.
//
// The forecast shape mirrors the backend WeatherSnapshotResponse (pools_service
// weather module). It's hand-typed here so the chip compiles without
// regenerating the OpenAPI types; run `npm run generate:types` after the
// backend openapi.json is regenerated to pick up the endpoints formally.

export type WeatherForecast = {
  timezone?: string;
  hourly?: {
    time?: string[];
    precipitation_probability?: (number | null)[];
    precipitation?: (number | null)[];
    temperature_2m?: (number | null)[];
    weather_code?: (number | null)[];
  };
  daily?: unknown;
  stale?: boolean;
};

// Genuine forecasts only extend ~14 days (Open-Meteo). Past that we show
// nothing rather than a misleading number.
export const FORECAST_HORIZON_DAYS = 14;

export type WeatherKind = "clear" | "partly" | "cloudy" | "rain" | "storm";

export type DaySummary = {
  /** Peak hourly chance of rain across the day (0–100). */
  maxProb: number;
  /** Total rainfall for the day in mm. */
  totalPrecip: number;
  /** Daytime high in °C, or null if unavailable. */
  tempHigh: number | null;
  /** Representative condition, for icon + tone selection. */
  kind: WeatherKind;
};

/** Whole-calendar-day difference between a session's start and `now` (local). */
export function daysUntilSession(iso: string, now: Date = new Date()): number {
  const target = new Date(iso);
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
}

/** Local YYYY-MM-DD for a session start — the `?date=` param the API expects. */
export function toDateParam(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function num(arr: (number | null)[] | undefined, i: number): number | null {
  const v = arr?.[i];
  return typeof v === "number" ? v : null;
}

/** Map an Open-Meteo WMO weather_code + peak rain chance to a display kind. */
function classify(code: number, maxProb: number): WeatherKind {
  if (code >= 95) return "storm"; // 95–99 thunderstorm
  if (code >= 51 || maxProb >= 60) return "rain"; // 51–82 drizzle/rain/showers
  if (code >= 45 || maxProb >= 30) return "cloudy"; // 45/48 fog, or meaningfully wet
  if (code >= 1) return "partly"; // 1–3 partly cloudy
  return "clear";
}

/**
 * Reduce a day's hourly arrays to a single summary. `date` is YYYY-MM-DD; only
 * hours whose timestamp starts with it are considered (the API already slices,
 * but we re-filter defensively). Returns null when no hour matches.
 */
export function summarizeDay(
  forecast: WeatherForecast | undefined,
  date: string,
): DaySummary | null {
  const hourly = forecast?.hourly;
  const times = hourly?.time ?? [];
  const idx: number[] = [];
  times.forEach((t, i) => {
    if (typeof t === "string" && t.startsWith(date)) idx.push(i);
  });
  if (idx.length === 0) return null;

  let maxProb = 0;
  let totalPrecip = 0;
  let tempHigh: number | null = null;
  let peakIdx = idx[0];
  let peakProb = -1;

  for (const i of idx) {
    const p = num(hourly?.precipitation_probability, i) ?? 0;
    if (p > maxProb) maxProb = p;
    if (p > peakProb) {
      peakProb = p;
      peakIdx = i;
    }
    totalPrecip += num(hourly?.precipitation, i) ?? 0;
    const t = num(hourly?.temperature_2m, i);
    if (t !== null) tempHigh = tempHigh === null ? t : Math.max(tempHigh, t);
  }

  const code = num(hourly?.weather_code, peakIdx) ?? 0;
  return {
    maxProb,
    totalPrecip: Math.round(totalPrecip * 10) / 10,
    tempHigh,
    kind: classify(code, maxProb),
  };
}
