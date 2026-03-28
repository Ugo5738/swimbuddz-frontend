"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { ArrowLeft, CalendarDays, CloudRain, Download, RefreshCw, Sun } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ── Types ──

interface MonthForecast {
  month: number;
  month_name: string;
  seasonal_index: number;
  trend_factor: number;
  campaign_multiplier: number;
  demand_level: string;
  expected_demand: number;
  lower_bound: number;
  upper_bound: number;
  status_label: string;
  recommended_actions: string[];
  key_factors: string[];
}

interface ForecastDetail {
  id: string;
  forecast_year: number;
  generated_at: string;
  status: string;
  months_of_real_data: number;
  prior_weight: number;
  monthly_forecasts: MonthForecast[];
  model_params: {
    baseline: number;
    trend_rate: number;
    launch_year: number;
    launch_month: number;
    seasonal_indices: Record<string, number>;
  };
}

// ── Helpers ──

const LEVEL_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-blue-100", text: "text-blue-700", label: "LOW" },
  moderate: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "MODERATE",
  },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "HIGH" },
  peak: { bg: "bg-red-100", text: "text-red-700", label: "PEAK" },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  expected_seasonal_dip: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    label: "Expected Dip",
  },
  on_track: {
    bg: "bg-green-50",
    text: "text-green-600",
    label: "On Track",
  },
  outperforming: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    label: "Outperforming",
  },
  underperforming: {
    bg: "bg-red-50",
    text: "text-red-600",
    label: "Underperforming",
  },
};

