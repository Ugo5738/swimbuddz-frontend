"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AccountOut = {
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  is_active: boolean;
  is_system: boolean;
};

type JournalEntryResult = { entry_id: string };

type LineDraft = {
  accountRef: string;
  side: "debit" | "credit";
  amount: string; // Naira, as typed
  dimension1: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const emptyLine = (side: "debit" | "credit"): LineDraft => ({
  accountRef: "",
  side,
  amount: "",
  dimension1: "",
});

/** Naira string -> integer kobo (or NaN). */
const toKobo = (naira: string) => Math.round(parseFloat(naira) * 100);

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [entryDate, setEntryDate] = useState(todayISO);
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("adjustment");
  const [lines, setLines] = useState<LineDraft[]>([
    emptyLine("debit"),
    emptyLine("credit"),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AccountOut[]>("/api/v1/admin/finance/accounts", { auth: true })
      .then(setAccounts)
      .catch((e) => {
        console.error("Failed to load accounts:", e);
        setError("Could not load the chart of accounts.");
      });
  }, []);

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine("debit")]);
  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const { totalDebit, totalCredit, balanced, valid } = useMemo(() => {
    let d = 0;
    let c = 0;
    let allLinesValid = lines.length >= 2;
    for (const l of lines) {
      const k = toKobo(l.amount);
      if (!l.accountRef || Number.isNaN(k) || k <= 0) allLinesValid = false;
      else if (l.side === "debit") d += k;
      else c += k;
    }
    return {
      totalDebit: d,
      totalCredit: c,
      balanced: d === c && d > 0,
      valid: allLinesValid && d === c && d > 0 && description.trim().length > 0,
    };
  }, [lines, description]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        idempotency_key:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `manual:${crypto.randomUUID()}`
            : `manual:${Date.now()}-${Math.random()}`,
        entry_date: entryDate,
        description: description.trim(),
        source_service: "manual",
        source_type: sourceType.trim() || "adjustment",
        source_id: null,
        lines: lines.map((l) => ({
          account_ref: l.accountRef,
          debit: l.side === "debit" ? toKobo(l.amount) : 0,
          credit: l.side === "credit" ? toKobo(l.amount) : 0,
          currency: "NGN",
          dimension_1: l.dimension1.trim() || null,
        })),
      };
      const res = await apiPost<JournalEntryResult>(
        "/api/v1/admin/finance/journal-entries",
        payload,
        { auth: true },
      );
      router.push(`/admin/finance/journal-entries/${res.entry_id}`);
    } catch (e) {
      console.error("Failed to post manual entry:", e);
      setError(
        "Could not post the entry — check you have the accountant role, accounts are valid, and the period is open.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/finance/journal-entries"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to journal entries
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance — Manual Journal Entry
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Post a balanced adjustment. Debits must equal credits. Amounts in Naira.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-slate-600">Entry date</span>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Reclassify pool fees Q2"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-12 items-center gap-2 border-b border-slate-50 pb-2"
            >
              <select
                value={l.accountRef}
                onChange={(e) => updateLine(i, { accountRef: e.target.value })}
                className="col-span-5 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <select
                value={l.side}
                onChange={(e) =>
                  updateLine(i, { side: e.target.value as "debit" | "credit" })
                }
                className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={l.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                placeholder="0.00"
                className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm tabular-nums"
              />
              <input
                type="text"
                value={l.dimension1}
                onChange={(e) => updateLine(i, { dimension1: e.target.value })}
                placeholder="domain"
                className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length <= 2}
                className="col-span-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Remove line"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={addLine}>
            <Plus className="mr-1 h-4 w-4" /> Add line
          </Button>
          <div className="text-sm tabular-nums">
            <span className="text-slate-500">Debits</span>{" "}
            <span className="font-medium">{formatNaira(totalDebit / 100)}</span>
            <span className="mx-3 text-slate-300">·</span>
            <span className="text-slate-500">Credits</span>{" "}
            <span className="font-medium">{formatNaira(totalCredit / 100)}</span>
            <span
              className={`ml-3 font-medium ${balanced ? "text-emerald-600" : "text-red-600"}`}
            >
              {balanced ? "balanced" : "out of balance"}
            </span>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          placeholder="type tag"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          aria-label="Source type"
        />
        <Button onClick={submit} disabled={!valid || submitting}>
          {submitting ? "Posting…" : "Post entry"}
        </Button>
      </div>
    </div>
  );
}
