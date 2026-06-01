"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type JournalEntrySummary = {
  id: string;
  entry_date: string;
  posting_date: string;
  description: string;
  source_service: string;
  source_type: string;
  source_id: string | null;
  status: string;
  period_id: string;
  reversal_of_entry_id: string | null;
  reversed_by_entry_id: string | null;
};

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntrySummary[] | null>(null);
  const [sourceService, setSourceService] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (sourceService) params.set("source_service", sourceService);
      const data = await apiGet<JournalEntrySummary[]>(
        `/api/v1/admin/finance/journal-entries?${params}`,
        { auth: true },
      );
      setEntries(data);
    } catch (e) {
      console.error("Failed to load journal entries:", e);
      setError("Could not load journal entries.");
    } finally {
      setLoading(false);
    }
  }, [sourceService]);

  useEffect(() => {
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Finance — Journal Entries
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every money movement, double-entry. Newest first.
          </p>
        </div>
        <Link href="/admin/finance/journal-entries/new">
          <Button variant="primary" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Manual entry
          </Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4">
          <input
            type="text"
            value={sourceService}
            onChange={(e) => setSourceService(e.target.value)}
            placeholder="Filter by source service (e.g. payments, manual, ledger)…"
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : entries && entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-600">
                      {formatDate(e.entry_date)}
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/finance/journal-entries/${e.id}`}
                        className="text-cyan-700 hover:underline"
                      >
                        {e.description}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                      {e.source_service}:{e.source_type}
                    </td>
                    <td className="py-2 pr-4">
                      {e.status === "reversed" ? (
                        <Badge variant="warning">reversed</Badge>
                      ) : (
                        <Badge variant="success">posted</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No journal entries yet.</p>
        )}
      </Card>
    </div>
  );
}
