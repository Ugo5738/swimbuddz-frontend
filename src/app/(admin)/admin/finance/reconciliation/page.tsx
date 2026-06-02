"use client";

import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { AlertTriangle, Scale } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Mirror services/ledger_service/schemas/reconciliation.py
type ReconciliationBreak = {
  id: string;
  break_type: string;
  psp: string | null;
  external_ref: string | null;
  external_txn_id: string | null;
  settlement_ref: string | null;
  expected_minor: number | null;
  actual_minor: number | null;
  currency: string;
  status: string;
  detail: string | null;
  created_at: string;
};

type ReconciliationReport = {
  open_breaks: number;
  open_break_amount_minor: number;
  matched_count: number;
  unmatched_count: number;
  breaks: ReconciliationBreak[];
};

/** Ledger amounts are integer kobo; display as Naira. */
const naira = (kobo: number | null) =>
  kobo == null ? "—" : formatNaira(kobo / 100);

const BREAK_LABEL: Record<string, string> = {
  unmatched_settlement: "Settled, not booked",
  amount_mismatch: "Amount mismatch",
};

export default function ReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ReconciliationReport>(
        `/api/v1/admin/finance/reports/reconciliation`,
        { auth: true },
      );
      setReport(data);
    } catch {
      setError("Could not load reconciliation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance — Reconciliation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Proves the books match the bank: each Paystack settlement transaction
          is matched to a journal entry. Anything that settled but isn’t in the
          books — or doesn’t tie out — shows up here as a break.
        </p>
      </div>

      {report && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Matched
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {report.matched_count}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Unmatched
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {report.unmatched_count}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Open breaks
            </p>
            <p className="mt-1 text-2xl font-semibold text-rose-600">
              {report.open_breaks}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Break amount
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {naira(report.open_break_amount_minor)}
            </p>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          <Scale className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">Open breaks</h2>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : !report || report.breaks.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Scale className="h-4 w-4" />
              Everything ties out — no open reconciliation breaks.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Reference</th>
                    <th className="py-2 pr-4 text-right font-medium">Booked</th>
                    <th className="py-2 pr-4 text-right font-medium">PSP</th>
                    <th className="py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {report.breaks.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {BREAK_LABEL[b.break_type] ?? b.break_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                        {b.external_ref ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-700">
                        {naira(b.expected_minor)}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-900">
                        {naira(b.actual_minor)}
                      </td>
                      <td className="py-2 text-slate-500">{b.detail ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
