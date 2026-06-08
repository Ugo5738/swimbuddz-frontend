"use client";

import { apiGet } from "@/lib/api";
import {
  daysUntilSession,
  FORECAST_HORIZON_DAYS,
  summarizeDay,
  toDateParam,
  type WeatherForecast,
  type WeatherKind,
} from "@/lib/weather";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  type LucideIcon,
  Sun,
} from "lucide-react";

const KIND_STYLE: Record<WeatherKind, { Icon: LucideIcon; tone: string }> = {
  clear: { Icon: Sun, tone: "bg-sky-50 text-sky-700" },
  partly: { Icon: CloudSun, tone: "bg-sky-50 text-sky-700" },
  cloudy: { Icon: Cloud, tone: "bg-amber-50 text-amber-700" },
  rain: { Icon: CloudRain, tone: "bg-blue-50 text-blue-700" },
  storm: { Icon: CloudLightning, tone: "bg-indigo-50 text-indigo-700" },
};

type Props = {
  poolId?: string | null;
  startsAt: string;
  isPast?: boolean;
};

/**
 * Compact forecast chip for a session card. Fetches the cached pool forecast
 * (deduped across cards by react-query) and shows the day's rain chance + high.
 * Renders nothing for past sessions, sessions beyond the ~14-day forecast
 * horizon, or when no forecast is available — weather is an enhancement here,
 * never a blocker.
 */
export function SessionWeatherChip({ poolId, startsAt, isPast = false }: Props) {
  const within = daysUntilSession(startsAt);
  const enabled =
    Boolean(poolId) && !isPast && within >= 0 && within <= FORECAST_HORIZON_DAYS;
  const date = toDateParam(startsAt);

  const { data, isLoading } = useQuery({
    queryKey: ["weather", "pool", poolId, date],
    queryFn: () =>
      apiGet<WeatherForecast>(`/api/v1/weather/pools/${poolId}?date=${date}`, {
        auth: true,
      }),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 min — the server caches anyway
    retry: 1,
  });

  if (!enabled) return null;

  if (isLoading) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400">
        <Cloud className="h-3 w-3 animate-pulse" />
        Weather…
      </span>
    );
  }

  const summary = summarizeDay(data, date);
  if (!summary) return null;

  const { Icon, tone } = KIND_STYLE[summary.kind];
  const tempSuffix =
    summary.tempHigh !== null ? ` · ${Math.round(summary.tempHigh)}°` : "";
  const label =
    summary.kind === "storm"
      ? `Storm risk ${summary.maxProb}%`
      : `${summary.maxProb}% rain${tempSuffix}`;

  const tooltip =
    `Forecast for ${date}: ${summary.maxProb}% chance of rain` +
    `, ~${summary.totalPrecip}mm` +
    (summary.tempHigh !== null
      ? `, high ${Math.round(summary.tempHigh)}°C`
      : "") +
    (data?.stale ? " (cached)" : "");

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title={tooltip}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
