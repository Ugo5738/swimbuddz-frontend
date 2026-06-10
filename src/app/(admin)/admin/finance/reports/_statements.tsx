"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { BarChart3, Landmark, Scale } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Stat, monthStartISO, naira, todayISO } from "./_shared";

// ============================================================================
// Types (mirror services/ledger_service/schemas/reports.py)
// ============================================================================

type TrialBalanceRow = {
  code: string;
  name: string;
  type: string;
  debit_minor: number;
  credit_minor: number;
};

type TrialBalanceReport = {
  as_of: string;
  rows: TrialBalanceRow[];
  total_debit_minor: number;
  total_credit_minor: number;
  balanced: boolean;
};

type ProfitLossRow = {
  key: string;
  revenue_minor: number;
  expense_minor: number;
  net_minor: number;
};

type ProfitLossReport = {
  from_date: string;
  to_date: string;
  group_by: string;
  rows: ProfitLossRow[];
  total_revenue_minor: number;
  total_expense_minor: number;
  net_income_minor: number;
};

type BSRow = { code: string; name: string; amount_minor: number };
type BSGroup = { rows: BSRow[]; total_minor: number };
type BalanceSheetReport = {
  as_of: string;
  assets: BSGroup;
  liabilities: BSGroup;
  equity: BSGroup;
  total_assets_minor: number;
  total_liabilities_and_equity_minor: number;
  balanced: boolean;
};

// ----------------------------------------------------------------------------
// Trial Balance
// ----------------------------------------------------------------------------

export function TrialBalanceSection() {
  const [asOf, setAsOf] = useState(todayISO);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TrialBalanceReport>(
        `/api/v1/admin/finance/reports/trial-balance?as_of=${asOf}`,
        { auth: true }
      );
      setReport(data);
    } catch (e) {
      console.error("Failed to load trial balance:", e);
      setError("Could not load the trial balance.");
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
          <Scale className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Trial Balance</h2>
          {report &&
            (report.balanced ? (
              <Badge variant="success">Balanced</Badge>
            ) : (
              <Badge variant="danger">Out of balance</Badge>
            ))}
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
      ) : report && report.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Account</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pl-4 text-right font-medium">Debit</th>
                <th className="py-2 pl-4 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.code} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-mono text-xs text-slate-500">{r.code}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.name}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.type}</td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                    {r.debit_minor ? naira(r.debit_minor) : "—"}
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                    {r.credit_minor ? naira(r.credit_minor) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-slate-900">
                <td className="py-2 pr-4" colSpan={3}>
                  Total
                </td>
                <td className="py-2 pl-4 text-right tabular-nums">
                  {naira(report.total_debit_minor)}
                </td>
                <td className="py-2 pl-4 text-right tabular-nums">
                  {naira(report.total_credit_minor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No postings on or before this date.</p>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Profit & Loss
// ----------------------------------------------------------------------------

export function ProfitLossSection() {
  const [fromDate, setFromDate] = useState(monthStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [groupBy, setGroupBy] = useState("dimension_1");
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        group_by: groupBy,
      });
      const data = await apiGet<ProfitLossReport>(
        `/api/v1/admin/finance/reports/profit-loss?${params}`,
        { auth: true }
      );
      setReport(data);
    } catch (e) {
      console.error("Failed to load P&L:", e);
      setError("Could not load the profit & loss report.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Profit &amp; Loss</h2>
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
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="dimension_1">By domain</option>
            <option value="none">By account</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading…</p>
      ) : report && report.rows.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Revenue" value={naira(report.total_revenue_minor)} />
            <Stat label="Expense" value={naira(report.total_expense_minor)} />
            <Stat
              label="Net income"
              value={naira(report.net_income_minor)}
              emphasis={report.net_income_minor >= 0 ? "positive" : "negative"}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">
                    {groupBy === "none" ? "Account" : "Domain"}
                  </th>
                  <th className="py-2 pl-4 text-right font-medium">Revenue</th>
                  <th className="py-2 pl-4 text-right font-medium">Expense</th>
                  <th className="py-2 pl-4 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.key} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-slate-800">{r.key}</td>
                    <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                      {r.revenue_minor ? naira(r.revenue_minor) : "—"}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                      {r.expense_minor ? naira(r.expense_minor) : "—"}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                      {naira(r.net_minor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No revenue or expense in this period.</p>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Balance Sheet
// ----------------------------------------------------------------------------

export function BalanceSheetSection() {
  const [asOf, setAsOf] = useState(todayISO);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<BalanceSheetReport>(
        `/api/v1/admin/finance/reports/balance-sheet?as_of=${asOf}`,
        { auth: true }
      );
      setReport(data);
    } catch (e) {
      console.error("Failed to load balance sheet:", e);
      setError("Could not load the balance sheet.");
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    load();
  }, [load]);

  const group = (title: string, g: BSGroup) => (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.code} className="border-b border-slate-50">
              <td className="py-1.5 pr-4 text-slate-700">{r.name}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-800">
                {naira(r.amount_minor)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold text-slate-900">
            <td className="py-1.5 pr-4">Total {title}</td>
            <td className="py-1.5 text-right tabular-nums">{naira(g.total_minor)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Balance Sheet</h2>
          {report &&
            (report.balanced ? (
              <Badge variant="success">A = L + E</Badge>
            ) : (
              <Badge variant="danger">Out of balance</Badge>
            ))}
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
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {group("Assets", report.assets)}
            <div className="space-y-6">
              {group("Liabilities", report.liabilities)}
              {group("Equity", report.equity)}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
            <span>Total assets: {naira(report.total_assets_minor)}</span>
            <span>Liabilities + equity: {naira(report.total_liabilities_and_equity_minor)}</span>
          </div>
        </>
      ) : null}
    </Card>
  );
}
