"use client";

import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { Hourglass } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Mirror services/ledger_service/schemas/reports.py
type DeferredRevenueRow = {
  deferred_account_ref: string;
  domain: string;
  schedule_count: number;
  total_minor: number;
  recognized_minor: number;
  remaining_minor: number;
};

type DeferredRevenueReport = {
  as_of: string;
  rows: DeferredRevenueRow[];
  total_remaining_minor: number;
};

/** Ledger amounts are integer kobo; display as Naira. */
const naira = (kobo: number) => formatNaira(kobo / 100);
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function DeferredRevenuePage() {
  const [asOf, setAsOf] = useState(todayISO);
  const [report, setReport] = useState<DeferredRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DeferredRevenueReport>(
        `/api/v1/admin/finance/reports/deferred-revenue?as_of=${asOf}`,
        { auth: true },
      );
      setReport(data);
    } catch {
      setError("Could not load deferred revenue.");
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance — Deferred Revenue
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Money collected but not yet earned — what you still owe members in
          service. Recognised over each membership/cohort term. Amounts in Naira.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Outstanding obligations
            </h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            As of
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1 text-slate-900"
            />
          </label>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : !report || report.rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No deferred revenue — everything collected has been recognised (or
              recognition hasn’t run yet).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Schedules</th>
                    <th className="py-2 pr-4 text-right font-medium">Collected</th>
                    <th className="py-2 pr-4 text-right font-medium">Recognised</th>
                    <th className="py-2 text-right font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr
                      key={`${r.deferred_account_ref}-${r.domain}`}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4 capitalize text-slate-900">
                        {r.domain}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">
                        {r.schedule_count}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-700">
                        {naira(r.total_minor)}
                      </td>
                      <td className="py-2 pr-4 text-right text-emerald-700">
                        {naira(r.recognized_minor)}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {naira(r.remaining_minor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
                    <td className="py-2 pr-4" colSpan={4}>
                      Total still owed in service
                    </td>
                    <td className="py-2 text-right">
                      {naira(report.total_remaining_minor)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
