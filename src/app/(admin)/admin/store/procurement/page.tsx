"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MediaInput } from "@/components/ui/MediaInput";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const ROOT = "/api/v1/admin/store/procurement";
type Catalogue = { suppliers: { id: string; name: string }[]; variants: { id: string; sku: string; product_id: string }[] };
type Summary = { id: string; order_number: string; supplier_id: string; requested_by: string; approved_by: string | null; status: string };
type Detail = Summary & { lines: { id: string; variant_id: string; quantity: number; received: number; unit_landed_minor: number }[]; description: string };
type Liability = {
  id: string; supplier_id: string; order_id: string; reference: string;
  total_minor?: number; verified_paid_minor?: number; outstanding_minor: number;
  status?: string; due_on: string | null; evidence_media_id?: string | null;
};
type Receivable = {
  id: string; order_id: string; order_number?: string; order_status?: string;
  status: string; due_on: string; amount_minor?: number; verified_paid_minor?: number;
  outstanding_minor: number; can_fulfill?: boolean; ledger_sync_status?: string;
};
type Opening = {
  id: string; variant_id: string; source_reference: string; quantity: number;
  total_cost_minor: number; status: string; proposed_by: string;
  evidence_media_id?: string | null; ledger_sync_status?: string;
};
type InventoryValue = { variant_id: string; on_hand: number; valued_quantity: number | null; total_cost_minor: number | null; reconciled: boolean };
type UnpaidOrder = { id: string; order_number: string; total_minor: number };
type FulfilledOrder = {
  id: string; order_number: string; status: string; total_minor: number;
  items: { id: string; variant_id: string; product_name: string; variant_name: string | null; quantity: number }[];
};

