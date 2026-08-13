"use client";

import { apiGet } from "@/lib/api";
import {
  presentWeatherSummary,
  type WeatherKind,
  weatherWindowSummaryPath,
  type WeatherWindowSummaryResponse,
} from "@/lib/weather";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudLightning, CloudRain, CloudSun, type LucideIcon, Sun } from "lucide-react";

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
 * Weather block for a session card. Fetches the canonical summary of the
 * session's own hours from the cached pool forecast (deduped by react-query) —
 * condition, peak rain chance, rainfall (mm), high temp, and a one-line read.
 * The parent mounts this component only after the member chooses to view
 * weather, so the forecast remains an optional, lazy-loaded enhancement.
 */
export function SessionWeatherChip({ poolId, startsAt, endsAt, isPast = false }: Props) {
  const enabled = Boolean(poolId) && !isPast;

  const { data, isLoading } = useQuery({
    queryKey: ["weather", "pool", poolId, "window-summary", startsAt, endsAt],
    queryFn: () =>
      apiGet<WeatherWindowSummaryResponse | null>(
        weatherWindowSummaryPath(String(poolId), startsAt, endsAt),
        { auth: true }
      ),
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

  const summary = presentWeatherSummary(data);
  if (!summary) {
    return (
      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        A forecast is not available for this session yet.
      </div>
    );
  }

  const { Icon, tone } = KIND_STYLE[summary.kind];

  return (
    <div className={`mt-1.5 rounded-lg px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{summary.conditionText}</span>
        {summary.tempHigh !== null && (
          <span className="font-normal opacity-80">· {Math.round(summary.tempHigh)}°</span>
        )}
      </div>
      <div className="mt-0.5 text-xs opacity-90">
        {summary.maxProb}% chance of rain · ~{summary.totalPrecip}mm during your session
      </div>
      <p className="mt-1 text-xs leading-snug opacity-80">{summary.explanation}</p>
    </div>
  );
}
