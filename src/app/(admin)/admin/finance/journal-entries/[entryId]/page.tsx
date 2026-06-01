"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/format";
import { ArrowLeft, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type JournalLineOut = {
  account_id: string;
  account_code: string | null;
  debit_minor: number;
  credit_minor: number;
  currency: string;
  dimension_1: string | null;
  dimension_2: string | null;
  member_ref: string | null;
  external_ref: string | null;
  description: string | null;
};

type JournalEntryDetail = {
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
  lines: JournalLineOut[];
};

const naira = (kobo: number) => formatNaira(kobo / 100);

export default function JournalEntryDetailPage() {
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<JournalEntryDetail>(
        `/api/v1/admin/finance/journal-entries/${entryId}`,
        { auth: true },
      );
      setEntry(data);
    } catch (e) {
      console.error("Failed to load entry:", e);
      setError("Could not load this entry.");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReverse = async () => {
    const reason = window.prompt("Reason for reversal (optional):") ?? undefined;
    setReversing(true);
    setError(null);
    try {
      await apiPost(
        `/api/v1/admin/finance/journal-entries/${entryId}/reverse`,
        { reason },
        { auth: true },
      );
      await load();
    } catch (e) {
      console.error("Reversal failed:", e);
      setError(
        "Reversal failed — you need the accountant role, or the entry is already reversed.",
      );
    } finally {
      setReversing(false);
    }
  };

  const totalDebit = entry?.lines.reduce((s, l) => s + l.debit_minor, 0) ?? 0;
  const totalCredit = entry?.lines.reduce((s, l) => s + l.credit_minor, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/finance/journal-entries"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to journal entries
      </Link>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : entry ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {entry.description}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(entry.entry_date)} · {entry.source_service}:
                  {entry.source_type}
                  {entry.source_id ? ` · ${entry.source_id}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {entry.status === "reversed" ? (
                  <Badge variant="warning">reversed</Badge>
                ) : (
                  <Badge variant="success">posted</Badge>
                )}
                {entry.status !== "reversed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReverse}
                    disabled={reversing}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    {reversing ? "Reversing…" : "Reverse"}
                  </Button>
                )}
              </div>
            </div>

            {(entry.reversed_by_entry_id || entry.reversal_of_entry_id) && (
              <div className="mt-3 text-sm text-slate-500">
                {entry.reversed_by_entry_id && (
                  <Link
                    href={`/admin/finance/journal-entries/${entry.reversed_by_entry_id}`}
                    className="text-cyan-700 hover:underline"
                  >
                    → Reversed by this entry
                  </Link>
                )}
                {entry.reversal_of_entry_id && (
                  <Link
                    href={`/admin/finance/journal-entries/${entry.reversal_of_entry_id}`}
                    className="text-cyan-700 hover:underline"
                  >
                    ← Reversal of this entry
                  </Link>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Account</th>
                    <th className="py-2 pr-4 font-medium">Dimension</th>
                    <th className="py-2 pl-4 text-right font-medium">Debit</th>
                    <th className="py-2 pl-4 text-right font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs text-slate-500">
                          {l.account_code}
                        </span>
                        {l.description ? (
                          <span className="ml-2 text-slate-600">{l.description}</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">
                        {l.dimension_1 ?? "—"}
                      </td>
                      <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                        {l.debit_minor ? naira(l.debit_minor) : "—"}
                      </td>
                      <td className="py-2 pl-4 text-right tabular-nums text-slate-800">
                        {l.credit_minor ? naira(l.credit_minor) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-slate-900">
                    <td className="py-2 pr-4" colSpan={2}>
                      Total {totalDebit === totalCredit ? "(balanced)" : "(UNBALANCED)"}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums">
                      {naira(totalDebit)}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums">
                      {naira(totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <p className="text-sm text-slate-400">Entry not found.</p>
      )}
    </div>
  );
}
