// Weather helpers for the session weather block.
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

export type WeatherSummary = {
  /** Peak hourly chance of rain in the window (0–100). */
  maxProb: number;
  /** Total rainfall in the window, in mm. */
  totalPrecip: number;
  /** High temperature in the window, °C (null if unavailable). */
  tempHigh: number | null;
  /** Low temperature in the window, °C. */
  tempLow: number | null;
  /** Representative condition, for icon + tone selection. */
  kind: WeatherKind;
  /** Short human label, e.g. "Light drizzle". */
  conditionText: string;
  /** One-line plain-English read for the session. */
  explanation: string;
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

/** Local hour (0–23) of an ISO timestamp. */
function hourOf(iso: string): number {
  return new Date(iso).getHours();
}

// Open-Meteo WMO weather_code → short human label.
const WMO_LABEL: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

/** Map an Open-Meteo WMO weather_code to a short label (fallback "Cloudy"). */
export function conditionLabel(code: number): string {
  return WMO_LABEL[code] ?? "Cloudy";
}

/** Map a WMO weather_code + peak rain chance to a display kind. */
function classify(code: number, maxProb: number): WeatherKind {
  if (code >= 95) return "storm"; // 95–99 thunderstorm
  if (code >= 51 || maxProb >= 60) return "rain"; // 51–82 drizzle/rain/showers
  if (code >= 45 || maxProb >= 30) return "cloudy"; // 45/48 fog, or meaningfully wet
  if (code >= 1) return "partly"; // 1–3 partly cloudy
  return "clear";
}

/** One-line plain-English read of the conditions for a session. */
function explain(kind: WeatherKind, maxProb: number, totalMm: number): string {
  if (kind === "storm") {
    return "Thunderstorm possible — sessions pause if there's lightning.";
  }
  if (maxProb < 30) return "Looks dry for your session.";
  if (totalMm >= 5) return "Steady rain likely during the session.";
  if (kind === "rain" || totalMm >= 1) {
    return "Light rain likely — warm and swimmable.";
  }
  return "Cloudy with a slight chance of drizzle.";
}

/**
 * Summarize the hours of `date` (YYYY-MM-DD) whose local hour falls within
 * [startHour, endHour] inclusive. The API already slices to the date, but we
 * re-filter (and narrow to the window) defensively. Returns null when no hour
 * matches.
 */
export function summarizeWindow(
  forecast: WeatherForecast | undefined,
  date: string,
  startHour: number,
  endHour: number,
): WeatherSummary | null {
  const hourly = forecast?.hourly;
  const times = hourly?.time ?? [];
  const idx: number[] = [];
  times.forEach((t, i) => {
    if (typeof t === "string" && t.startsWith(date)) {
      const h = Number(t.slice(11, 13));
      if (Number.isFinite(h) && h >= startHour && h <= endHour) idx.push(i);
    }
  });
  if (idx.length === 0) return null;

  let maxProb = 0;
  let totalPrecip = 0;
  let tempHigh: number | null = null;
  let tempLow: number | null = null;
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
    if (t !== null) {
      tempHigh = tempHigh === null ? t : Math.max(tempHigh, t);
      tempLow = tempLow === null ? t : Math.min(tempLow, t);
    }
  }

  const code = num(hourly?.weather_code, peakIdx) ?? 0;
  const kind = classify(code, maxProb);
  const total = Math.round(totalPrecip * 10) / 10;
  return {
    maxProb,
    totalPrecip: total,
    tempHigh,
    tempLow,
    kind,
    conditionText: conditionLabel(code),
    explanation: explain(kind, maxProb, total),
  };
}

/** Whole-day summary (00:00–23:00). */
export function summarizeDay(
  forecast: WeatherForecast | undefined,
  date: string,
): WeatherSummary | null {
  return summarizeWindow(forecast, date, 0, 23);
}

/**
 * Summarize just the session's own hours (start → end, inclusive) — so the
 * numbers describe what a swimmer actually walks into, not the day's worst.
 */
export function summarizeSession(
  forecast: WeatherForecast | undefined,
  startsAt: string,
  endsAt: string,
): WeatherSummary | null {
  const date = toDateParam(startsAt);
  const startHour = hourOf(startsAt);
  let endHour = hourOf(endsAt);
  // Guard against bad / overnight end times — clamp to the end of the day.
  if (!Number.isFinite(endHour) || endHour < startHour) endHour = 23;
  return summarizeWindow(forecast, date, startHour, endHour);
}