const money = (minor: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(minor / 100);
const control = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40";

export default function ProcurementPage() {
  const [catalogue, setCatalogue] = useState<Catalogue>({ suppliers: [], variants: [] });
  const [orders, setOrders] = useState<Summary[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [fulfilledOrders, setFulfilledOrders] = useState<FulfilledOrder[]>([]);
  const [owner, setOwner] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [stock, setStock] = useState<InventoryValue[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidOrder[]>([]);

  // Opening reconciliation form
  const [openingVariant, setOpeningVariant] = useState("");
  const [openingCost, setOpeningCost] = useState("");
  const [openingReference, setOpeningReference] = useState("");
  const [openingReason, setOpeningReason] = useState("");
  const [openingMediaId, setOpeningMediaId] = useState<string | null>(null);

  // Customer credit request & repayment forms
  const [creditOrder, setCreditOrder] = useState("");
  const [creditDue, setCreditDue] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [repayForms, setRepayForms] = useState<Record<string, { amount: string; bankRef: string; bankAcct: string; mediaId: string | null }>>({});

  // Supplier settlement forms
  const [settleForms, setSettleForms] = useState<Record<string, { amount: string; bankRef: string; journalId: string; mediaId: string | null }>>({});

  // Fulfilled order return & COGS reversal form
  const [returnOrderId, setReturnOrderId] = useState("");
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQty, setReturnQty] = useState("1");
  const [returnCondition, setReturnCondition] = useState<"restockable" | "damaged">("restockable");
  const [returnRef, setReturnRef] = useState("");
  const [returnReason, setReturnReason] = useState("");

  // Grants & PO creation/receiving/invoicing
  const [grantAuthId, setGrantAuthId] = useState("");
  const [grantRole, setGrantRole] = useState("procurement_officer");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costNaira, setCostNaira] = useState("");
  const [description, setDescription] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [receiptMediaId, setReceiptMediaId] = useState<string | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});
  const [invoiceReference, setInvoiceReference] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [invoiceMediaId, setInvoiceMediaId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cat, list, bills, debts, openingRows, inventoryRows, unpaidRows, capability, fulfilled] = await Promise.all([
      apiGet<Catalogue>(ROOT + "/catalogue", { auth: true }),
      apiGet<Summary[]>(ROOT + "/orders", { auth: true }),
      apiGet<Liability[]>(ROOT + "/liabilities", { auth: true }),
      apiGet<Receivable[]>(ROOT + "/receivables", { auth: true }),
      apiGet<Opening[]>(ROOT + "/openings", { auth: true }),
      apiGet<InventoryValue[]>(ROOT + "/inventory-values", { auth: true }),
      apiGet<UnpaidOrder[]>(ROOT + "/unpaid-orders", { auth: true }),
      apiGet<{ can_write: boolean }>(ROOT + "/me", { auth: true }),
      apiGet<FulfilledOrder[]>(ROOT + "/fulfilled-orders", { auth: true }).catch(() => []),
    ]);
    setCatalogue(cat); setOrders(list); setLiabilities(bills); setReceivables(debts);
    setOpenings(openingRows); setStock(inventoryRows); setUnpaid(unpaidRows);
    setCanWrite(capability.can_write); setFulfilledOrders(fulfilled);
    const role = await apiGet<{ role: string }>("/api/v1/admin/finance/users/me", { auth: true }).catch(() => null);
    setOwner(role?.role === "owner");
  }, []);

  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Cannot load procurement.")); }, [load]);

  const openOrder = async (id: string) => setSelected(await apiGet<Detail>(ROOT + "/orders/" + id, { auth: true }));

  const perform = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); setNotice(success); await load(); if (selected) await openOrder(selected.id); }
    catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); }
    finally { setBusy(false); }
  };

  const openPrivateDocument = async (mediaId: string) => {
    try {
      const item = await apiGet<{ file_url: string }>(`/api/v1/media/media/${mediaId}`, { auth: true });
      if (item?.file_url) window.open(item.file_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open attached document.");
    }
  };

  const toMinor = (input: string) => {
    const cleaned = input.replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw Error("Enter a nonnegative Naira amount, at most two decimals.");
    const [n, c = ""] = cleaned.split(".");
    const value = Number(n) * 100 + Number(c.padEnd(2, "0"));
    if (!Number.isSafeInteger(value)) throw Error("Amount too large");
    return value;
  };

  const selectedFulfilledOrder = fulfilledOrders.find((o) => o.id === returnOrderId) ?? null;

  return <main className="mx-auto max-w-6xl space-y-5 p-5">
    <header>
      <Link className="text-sm text-cyan-700 underline" href="/admin/store">Back to Store</Link>
      <h1 className="mt-2 text-2xl font-semibold">Procurement &amp; Inventory</h1>
      <Link href="/admin/store/procurement/guide" className="text-sm font-medium text-cyan-700 underline">How to use Procurement</Link>
      <p className="text-sm text-slate-600">End-to-end purchasing, moving weighted-average inventory valuation, supplier settlements, approved credit sales, and return COGS reversals.</p>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">New purchase request</h2>
      {canWrite && <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void perform(() => apiPost(ROOT + "/orders", {
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
      </form>}
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
          <h4 className="font-medium">Receive goods (updates stock, valuation &amp; posts Inventory/AP to Ledger)</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">Receipt reference<input className={control} value={receiptReference} onChange={e => setReceiptReference(e.target.value)} /></label>
            <label className="text-sm">Delivery evidence reference<input className={control} value={evidenceReference} onChange={e => setEvidenceReference(e.target.value)} /></label>
            <div className="md:col-span-2">
              <MediaInput purpose="finance_document" label="Attach delivery waybill / receipt (PDF/image, optional)" value={receiptMediaId} onChange={(id) => setReceiptMediaId(id)} showPreview={false} />
            </div>
            {selected.lines.filter(l => l.received < l.quantity).map(l => <label key={l.id} className="text-sm">Received quantity for {catalogue.variants.find(v => v.id === l.variant_id)?.sku || l.variant_id}
              <input type="number" min="0" max={l.quantity - l.received} className={control} value={receiptQuantities[l.id] || ""} onChange={e => setReceiptQuantities(old => ({ ...old, [l.id]: e.target.value }))} />
            </label>)}
          </div>
          <button className={button} disabled={busy || receiptReference.trim().length < 5 || evidenceReference.trim().length < 5} onClick={() => {
            const lines = selected.lines.filter(l => Number(receiptQuantities[l.id]) > 0).map(l => ({ purchase_line_id: l.id, quantity: Number(receiptQuantities[l.id]) }));
            if (!lines.length) { setError("Enter at least one received quantity."); return; }
            void perform(async () => {
              await apiPost(ROOT + "/orders/" + selected.id + "/receive", { reference: receiptReference, evidence_reference: evidenceReference, evidence_media_id: receiptMediaId, lines }, { auth: true });
              setReceiptMediaId(null);
            }, "Goods receipt, valuation and Ledger Inventory/AP entry recorded.");
          }}>Post verified goods receipt</button>
        </>}
        {(selected.status === "approved" || selected.status === "partially_received" || selected.status === "received") && <div className="space-y-2">
          <h4 className="font-medium">Record supplier invoice (liability, not payment)</h4>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">Supplier invoice reference<input className={control} value={invoiceReference} onChange={e => setInvoiceReference(e.target.value)} /></label>
            <label className="text-sm">Invoice total (₦)<input className={control} value={invoiceTotal} onChange={e => setInvoiceTotal(e.target.value)} /></label>
            <div className="md:col-span-2">
              <MediaInput purpose="finance_document" label="Attach supplier invoice PDF/image (optional)" value={invoiceMediaId} onChange={(id) => setInvoiceMediaId(id)} showPreview={false} />
            </div>
          </div>
          <button className={button} disabled={busy} onClick={() => void perform(async () => {
            await apiPost(ROOT + "/orders/" + selected.id + "/invoices", { reference: invoiceReference, total_minor: toMinor(invoiceTotal), evidence_media_id: invoiceMediaId }, { auth: true });
            setInvoiceMediaId(null);
          }, "Supplier liability recorded, awaiting verified bank settlement.")}>Record invoice</button>
        </div>}
      </div>}
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Historical stock reconciliation</h2>
      <p className="text-sm text-slate-600">Review physical stock and its documented acquisition cost. Approved openings value stock and post DR Store Inventory / CR Retained Earnings. Unvalued legacy SKUs remain fulfillable operationally and are flagged as missing COGS.</p>
      {stock.filter(i => !i.reconciled).map(i => <p key={i.variant_id} className="text-sm text-amber-800">
        {catalogue.variants.find(v => v.id === i.variant_id)?.sku || i.variant_id}: {i.on_hand} units without complete verified acquisition cost
      </p>)}
      {canWrite && <form className="grid gap-3 md:grid-cols-2" onSubmit={e => { e.preventDefault();
        const current = stock.find(i => i.variant_id === openingVariant);
        if (!current) { setError("Choose existing stock for reconciliation."); return; }
        void perform(async () => {
          await apiPost(ROOT + "/openings", {
            variant_id: openingVariant, quantity: current.on_hand, total_cost_minor: toMinor(openingCost),
            source_reference: openingReference, evidence_media_id: openingMediaId, reason: openingReason,
          }, { auth: true });
          setOpeningMediaId(null);
        }, "Opening proposed for independent owner review.");
      }}>
        <label className="text-sm">Unvalued SKU<select className={control} required value={openingVariant} onChange={e => setOpeningVariant(e.target.value)}>
          <option value="">Select stock</option>
          {stock.filter(i => !i.reconciled).map(i => <option key={i.variant_id} value={i.variant_id}>{catalogue.variants.find(v => v.id === i.variant_id)?.sku || i.variant_id} · {i.on_hand} units</option>)}
        </select></label>
        <label className="text-sm">Total acquisition cost (₦)<input className={control} required value={openingCost} onChange={e => setOpeningCost(e.target.value)} /></label>
        <label className="text-sm">Count and invoice evidence ID<input className={control} required minLength={5} value={openingReference} onChange={e => setOpeningReference(e.target.value)} /></label>
        <label className="text-sm">Reconciliation explanation<input className={control} required minLength={10} value={openingReason} onChange={e => setOpeningReason(e.target.value)} /></label>
        <div className="md:col-span-2">
          <MediaInput purpose="finance_document" label="Attach historical supplier receipt / count sheet (optional)" value={openingMediaId} onChange={(id) => setOpeningMediaId(id)} showPreview={false} />
        </div>
        <button className={button} disabled={busy}>Propose documented opening value</button>
      </form>}
      {openings.map(o => <div key={o.id} className="flex flex-wrap justify-between gap-3 rounded-lg border p-3 text-sm">
        <div>
          {catalogue.variants.find(v => v.id === o.variant_id)?.sku || o.variant_id} · {o.quantity} units · {money(o.total_cost_minor)} · {o.status}
          {o.ledger_sync_status && o.ledger_sync_status !== "not_posted" && <span className="ml-2 text-xs text-slate-500">Ledger: {o.ledger_sync_status}</span>}
          <p className="text-xs text-slate-500">{o.source_reference}</p>
          {o.evidence_media_id && <button type="button" className="text-xs text-cyan-700 underline" onClick={() => void openPrivateDocument(o.evidence_media_id!)}>View evidence</button>}
        </div>
        {owner && o.status === "pending" && <div className="flex gap-2">
          <button className={button} disabled={busy} onClick={() => void perform(() => apiPost(ROOT + "/openings/" + o.id + "/decision?approve=true", {}, { auth: true }), "Opening approved and posted to Ledger.")}>Approve</button>
          <button className={button} disabled={busy} onClick={() => void perform(() => apiPost(ROOT + "/openings/" + o.id + "/decision?approve=false", {}, { auth: true }), "Opening rejected.")}>Reject</button>
        </div>}
      </div>)}
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Supplier invoices &amp; verified settlements</h2>
      <p className="text-xs text-slate-600">After confirming a Liability Settlement in Finance → Treasury &amp; Operations, Finance Owner records the verified partial or full settlement below (optionally linking the posted Ledger journal UUID).</p>
      {!liabilities.length && <p className="text-sm text-slate-500">No supplier invoices recorded.</p>}
      {liabilities.map(l => {
        const form = settleForms[l.id] ?? { amount: "", bankRef: "", journalId: "", mediaId: null };
        const updateForm = (patch: Partial<typeof form>) => setSettleForms(old => ({ ...old, [l.id]: { ...form, ...patch } }));
        return <div key={l.id} className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>{l.reference}</strong> · {l.status || (l.outstanding_minor === 0 ? "paid" : "unpaid")}
              {l.due_on ? ` · due ${l.due_on}` : ""}
              <p className="text-xs text-slate-600">
                Total: {l.total_minor != null ? money(l.total_minor) : "—"} · Paid: {l.verified_paid_minor != null ? money(l.verified_paid_minor) : "—"} · Outstanding: <strong>{money(l.outstanding_minor)}</strong>
              </p>
            </div>
            {l.evidence_media_id && <button type="button" className="text-xs text-cyan-700 underline" onClick={() => void openPrivateDocument(l.evidence_media_id!)}>View invoice</button>}
          </div>
          {owner && l.outstanding_minor > 0 && <div className="grid gap-2 border-t pt-2 md:grid-cols-3">
            <label className="text-xs">Settlement amount (₦)<input className={control} placeholder={String(l.outstanding_minor / 100)} value={form.amount} onChange={e => updateForm({ amount: e.target.value })} /></label>
            <label className="text-xs">Bank transfer reference<input className={control} placeholder="STANBIC-REF-..." value={form.bankRef} onChange={e => updateForm({ bankRef: e.target.value })} /></label>
            <label className="text-xs">Linked Ledger journal UUID (optional)<input className={control} placeholder="Posted Treasury journal UUID" value={form.journalId} onChange={e => updateForm({ journalId: e.target.value })} /></label>
            <div className="md:col-span-3">
              <MediaInput purpose="finance_document" label="Attach bank payment slip (optional)" value={form.mediaId} onChange={(id) => updateForm({ mediaId: id })} showPreview={false} />
            </div>
            <div><button className={button} disabled={busy || !form.amount || form.bankRef.trim().length < 3} onClick={() => void perform(async () => {
              await apiPost(ROOT + "/invoices/" + l.id + "/settlements", {
                amount_minor: toMinor(form.amount),
                bank_reference: form.bankRef.trim(),
                ledger_journal_entry_id: form.journalId.trim() || null,
                evidence_media_id: form.mediaId,
              }, { auth: true });
              updateForm({ amount: "", bankRef: "", journalId: "", mediaId: null });
            }, "Verified supplier invoice settlement recorded.")}>Record verified settlement</button></div>
          </div>}
        </div>;
      })}
    </section>

    <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Customer credit agreements &amp; repayments</h2>
      <p className="text-xs text-slate-600">Independent Finance Owner approval books Accounts Receivable (DR AR / CR Store Revenue) and unlocks controlled order fulfillment. Record verified partial or full bank repayments below until settled.</p>
      {canWrite && <form className="grid gap-3 md:grid-cols-2" onSubmit={e => { e.preventDefault();
        void perform(() => apiPost(ROOT + "/receivables", { order_id: creditOrder, due_on: creditDue, reason: creditReason }, { auth: true }), "Credit application submitted.");
      }}>
        <label className="text-sm">Unpaid Store order<select className={control} required value={creditOrder} onChange={e => setCreditOrder(e.target.value)}>
          <option value="">Select order</option>{unpaid.map(o => <option key={o.id} value={o.id}>{o.order_number} · {money(o.total_minor)}</option>)}
        </select></label>
        <label className="text-sm">Due date<input type="date" className={control} required value={creditDue} onChange={e => setCreditDue(e.target.value)} /></label>
        <label className="text-sm md:col-span-2">Business reason<input className={control} minLength={10} required value={creditReason} onChange={e => setCreditReason(e.target.value)} /></label>
        <button className={button} disabled={busy}>Request credit approval</button>
      </form>}
      {receivables.map(l => {
        const form = repayForms[l.id] ?? { amount: "", bankRef: "", bankAcct: "bank_operating_ngn", mediaId: null };
        const updateForm = (patch: Partial<typeof form>) => setRepayForms(old => ({ ...old, [l.id]: { ...form, ...patch } }));
        return <div key={l.id} className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <strong>{l.order_number || l.order_id.slice(0, 8)}</strong> · {l.status} · due {l.due_on}
              {l.can_fulfill && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Fulfillment unlocked</span>}
              <p className="text-xs text-slate-600">
                Total: {l.amount_minor != null ? money(l.amount_minor) : "—"} · Repaid: {l.verified_paid_minor != null ? money(l.verified_paid_minor) : "—"} · Outstanding: <strong>{money(l.outstanding_minor)}</strong>
              </p>
            </div>
            {owner && l.status === "requested" && <div className="flex gap-2">
              <button className={button} disabled={busy} onClick={() => void perform(() => apiPost(ROOT + "/receivables/" + l.id + "/decision?approve=true", {}, { auth: true }), "Customer credit approved; AR booked and controlled fulfillment unlocked.")}>Approve</button>
              <button className={button} disabled={busy} onClick={() => void perform(() => apiPost(ROOT + "/receivables/" + l.id + "/decision?approve=false", {}, { auth: true }), "Credit rejected.")}>Reject</button>
            </div>}
          </div>
          {owner && l.status === "approved" && l.outstanding_minor > 0 && <div className="grid gap-2 border-t pt-2 md:grid-cols-3">
            <label className="text-xs">Repayment amount (₦)<input className={control} placeholder={String(l.outstanding_minor / 100)} value={form.amount} onChange={e => updateForm({ amount: e.target.value })} /></label>
            <label className="text-xs">Verified bank reference<input className={control} placeholder="STANBIC-IN-..." value={form.bankRef} onChange={e => updateForm({ bankRef: e.target.value })} /></label>
            <label className="text-xs">Receiving bank account ref<input className={control} value={form.bankAcct} onChange={e => updateForm({ bankAcct: e.target.value })} /></label>
            <div className="md:col-span-3">
              <MediaInput purpose="finance_document" label="Attach customer payment proof (optional)" value={form.mediaId} onChange={(id) => updateForm({ mediaId: id })} showPreview={false} />
            </div>
            <div><button className={button} disabled={busy || !form.amount || form.bankRef.trim().length < 3} onClick={() => void perform(async () => {
              await apiPost(ROOT + "/receivables/" + l.id + "/payments", {
                amount_minor: toMinor(form.amount),
                bank_reference: form.bankRef.trim(),
                bank_account_ref: form.bankAcct.trim() || "bank_operating_ngn",
                evidence_media_id: form.mediaId,
              }, { auth: true });
              updateForm({ amount: "", bankRef: "", bankAcct: "bank_operating_ngn", mediaId: null });
            }, "Verified credit repayment recorded and posted to Ledger.")}>Record verified repayment</button></div>
          </div>}
        </div>;
      })}
      {!receivables.length && <p className="text-sm text-slate-500">No credit agreements recorded.</p>}
    </section>

    {owner && <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Fulfilled order returns &amp; COGS reversal</h2>
      <p className="text-xs text-slate-600">Restockable returns restore inventory quantity, moving-average valuation, and post DR Store Inventory / CR Store COGS. Damaged returns log shrinkage without inflating sellable stock.</p>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={e => {
        e.preventDefault();
        void perform(async () => {
          await apiPost(ROOT + "/orders/" + returnOrderId + "/returns", {
            reference: returnRef.trim(),
            reason: returnReason.trim(),
            lines: [{ order_item_id: returnItemId, quantity: Number(returnQty), condition: returnCondition }],
          }, { auth: true });
          setReturnRef(""); setReturnReason("");
        }, "Fulfilled order return and inventory/COGS adjustment recorded.");
      }}>
        <label className="text-sm">Fulfilled order<select className={control} required value={returnOrderId} onChange={e => { setReturnOrderId(e.target.value); setReturnItemId(""); }}>
          <option value="">Select fulfilled order</option>
          {fulfilledOrders.map(o => <option key={o.id} value={o.id}>{o.order_number} · {o.status} · {money(o.total_minor)}</option>)}
        </select></label>
        <label className="text-sm">Returned line item<select className={control} required value={returnItemId} onChange={e => setReturnItemId(e.target.value)} disabled={!selectedFulfilledOrder}>
          <option value="">Select item</option>
          {(selectedFulfilledOrder?.items ?? []).map(it => <option key={it.id} value={it.id}>{it.product_name}{it.variant_name ? ` (${it.variant_name})` : ""} · sold {it.quantity}</option>)}
        </select></label>
        <label className="text-sm">Return quantity<input type="number" min="1" className={control} required value={returnQty} onChange={e => setReturnQty(e.target.value)} /></label>
        <label className="text-sm">Item condition<select className={control} value={returnCondition} onChange={e => setReturnCondition(e.target.value as "restockable" | "damaged")}>
          <option value="restockable">Restockable (restore inventory &amp; reverse COGS)</option>
          <option value="damaged">Damaged (record shrinkage, do not restock)</option>
        </select></label>
        <label className="text-sm">Unique return reference<input className={control} required minLength={3} placeholder="RET-2026-001" value={returnRef} onChange={e => setReturnRef(e.target.value)} /></label>
        <label className="text-sm">Return reason<input className={control} required minLength={5} value={returnReason} onChange={e => setReturnReason(e.target.value)} /></label>
        <div><button className={button} disabled={busy || !returnOrderId || !returnItemId}>Record audited return</button></div>
      </form>
    </section>}

    {owner && <section className="rounded-xl border bg-white p-5 space-y-3">
      <h2 className="font-semibold">Store procurement staff access</h2>
      <p className="text-xs text-slate-600">This creates a narrowly scoped platform role; it does not grant Finance Accountant, global admin, or bank-payment rights.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault();
        void perform(() => apiPut(ROOT + "/grants", { auth_id: grantAuthId, role: grantRole, active: true }, { auth: true }), "Staff procurement permission granted.");
      }}>
        <label className="text-sm">Authenticated staff user ID<input className={control} required minLength={3} value={grantAuthId} onChange={e => setGrantAuthId(e.target.value)} /></label>
        <label className="text-sm">Role<select className={control} value={grantRole} onChange={e => setGrantRole(e.target.value)}>
          <option value="procurement_officer">Procurement Officer</option><option value="inventory_viewer">Inventory Viewer</option>
        </select></label>
        <button disabled={busy} className={button}>Grant permission</button>
      </form>
    </section>}
  </main>;
}