function Badge({ config }: { config: { bg: string; text: string; label: string } }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// ── Component ──

export default function SeasonalityPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [forecast, setForecast] = useState<ForecastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ForecastDetail>(
        `/api/v1/admin/reports/seasonality/forecast/${year}`,
        { auth: true }
      );
      setForecast(data);
    } catch (e) {
      // 404 = no forecast yet, 500 = backend down — both show empty state
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleGenerate = async (force = false) => {
    setGenerating(true);
    setError(null);
    try {
      await apiPost(
        `/api/v1/admin/reports/seasonality/generate`,
        { forecast_year: year, force_regenerate: force },
        { auth: true }
      );
      await loadForecast();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate forecast");
    } finally {
      setGenerating(false);
    }
  };

  // Derived data
  const months = forecast?.monthly_forecasts ?? [];
  const maxExpected = Math.max(...months.map((m) => m.upper_bound), 1);
  const totalExpected = months.reduce((s, m) => s + m.expected_demand, 0);
  const peakMonth = months.length
    ? months.reduce((a, b) => (a.expected_demand > b.expected_demand ? a : b))
    : null;
  const lowMonth = months.length
    ? months.reduce((a, b) => (a.expected_demand < b.expected_demand ? a : b))
    : null;
  const lowCount = months.filter((m) => m.demand_level === "low").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports" className="rounded-lg p-2 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
              Admin · Reports
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Seasonality Forecast</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex gap-1">
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  year === y
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {/* Generate button */}
          <button
            onClick={() => handleGenerate(!!forecast)}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : forecast ? "Regenerate" : "Generate Forecast"}
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingCard text="Loading forecast..." />}

      {/* Empty state */}
      {!loading && !forecast && !error && (
        <Card className="flex flex-col items-center justify-center gap-4 py-16">
          <CalendarDays className="h-12 w-12 text-slate-300" />
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">No forecast for {year}</p>
            <p className="mt-1 text-sm text-slate-500">
              Generate one to see your seasonality calendar, demand forecast, and operational
              recommendations.
            </p>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="rounded-lg bg-cyan-500 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Forecast"}
          </button>
        </Card>
      )}

      {/* Forecast content */}
      {!loading && forecast && (
        <>
          {/* Data quality notice */}
          {forecast.months_of_real_data < 6 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Note:</strong> Based on {forecast.months_of_real_data} month(s) of real data +
              Lagos domain priors (prior weight: {(forecast.prior_weight * 100).toFixed(0)}%).
              Confidence bands are wide — treat as directional guidance.
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="p-4 sm:p-5">
              <p className="text-xs text-slate-500 sm:text-sm">Total Expected</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {totalExpected.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">attendance</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <p className="text-xs text-slate-500 sm:text-sm">Peak Month</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {peakMonth?.month_name.slice(0, 3) ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {peakMonth ? `${peakMonth.expected_demand.toFixed(0)} expected` : ""}
              </p>
            </Card>
            <Card className="p-4 sm:p-5">
              <p className="text-xs text-slate-500 sm:text-sm">Lowest Month</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {lowMonth?.month_name.slice(0, 3) ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {lowMonth ? `${lowMonth.expected_demand.toFixed(0)} expected` : ""}
              </p>
            </Card>
            <Card className="p-4 sm:p-5">
              <p className="text-xs text-slate-500 sm:text-sm">Low-Demand Months</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{lowCount}</p>
              <p className="mt-0.5 text-xs text-slate-400">of 12</p>
            </Card>
          </div>

          {/* Forecast bar chart */}
          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Monthly Demand Forecast</h2>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  Expected
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />
                  Confidence
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {months.map((m) => {
                const level = LEVEL_CONFIG[m.demand_level] ?? LEVEL_CONFIG.moderate;
                const pctExpected = (m.expected_demand / maxExpected) * 100;
                const pctLower = (m.lower_bound / maxExpected) * 100;
                const pctUpper = (m.upper_bound / maxExpected) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="w-8 text-right text-xs font-medium text-slate-500">
                      {m.month_name.slice(0, 3)}
                    </span>
                    <div className="relative h-6 flex-1 rounded-full bg-slate-100">
                      {/* Confidence band */}
                      <div
                        className="absolute top-0 h-full rounded-full bg-slate-200/60"
                        style={{
                          left: `${pctLower}%`,
                          width: `${pctUpper - pctLower}%`,
                        }}
                      />
                      {/* Expected bar */}
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                          m.demand_level === "low"
                            ? "bg-blue-400"
                            : m.demand_level === "moderate"
                              ? "bg-amber-400"
                              : m.demand_level === "high"
                                ? "bg-orange-400"
                                : "bg-red-400"
                        }`}
                        style={{ width: `${pctExpected}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-700">
                      {m.expected_demand.toFixed(0)}
                    </span>
                    <Badge config={level} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Calendar table */}
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              12-Month Operational Calendar
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-3 font-medium text-slate-600">Month</th>
                    <th className="pb-3 font-medium text-slate-600">Level</th>
                    <th className="pb-3 text-right font-medium text-slate-600">Expected</th>
                    <th className="hidden pb-3 text-right font-medium text-slate-600 sm:table-cell">
                      Range
                    </th>
                    <th className="pb-3 font-medium text-slate-600">Status</th>
                    <th className="hidden pb-3 font-medium text-slate-600 md:table-cell">
                      Key Factors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => {
                    const level = LEVEL_CONFIG[m.demand_level] ?? LEVEL_CONFIG.moderate;
                    const status = STATUS_CONFIG[m.status_label] ?? STATUS_CONFIG.on_track;
                    const isExpanded = expandedMonth === m.month;

                    return (
                      <>
                        <tr
                          key={m.month}
                          className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50"
                          onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                        >
                          <td className="py-3 font-medium text-slate-900">
                            {m.seasonal_index >= 1.0 ? (
                              <Sun className="mr-1.5 inline h-4 w-4 text-amber-400" />
                            ) : (
                              <CloudRain className="mr-1.5 inline h-4 w-4 text-blue-400" />
                            )}
                            {m.month_name}
                          </td>
                          <td className="py-3">
                            <Badge config={level} />
                          </td>
                          <td className="py-3 text-right font-semibold text-slate-900">
                            {m.expected_demand.toFixed(0)}
                          </td>
                          <td className="hidden py-3 text-right text-slate-500 sm:table-cell">
                            {m.lower_bound.toFixed(0)} – {m.upper_bound.toFixed(0)}
                          </td>
                          <td className="py-3">
                            <Badge config={status} />
                          </td>
                          <td className="hidden py-3 text-slate-500 md:table-cell">
                            {m.key_factors.slice(0, 2).join(", ") || "—"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${m.month}-actions`}>
                            <td colSpan={6} className="bg-slate-50 px-4 py-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Recommended Actions
                              </p>
                              <ul className="space-y-1">
                                {m.recommended_actions.map((action, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-slate-700"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                              {m.key_factors.length > 0 && (
                                <>
                                  <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Key Factors
                                  </p>
                                  <ul className="space-y-1">
                                    {m.key_factors.map((f, i) => (
                                      <li key={i} className="text-sm text-slate-600">
                                        • {f}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Model info + export */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Model parameters */}
            <Card className="p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Model Parameters</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Baseline</dt>
                  <dd className="font-medium text-slate-900">
                    {forecast.model_params.baseline} attendance/mo
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Growth trend</dt>
                  <dd className="font-medium text-slate-900">
                    {(forecast.model_params.trend_rate * 100).toFixed(1)}% /month
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Real data months</dt>
                  <dd className="font-medium text-slate-900">{forecast.months_of_real_data}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Prior weight</dt>
                  <dd className="font-medium text-slate-900">
                    {(forecast.prior_weight * 100).toFixed(0)}%
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Generated</dt>
                  <dd className="font-medium text-slate-900">
                    {new Date(forecast.generated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Export */}
            <Card className="p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Export Reports</h2>
              <p className="mb-4 text-sm text-slate-500">
                Download the forecast for sharing with investors, team, or offline planning.
              </p>
              <div className="space-y-2">
                <ExportButton
                  label="HTML Report (with charts)"
                  href={`/api/v1/admin/reports/seasonality/forecast/${year}/export.html`}
                />
                <ExportButton
                  label="CSV Calendar (for spreadsheets)"
                  href={`/api/v1/admin/reports/seasonality/forecast/${year}/export.csv`}
                />
                <ExportButton
                  label="Markdown Document"
                  href={`/api/v1/admin/reports/seasonality/forecast/${year}/export.md`}
                />
              </div>
            </Card>
          </div>

          {/* Seasonal index visualisation */}
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Seasonal Demand Indices</h2>
            <p className="mb-4 text-sm text-slate-500">
              1.0 = average month. Above = above-average demand. Below = below-average demand.
            </p>
            <div className="flex items-end gap-1 sm:gap-2">
              {months.map((m) => {
                const height = Math.max(((m.seasonal_index - 0.5) / 0.7) * 100, 5);
                const color =
                  m.demand_level === "low"
                    ? "bg-blue-400"
                    : m.demand_level === "moderate"
                      ? "bg-amber-400"
                      : m.demand_level === "high"
                        ? "bg-orange-400"
                        : "bg-red-400";
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-slate-600 sm:text-xs">
                      {m.seasonal_index.toFixed(2)}
                    </span>
                    <div
                      className={`w-full rounded-t ${color} transition-all duration-500`}
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[10px] text-slate-500 sm:text-xs">
                      {m.month_name.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Baseline marker */}
            <div className="mt-1 flex items-center gap-2">
              <div className="h-px flex-1 border-t border-dashed border-slate-300" />
              <span className="text-[10px] text-slate-400">1.0 = average</span>
              <div className="h-px flex-1 border-t border-dashed border-slate-300" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Sub-components ──

function ExportButton({ label, href }: { label: string; href: string }) {
  const handleExport = async () => {
    try {
      const { getCurrentAccessToken } = await import("@/lib/auth");
      const token = await getCurrentAccessToken();
      const res = await fetch(`${API_BASE_URL}${href}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from Content-Disposition or build from href
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename=(.+)/);
      a.download = filenameMatch ? filenameMatch[1] : (href.split("/").pop() ?? "export");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Download className="h-4 w-4 text-slate-400" />
      {label}
    </button>
  );
}
