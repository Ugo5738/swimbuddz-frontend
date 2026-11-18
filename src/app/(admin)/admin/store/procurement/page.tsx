"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

const ROOT = "/api/v1/admin/store/procurement";
type Catalogue = { suppliers: { id: string; name: string }[]; variants: { id: string; sku: string; product_id: string }[] };
type Summary = { id: string; order_number: string; supplier_id: string; requested_by: string; approved_by: string | null; status: string };
type Detail = Summary & { lines: { id: string; variant_id: string; quantity: number; received: number; unit_landed_minor: number }[]; description: string };
type Liability = { id: string; supplier_id: string; reference: string; outstanding_minor: number; due_on: string | null };
type Receivable = { id: string; order_id: string; status: string; due_on: string; outstanding_minor: number };
const money = (minor: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(minor / 100);
const control = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40";
export default function ProcurementPage() {
  const [catalogue, setCatalogue] = useState<Catalogue>({ suppliers: [], variants: [] });
  const [orders, setOrders] = useState<Summary[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [owner, setOwner] = useState(false);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costNaira, setCostNaira] = useState("");
  const [description, setDescription] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});
  const [invoiceReference, setInvoiceReference] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [cat, list, bills, debts] = await Promise.all([
      apiGet<Catalogue>(ROOT + "/catalogue", { auth: true }),
      apiGet<Summary[]>(ROOT + "/orders", { auth: true }),
      apiGet<Liability[]>(ROOT + "/liabilities", { auth: true }),
      apiGet<Receivable[]>(ROOT + "/receivables", { auth: true }),
    ]);
    setCatalogue(cat); setOrders(list); setLiabilities(bills); setReceivables(debts);
    const role = await apiGet<{ role: string }>("/api/v1/admin/finance/users/me", { auth: true }).catch(() => null);
    setOwner(role?.role === "owner");
  }, []);
  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Cannot load procurement.")); }, [load]);
  const perform = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); setNotice(success); await load(); if (selected) await openOrder(selected.id); }
    catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); }
    finally { setBusy(false); }
  };
  const openOrder = async (id: string) => setSelected(await apiGet<Detail>(ROOT + "/orders/" + id, { auth: true }));
  const toMinor = (input: string) => {
    const cleaned = input.replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw Error("Enter a nonnegative Naira amount, at most two decimals.");
    const [n, c = ""] = cleaned.split(".");
    const value = Number(n) * 100 + Number(c.padEnd(2, "0"));
    if (!Number.isSafeInteger(value)) throw Error("Amount too large");
    return value;
  };
  return <main className="mx-auto max-w-6xl space-y-5 p-5">
    <header><Link className="text-sm text-cyan-700 underline" href="/admin/store">Back to Store</Link>
      <h1 className="mt-2 text-2xl font-semibold">Procurement & Inventory</h1>
      <p className="text-sm text-slate-600">Purchasing is separate from supplier commission payouts, bank payment approvals and paid checkout orders.</p></header>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-slate-200 p-3 text-sm">{notice}</p>}
    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">New purchase request</h2>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void perform(() => apiPost(ROOT + "/orders", {
        supplier_id: supplierId, description, lines: [{ variant_id: variantId, quantity: Number(quantity), landed_unit_cost_minor: toMinor(costNaira) }],
      }, { auth: true }), "Purchase draft created. Submit it for independent approval."); }}>
        <label className="text-sm">Supplier<select className={control} required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Select supplier</option>{catalogue.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label className="text-sm">Product SKU<select className={control} required value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          <option value="">Select variant</option>{catalogue.variants.map(v => <option key={v.id} value={v.id}>{v.sku}</option>)}
        </select></label>
        <label className="text-sm">Quantity<input type="number" min="1" className={control} required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <label className="text-sm">Landed unit cost (₦)<input className={control} required placeholder="Cost including allocated purchase freight" value={costNaira} onChange={(e) => setCostNaira(e.target.value)} /></label>
        <label className="text-sm md:col-span-2">Business reason<input className={control} minLength={5} required value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className={button} disabled={busy}>Create draft</button>
      </form>
      <p className="text-xs text-amber-800">Current form creates one SKU per request; the API supports multiple approved line items. Do not use an estimated price as a confirmed cost.</p>
    </section>
    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Purchase orders</h2>
      <div className="grid gap-2 md:grid-cols-2">{orders.map(o => <button key={o.id} className="rounded-lg border p-3 text-left hover:bg-slate-50" onClick={() => { void openOrder(o.id).catch(e => setError(String(e))); }}>
        <strong>{o.order_number}</strong><span className="float-right text-sm">{o.status}</span>
        <span className="mt-1 block text-xs text-slate-500">Requested by {o.requested_by}</span>
      </button>)}</div>
      {selected && <div className="rounded-lg border border-cyan-200 p-4 space-y-3">
        <h3 className="font-medium">{selected.order_number} · {selected.status}</h3>
        <p className="text-sm">{selected.description}</p>
        <div className="flex gap-2">
          {selected.status === "draft" && <button disabled={busy} className={button} onClick={() => void perform(() => apiPost(ROOT + "/orders/" + selected.id + "/submit", {}, { auth: true }), "Submitted to Finance Owner.")}>Submit for approval</button>}
          {owner && selected.status === "submitted" && <>
            <button disabled={busy} className={button} onClick={() => void perform(() => apiPost(ROOT + "/orders/" + selected.id + "/decision?approve=true", {}, { auth: true }), "Purchase approved.")}>Approve</button>
            <button disabled={busy} className={button} onClick={() => void perform(() => apiPost(ROOT + "/orders/" + selected.id + "/decision?approve=false", {}, { auth: true }), "Purchase rejected.")}>Reject</button>
          </>}
        </div>
        {selected.lines.map(line => <p key={line.id} className="text-sm">{catalogue.variants.find(v => v.id === line.variant_id)?.sku || line.variant_id}: {line.received} / {line.quantity} received · {money(line.unit_landed_minor)} unit landed cost</p>)}
        {(selected.status === "approved" || selected.status === "partially_received") && <>
          <h4 className="font-medium">Receive goods</h4>
          <p className="text-xs text-amber-800">Requires independently approved historical stock cost before new stock can be valued.</p>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">Receipt reference<input className={control} value={receiptReference} onChange={e => setReceiptReference(e.target.value)} /></label>
            <label className="text-sm">Delivery evidence reference<input className={control} value={evidenceReference} onChange={e => setEvidenceReference(e.target.value)} /></label>
            {selected.lines.filter(l => l.received < l.quantity).map(l => <label key={l.id} className="text-sm">Received quantity for {catalogue.variants.find(v => v.id === l.variant_id)?.sku || l.variant_id}
              <input type="number" min="0" max={l.quantity - l.received} className={control} value={receiptQuantities[l.id] || ""} onChange={e => setReceiptQuantities(old => ({ ...old, [l.id]: e.target.value }))} />
            </label>)}
          </div>
          <button className={button} disabled={busy || receiptReference.trim().length < 5 || evidenceReference.trim().length < 5} onClick={() => {
            const lines = selected.lines.filter(l => Number(receiptQuantities[l.id]) > 0).map(l => ({ purchase_line_id: l.id, quantity: Number(receiptQuantities[l.id]) }));
            if (!lines.length) { setError("Enter at least one received quantity."); return; }
            void perform(() => apiPost(ROOT + "/orders/" + selected.id + "/receive", { reference: receiptReference, evidence_reference: evidenceReference, lines }, { auth: true }), "Goods receipt and costing recorded.");
          }}>Post verified goods receipt</button>
        </>}
        {(selected.status === "approved" || selected.status === "partially_received" || selected.status === "received") && <div className="space-y-2">
          <h4 className="font-medium">Record supplier invoice (not a payment)</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">Supplier invoice reference<input className={control} value={invoiceReference} onChange={e => setInvoiceReference(e.target.value)} /></label>
            <label className="text-sm">Invoice total (₦)<input className={control} value={invoiceTotal} onChange={e => setInvoiceTotal(e.target.value)} /></label>
          </div>
          <button className={button} disabled={busy} onClick={() => void perform(() => apiPost(ROOT + "/orders/" + selected.id + "/invoices", { reference: invoiceReference, total_minor: toMinor(invoiceTotal) }, { auth: true }), "Supplier liability recorded, not paid.")}>Record invoice</button>
        </div>}
      </div>}
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Supplier liabilities</h2>
        {liabilities.map(l => <p className="text-sm" key={l.id}>{l.reference} · <strong>{money(l.outstanding_minor)}</strong>{l.due_on ? " due " + l.due_on : ""}</p>)}
        {!liabilities.length && <p className="text-sm text-slate-500">No supplier invoices recorded.</p>}
      </section>
      <section className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Customer credit requests</h2>
        <p className="text-xs text-amber-800">Approval never changes the existing checkout order to Paid.</p>
        {receivables.map(l => <p className="text-sm" key={l.id}>{l.order_id.slice(0, 8)} · {l.status} · <strong>{money(l.outstanding_minor)}</strong> due {l.due_on}</p>)}
        {!receivables.length && <p className="text-sm text-slate-500">No credit agreements recorded.</p>}
      </section>
    </div>
  </main>;
}
