"use client";

import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// Mirror services/ledger_service/schemas/invoice.py
type InvoiceListItem = {
  id: string;
  invoice_number: string;
  status: string;
  customer_name: string | null;
  currency: string;
  total_minor: number;
  issue_date: string;
  created_at: string;
};
type InvoiceList = { items: InvoiceListItem[]; total: number };

const naira = (kobo: number) => formatNaira(kobo / 100);
const todayISO = () => new Date().toISOString().slice(0, 10);

type LineDraft = { description: string; quantity: string; unit_price: string };
const emptyLine = (): LineDraft => ({
  description: "",
  quantity: "1",
  unit_price: "",
});

const STATUS_STYLE: Record<string, string> = {
  issued: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  void: "bg-rose-50 text-rose-700",
};

export default function InvoicesPage() {
  const router = useRouter();
  const [list, setList] = useState<InvoiceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(
        await apiGet<InvoiceList>("/api/v1/admin/finance/invoices?limit=200", {
          auth: true,
        }),
      );
    } catch {
      setError("Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Finance — Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Formal invoices with sequential numbering (SB-YYYY-NNNNNN) — issue one
            for a corporate client, then view or print it.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          New invoice
        </button>
      </div>

      {showForm && (
        <NewInvoiceForm
          onCreated={(id) => {
            setShowForm(false);
            router.push(`/admin/finance/invoices/${id}`);
          }}
        />
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          <FileText className="h-5 w-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-slate-900">All invoices</h2>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : !list || list.items.length === 0 ? (
            <p className="text-sm text-slate-500">
              No invoices yet. Issue one with “New invoice”.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Number</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() =>
                        router.push(`/admin/finance/invoices/${inv.id}`)
                      }
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                        {inv.invoice_number}
                      </td>
                      <td className="py-2 pr-4 text-slate-900">
                        {inv.customer_name ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs capitalize ${
                            STATUS_STYLE[inv.status] ?? "bg-slate-100"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">
                        {inv.issue_date}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-900">
                        {naira(inv.total_minor)}
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

function NewInvoiceForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
    0,
  );

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setErr(null);
    const clean = lines.filter(
      (l) => l.description.trim() && Number(l.unit_price) >= 0,
    );
    if (!customerName.trim()) return setErr("Customer name is required.");
    if (clean.length === 0) return setErr("Add at least one line item.");
    setSaving(true);
    try {
      const inv = await apiPost<{ id: string }>(
        "/api/v1/admin/finance/invoices",
        {
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          customer_tin: customerTin.trim() || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          source_service: "corporate",
          lines: clean.map((l) => ({
            description: l.description.trim(),
            quantity: Number(l.quantity) || 1,
            unit_price_minor: Math.round(Number(l.unit_price) * 100),
          })),
        },
        { auth: true },
      );
      onCreated(inv.id);
    } catch {
      setErr("Could not create the invoice.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900";

  return (
    <Card>
      <div className="border-b border-slate-100 p-4">
        <h2 className="text-lg font-semibold text-slate-900">New invoice</h2>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            Customer name *
            <input
              className={field}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Acme Ltd"
            />
          </label>
          <label className="text-sm text-slate-600">
            Email
            <input
              className={field}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Tax ID (TIN)
            <input
              className={field}
              value={customerTin}
              onChange={(e) => setCustomerTin(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Issue date
            <input
              type="date"
              className={field}
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Due date
            <input
              type="date"
              className={field}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Line items</p>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${field} flex-1`}
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) => setLine(i, { description: e.target.value })}
                />
                <input
                  className={`${field} w-20`}
                  placeholder="Qty"
                  value={l.quantity}
                  onChange={(e) => setLine(i, { quantity: e.target.value })}
                />
                <input
                  className={`${field} w-32`}
                  placeholder="Unit price ₦"
                  value={l.unit_price}
                  onChange={(e) => setLine(i, { unit_price: e.target.value })}
                />
                <button
                  onClick={() =>
                    setLines((ls) =>
                      ls.length > 1 ? ls.filter((_, j) => j !== i) : ls,
                    )
                  }
                  className="text-slate-400 hover:text-rose-600"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
            className="mt-2 text-sm text-cyan-700 hover:underline"
          >
            + Add line
          </button>
        </div>

        <label className="block text-sm text-slate-600">
          Notes
          <textarea
            className={field}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {err && <p className="text-sm text-rose-600">{err}</p>}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-900">
            Total: {formatNaira(total)}
          </span>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {saving ? "Issuing…" : "Issue invoice"}
          </button>
        </div>
      </div>
    </Card>
  );
}
