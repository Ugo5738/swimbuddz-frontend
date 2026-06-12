"use client";

import { apiGet } from "@/lib/api";
import {
  daysUntilSession,
  FORECAST_HORIZON_DAYS,
  summarizeSession,
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
  clear: { Icon: Sun, tone: "bg-sky-50 text-sky-800" },
  partly: { Icon: CloudSun, tone: "bg-sky-50 text-sky-800" },
  cloudy: { Icon: Cloud, tone: "bg-slate-100 text-slate-700" },
  rain: { Icon: CloudRain, tone: "bg-blue-50 text-blue-800" },
  storm: { Icon: CloudLightning, tone: "bg-indigo-50 text-indigo-800" },
};

type Props = {
  poolId?: string | null;
  startsAt: string;
  endsAt: string;
  isPast?: boolean;
};

/**
 * Weather block for a session card. Fetches the cached pool forecast (deduped
 * across cards by react-query) and summarizes the session's **own hours** —
 * condition, peak rain chance, rainfall (mm), high temp, and a one-line read.
 * Renders nothing for past/far-future sessions or when no forecast is
 * available — weather is an enhancement here, never a blocker.
 */
export function SessionWeatherChip({
  poolId,
  startsAt,
  endsAt,
  isPast = false,
}: Props) {
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
      <div className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
        <Cloud className="h-4 w-4 animate-pulse" />
        Loading weather…
      </div>
    );
  }

  const summary = summarizeSession(data, startsAt, endsAt);
  if (!summary) return null;

  const { Icon, tone } = KIND_STYLE[summary.kind];

  return (
    <div className={`mt-1.5 rounded-lg px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{summary.conditionText}</span>
        {summary.tempHigh !== null && (
          <span className="font-normal opacity-80">
            · {Math.round(summary.tempHigh)}°
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xs opacity-90">
        {summary.maxProb}% chance of rain · ~{summary.totalPrecip}mm during your
        session
      </div>
      <p className="mt-1 text-xs leading-snug opacity-80">
        {summary.explanation}
      </p>
    </div>
  );
}
