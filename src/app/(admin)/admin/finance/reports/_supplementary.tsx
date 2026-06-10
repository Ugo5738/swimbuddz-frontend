"use client";

import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { Banknote, Droplets, Percent } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Stat, monthStartISO, naira, todayISO } from "./_shared";

// ============================================================================
// Types (mirror services/ledger_service/schemas/reports.py)
// ============================================================================

type CashPositionRow = {
  code: string;
  name: string;
  kind: string;
  amount_minor: number;
};
type CashPositionReport = {
  as_of: string;
  rows: CashPositionRow[];
  bank_minor: number;
  clearing_minor: number;
  total_minor: number;
};

type MarginRow = {
  domain: string;
  revenue_minor: number;
  cogs_minor: number;
  margin_minor: number;
  margin_pct: number;
};
type MarginReport = {
  from_date: string;
  to_date: string;
  rows: MarginRow[];
  total_revenue_minor: number;
  total_cogs_minor: number;
  total_margin_minor: number;
};

type BubblesLiabilityReport = {
  as_of: string;
  purchased_minor: number;
  promotional_minor: number;
  total_minor: number;
};

// ----------------------------------------------------------------------------
// Cash Position
// ----------------------------------------------------------------------------

export function CashPositionSection() {
  const [asOf, setAsOf] = useState(todayISO);
  const [report, setReport] = useState<CashPositionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CashPositionReport>(
        `/api/v1/admin/finance/reports/cash-position?as_of=${asOf}`,
        { auth: true }
      );
      setReport(data);
    } catch (e) {
      console.error("Failed to load cash position:", e);
      setError("Could not load cash position.");
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Cash Position</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          As of
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      ) : report ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="In bank (settled)" value={naira(report.bank_minor)} />
            <Stat
              label="In transit (clearing)"
              value={naira(report.clearing_minor)}
              emphasis={report.clearing_minor > 0 ? "negative" : undefined}
            />
            <Stat label="Total cash" value={naira(report.total_minor)} />
          </div>
          {report.rows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Account</th>
                    <th className="py-2 pr-4 font-medium">Kind</th>
                    <th className="py-2 pl-4 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.code} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-800">{r.name}</td>
                      <td className="py-2 pr-4 capitalize text-slate-400">{r.kind}</td>
                      <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                        {naira(r.amount_minor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Gross Margin by Domain
// ----------------------------------------------------------------------------

export function MarginSection() {
  const [fromDate, setFromDate] = useState(monthStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [report, setReport] = useState<MarginReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      const data = await apiGet<MarginReport>(`/api/v1/admin/finance/reports/margin?${params}`, {
        auth: true,
      });
      setReport(data);
    } catch (e) {
      console.error("Failed to load margin:", e);
      setError("Could not load gross margin.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Gross Margin by Domain</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      ) : report && report.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Domain</th>
                <th className="py-2 pl-4 text-right font-medium">Revenue</th>
                <th className="py-2 pl-4 text-right font-medium">COGS</th>
                <th className="py-2 pl-4 text-right font-medium">Margin</th>
                <th className="py-2 pl-4 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.domain} className="border-b border-slate-50">
                  <td className="py-2 pr-4 capitalize text-slate-800">{r.domain}</td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                    {naira(r.revenue_minor)}
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                    {r.cogs_minor ? naira(r.cogs_minor) : "—"}
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                    {naira(r.margin_minor)}
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-500">
                    {r.margin_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-slate-900">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pl-4 text-right tabular-nums">
                  {naira(report.total_revenue_minor)}
                </td>
                <td className="py-2 pl-4 text-right tabular-nums">
                  {naira(report.total_cogs_minor)}
                </td>
                <td className="py-2 pl-4 text-right tabular-nums">
                  {naira(report.total_margin_minor)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No revenue or COGS in this period.</p>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Bubbles Liability
// ----------------------------------------------------------------------------

export function BubblesLiabilitySection() {
  const [asOf, setAsOf] = useState(todayISO);
  const [report, setReport] = useState<BubblesLiabilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<BubblesLiabilityReport>(
        `/api/v1/admin/finance/reports/bubbles-liability?as_of=${asOf}`,
        { auth: true }
      );
      setReport(data);
    } catch (e) {
      console.error("Failed to load bubbles liability:", e);
      setError("Could not load the Bubbles liability.");
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Bubbles Liability</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          As of
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      ) : report ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Purchased (cash-backed)" value={naira(report.purchased_minor)} />
          <Stat label="Promotional (granted)" value={naira(report.promotional_minor)} />
          <Stat label="Total owed" value={naira(report.total_minor)} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-400">
        What members hold in 🫧 and could still spend. Purchased Bubbles are cash-backed;
        promotional were granted (§19-B).
      </p>
    </Card>
  );
}
