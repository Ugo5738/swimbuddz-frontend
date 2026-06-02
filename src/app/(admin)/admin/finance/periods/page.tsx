"use client";

import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { CalendarClock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Period = {
  id: string;
  period_name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string; // open | soft_closed | hard_closed
  closed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  soft_closed: "Soft-closed",
  hard_closed: "Hard-closed",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  soft_closed: "bg-amber-100 text-amber-700",
  hard_closed: "bg-slate-200 text-slate-600",
};

// Mirror services/ledger_service/services/periods.py ALLOWED_TRANSITIONS.
const ACTIONS: Record<string, { to: string; label: string }[]> = {
  open: [{ to: "soft_closed", label: "Soft-close" }],
  soft_closed: [
    { to: "open", label: "Reopen" },
    { to: "hard_closed", label: "Hard-close" },
  ],
  hard_closed: [{ to: "soft_closed", label: "Reopen (owner)" }],
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Period[]>("/api/v1/admin/finance/periods", {
        auth: true,
      });
      setPeriods(data);
    } catch {
      setError("Could not load periods. (Admin role required.)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const transition = async (id: string, to: string, label: string) => {
    if (
      to === "hard_closed" &&
      !window.confirm(
        "Hard-close locks this period to ALL entries (owner-only). Continue?",
      )
    ) {
      return;
    }
    setBusy(id);
    setError(null);
    try {
      await apiPost(
        `/api/v1/admin/finance/periods/${id}/transition`,
        { to_status: to },
        { auth: true },
      );
      await load();
    } catch {
      setError(
        `Could not ${label.toLowerCase()} — hard-close/reopen needs the owner role.`,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance — Periods
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Month-end close. Soft-close blocks new service postings (accountants
          can still post adjustments); hard-close locks the month to everything.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          <CalendarClock className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Accounting periods
          </h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : periods.length === 0 ? (
            <p className="text-sm text-slate-500">
              No periods yet — they’re created automatically on the first entry
              of each month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Period</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {p.period_name}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASS[p.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {(ACTIONS[p.status] ?? []).map((a) => (
                            <button
                              key={a.to}
                              disabled={busy === p.id}
                              onClick={() => transition(p.id, a.to, a.label)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </td>
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
