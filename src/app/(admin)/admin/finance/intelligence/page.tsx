"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type PaymentGroup = { method: string; provider: string; confirmed_count: number; gross_ngn: string };
type Report = {
  as_of: string;
  classification: string;
  degraded_domains?: string[];
  payments: {
    successful_checkout_groups: PaymentGroup[];
    posted_paystack_settlements: { count: number; gross_minor: number; net_minor: number; fees_minor: number };
    unposted_paystack_settlement_batches: number;
    warning: string;
  };
  academy: {
    active_enrollments: number;
    dropout_pending_enrollments?: number;
    reviewed_class_plans: number; enrollments_without_class_plan: number;
    remaining_prepaid_classes_with_reviewed_plans: number; pending_or_missed_installments_minor: number; warning: string;
  };
  club: { currently_active_enrollments: number; future_service_costs_minor: number | null; warning: string };
  store: {
    order_status_totals: { status: string; count: number; gross_order_ngn: string }[];
    valued_inventory_minor: number | null; partial_valued_inventory_minor: number;
    unvalued_sku_count: number;
    unvalued_fulfilled_orders_count?: number;
    supplier_liabilities_minor: number;
    approved_credit_exposure_minor: number; warning: string;
  };
};
const naira = (minor: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(minor / 100);
const tile = "rounded-xl border border-slate-200 bg-white p-5 space-y-3";
const metric = "text-xl font-semibold text-slate-900";
export default function IntelligencePage() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await apiGet<Report>("/api/v1/admin/finance/intelligence", { auth: true })); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load Finance Intelligence"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <main className="mx-auto max-w-6xl space-y-5 p-5">
    <header>
      <Link href="/admin/finance" className="text-sm text-cyan-700 underline">Back to Finance</Link>
      <h1 className="mt-2 text-2xl font-semibold">Finance Intelligence</h1>
      <p className="text-sm text-slate-600">Cross-business operational facts, not a bank balance or audited accounting report.</p>
    </header>
    {loading && <p>Loading operational finance signals…</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}
    {data && <>
      <p className="text-xs text-slate-500">Snapshot generated {new Date(data.as_of).toLocaleString()}</p>
      {data.degraded_domains && data.degraded_domains.length > 0 && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Partial snapshot: {data.degraded_domains.join(", ")} service summary was temporarily unavailable.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <section className={tile}>
          <h2 className="font-semibold">Payments and Paystack</h2>
          {data.payments.successful_checkout_groups.map((p, i) => <div key={i} className="flex justify-between gap-3 text-sm">
            <span>{p.method} / {p.provider} · {p.confirmed_count} successful</span>
            <span>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(p.gross_ngn))}</span>
          </div>)}
          <p className="text-sm">Posted settlements: <strong>{data.payments.posted_paystack_settlements.count}</strong> · Net: {naira(data.payments.posted_paystack_settlements.net_minor)}</p>
          <p className="text-sm">PSP fees in posted settlements: {naira(data.payments.posted_paystack_settlements.fees_minor)}</p>
          <p className="text-sm">Settlement batches not yet posted: {data.payments.unposted_paystack_settlement_batches}</p>
          <p className="text-xs text-amber-800">{data.payments.warning}</p>
        </section>
        <section className={tile}>
          <h2 className="font-semibold">Academy obligations</h2>
          <p className={metric}>{data.academy.active_enrollments} active enrollments</p>
          {(data.academy.dropout_pending_enrollments ?? 0) > 0 && (
            <p className="text-sm text-amber-800">Dropout-pending (recoverable): <strong>{data.academy.dropout_pending_enrollments}</strong></p>
          )}
          <p className="text-sm">Reviewed plans: {data.academy.reviewed_class_plans}; missing plans: {data.academy.enrollments_without_class_plan}</p>
          <p className="text-sm">Outstanding prepaid lessons (reviewed plans): <strong>{data.academy.remaining_prepaid_classes_with_reviewed_plans}</strong></p>
          <p className="text-sm">Pending/missed instalments (active &amp; recoverable): {naira(data.academy.pending_or_missed_installments_minor)}</p>
          <p className="text-xs text-amber-800">{data.academy.warning}</p>
        </section>
        <section className={tile}>
          <h2 className="font-semibold">Club</h2>
          <p className={metric}>{data.club.currently_active_enrollments} current enrollments</p>
          <p className="text-sm">Upcoming service costs: {data.club.future_service_costs_minor == null ? "Not yet modelled" : naira(data.club.future_service_costs_minor)}</p>
          <p className="text-xs text-amber-800">{data.club.warning}</p>
        </section>
        <section className={tile}>
          <h2 className="font-semibold">Store, purchasing and receivables</h2>
          <p className="text-sm">Inventory at verified cost: <strong>{data.store.valued_inventory_minor == null ? "Incomplete" : naira(data.store.valued_inventory_minor)}</strong></p>
          <p className="text-sm">Partially valued stock: {naira(data.store.partial_valued_inventory_minor)} · {data.store.unvalued_sku_count} unvalued SKUs</p>
          {(data.store.unvalued_fulfilled_orders_count ?? 0) > 0 && (
            <p className="text-sm text-amber-800">Fulfilled orders with unvalued legacy SKUs (awaiting opening valuation): <strong>{data.store.unvalued_fulfilled_orders_count}</strong></p>
          )}
          <p className="text-sm">Unsettled supplier invoices: {naira(data.store.supplier_liabilities_minor)}</p>
          <p className="text-sm">Approved customer-credit exposure: {naira(data.store.approved_credit_exposure_minor)}</p>
          {data.store.order_status_totals.map(o => <p className="text-xs text-slate-500" key={o.status}>{o.status}: {o.count} orders (face value ₦{o.gross_order_ngn})</p>)}
          <p className="text-xs text-amber-800">{data.store.warning}</p>
          <Link href="/admin/store/procurement" className="text-sm text-cyan-700 underline">Store Procurement workspace</Link>
        </section>
      </div>
    </>}
    <button onClick={() => void load()} disabled={loading} className="rounded-lg border px-4 py-2 text-sm">Refresh snapshot</button>
  </main>;
}
