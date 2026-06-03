"use client";

import { apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { ArrowLeft, Ban, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type InvoiceLine = {
  position: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  amount_minor: number;
};
type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_tin: string | null;
  currency: string;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  void_reason: string | null;
  lines: InvoiceLine[];
};

const naira = (kobo: number) => formatNaira(kobo / 100);

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInv(
        await apiGet<Invoice>(`/api/v1/admin/finance/invoices/${invoiceId}`, {
          auth: true,
        }),
      );
    } catch {
      setError("Could not load this invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const voidInvoice = async () => {
    const reason = window.prompt("Reason for voiding this invoice?");
    if (reason === null) return;
    setVoiding(true);
    try {
      await apiPost(
        `/api/v1/admin/finance/invoices/${invoiceId}/void`,
        { reason },
        { auth: true },
      );
      await load();
    } catch {
      setError("Could not void the invoice.");
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error || !inv)
    return <p className="text-sm text-rose-600">{error ?? "Not found."}</p>;

  const isVoid = inv.status === "void";

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print,
          #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/finance/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          All invoices
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          {!isVoid && (
            <button
              onClick={voidInvoice}
              disabled={voiding}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              {voiding ? "Voiding…" : "Void"}
            </button>
          )}
        </div>
      </div>

      <div
        id="invoice-print"
        className="rounded-xl border border-slate-200 bg-white p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-cyan-700">SwimBuddz</p>
            <p className="text-xs text-slate-500">Lagos, Nigeria</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900">INVOICE</p>
            <p className="font-mono text-sm text-slate-700">
              {inv.invoice_number}
            </p>
            {isVoid && (
              <p className="mt-1 text-sm font-semibold uppercase text-rose-600">
                Void
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Bill to
            </p>
            <p className="font-medium text-slate-900">
              {inv.customer_name ?? "—"}
            </p>
            {inv.customer_email && (
              <p className="text-slate-500">{inv.customer_email}</p>
            )}
            {inv.customer_tin && (
              <p className="text-slate-500">TIN: {inv.customer_tin}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-slate-500">
              Issued: <span className="text-slate-800">{inv.issue_date}</span>
            </p>
            {inv.due_date && (
              <p className="text-slate-500">
                Due: <span className="text-slate-800">{inv.due_date}</span>
              </p>
            )}
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 text-right font-medium">Qty</th>
              <th className="py-2 pr-4 text-right font-medium">Unit price</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.position} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-800">{l.description}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                  {l.quantity}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                  {naira(l.unit_price_minor)}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-900">
                  {naira(l.amount_minor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{naira(inv.subtotal_minor)}</span>
            </div>
            {inv.tax_minor > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span className="tabular-nums">{naira(inv.tax_minor)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{naira(inv.total_minor)}</span>
            </div>
          </div>
        </div>

        {inv.notes && (
          <p className="mt-6 border-t border-slate-100 pt-3 text-sm text-slate-500">
            {inv.notes}
          </p>
        )}
        {isVoid && inv.void_reason && (
          <p className="mt-2 text-sm text-rose-600">
            Voided: {inv.void_reason}
          </p>
        )}
      </div>
    </div>
  );
}
