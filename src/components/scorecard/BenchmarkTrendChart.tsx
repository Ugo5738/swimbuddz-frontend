"use client";

import type { BenchmarkTrendSeries, TrendPoint } from "@/lib/scorecard";
import { STROKE_LABELS, type BenchmarkStroke } from "@/lib/scorecard";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { TrustBadge } from "./TrustBadge";

type Props = {
  series: BenchmarkTrendSeries;
};

export function BenchmarkTrendChart({ series }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = series.points;

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
        No data logged for <span className="font-medium text-slate-700">{series.title}</span> yet.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const spread = maxVal - minVal || Math.max(Math.abs(minVal) * 0.2, 1);
  const yMin = Math.max(0, minVal - spread * 0.15);
  const yMax = maxVal + spread * 0.15;

  const width = 560;
  const height = 180;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (points.length - 1)) * chartW;
    const norm = (p.value - yMin) / (yMax - yMin || 1);
    const y = padTop + (1 - norm) * chartH;
    return { x, y, point: p };
  });

  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const firstVal = points[0].value;
  const lastVal = points[points.length - 1].value;
  const delta = lastVal - firstVal;
  const improved =
    series.higher_is_better === null
      ? null
      : series.higher_is_better
        ? delta > 0
        : delta < 0;

  const selected: TrendPoint =
    activeIndex !== null && points[activeIndex]
      ? points[activeIndex]
      : points[points.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{series.title}</h4>
          <p className="text-xs text-slate-500">
            {series.higher_is_better === true
              ? "Higher is better"
              : series.higher_is_better === false
                ? "Lower is more efficient / faster"
                : "Track cadence alongside SPL for efficiency"}
          </p>
        </div>
        {points.length >= 2 && (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              improved === true
                ? "bg-emerald-50 text-emerald-700"
                : improved === false
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {delta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {series.unit}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full min-w-[320px]"
          role="img"
          aria-label={`${series.title} progression chart`}
        >
          {/* Horizontal gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = padTop + ratio * chartH;
            const val = yMax - ratio * (yMax - yMin);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px]"
                >
                  {val >= 100 ? Math.round(val) : val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Connecting line */}
          {coords.length >= 2 && (
            <polyline
              fill="none"
              stroke="#0891b2"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polyline}
            />
          )}

          {/* Data points color-coded by trust tier */}
          {coords.map((c, idx) => {
            const isSelected =
              (activeIndex === null && idx === coords.length - 1) ||
              activeIndex === idx;
            const src = c.point.verification_source;
            const fill =
              src === "coach_verified"
                ? "#059669"
                : src === "strokelab_ai"
                  ? "#06b6d4"
                  : "#ffffff";
            const stroke =
              src === "coach_verified"
                ? "#047857"
                : src === "strokelab_ai"
                  ? "#0e7490"
                  : "#475569";

            return (
              <g
                key={`${c.point.recorded_at}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
              >
                {isSelected && (
                  <circle cx={c.x} cy={c.y} r={10} fill="#06b6d4" fillOpacity={0.18} />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSelected ? 5.5 : 4.5}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={2}
                />
                {(idx === 0 || idx === coords.length - 1 || isSelected) && (
                  <text
                    x={c.x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px]"
                  >
                    {new Date(c.point.recorded_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected point readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{selected.display_value}</span>
          <span>·</span>
          <span>
            {STROKE_LABELS[selected.stroke as BenchmarkStroke] ?? selected.stroke}
          </span>
          {selected.pool_name && (
            <>
              <span>·</span>
              <span>{selected.pool_name}</span>
            </>
          )}
          {selected.label && (
            <>
              <span>·</span>
              <span className="text-cyan-700 font-medium">{selected.label}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>
            {new Date(selected.recorded_at).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <TrustBadge source={selected.verification_source} compact />
        </div>
      </div>
    </div>
  );
}
