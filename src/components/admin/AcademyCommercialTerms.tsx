"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAcademyApi, type AcademyCommercialTermsPreview } from "@/lib/academy-admin";

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;
const koboFromInput = (value: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const parsed = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export function AcademyCommercialTerms({ enrollmentId, onChanged }: {
  enrollmentId: string;
  onChanged: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<AcademyCommercialTermsPreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [future, setFuture] = useState<Record<string, string>>({});
  const [historicDiscount, setHistoricDiscount] = useState("0");
  const [agreedCash, setAgreedCash] = useState("");
  const [reason, setReason] = useState("");
  const [adjustmentId, setAdjustmentId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminAcademyApi.previewAcademyCommercialTerms(enrollmentId);
      setPreview(data);
      setFuture(Object.fromEntries(data.installments
        .filter((item) => item.status === "pending" || item.status === "missed")
        .map((item) => [item.id, String(item.amount_kobo / 100)])));
      setAgreedCash(String((data.price_snapshot_kobo || 0) / 100));
      setAdjustmentId(crypto.randomUUID());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review tuition terms.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { void load(); }, [load]);

  const paid = preview?.installments.filter((i) => i.status === "paid") || [];
  const unpaid = preview?.installments.filter((i) => i.status === "pending" || i.status === "missed") || [];
  const pendingAmounts = unpaid.map((i) => koboFromInput(future[i.id] || ""));
  const discount = koboFromInput(historicDiscount);
  const agreed = koboFromInput(agreedCash);
  const nominal = paid.reduce((sum, i) => sum + i.amount_kobo, 0) +
    pendingAmounts.reduce<number>((sum, i) => sum + (i || 0), 0);
  const valid = !!preview && paid.length > 0 && unpaid.length > 0 &&
    pendingAmounts.every((a) => a !== null && a > 0) &&
    discount !== null && agreed !== null && discount <= nominal &&
    nominal <= preview.price_snapshot_kobo &&
    nominal - discount === agreed &&
    paid.reduce((sum, i) => sum + i.amount_kobo, 0) - discount === preview.verified_cash_kobo &&
    reason.trim().length >= 20;

  async function approve() {
    if (!preview || !valid || !adjustmentId) return;
    if (!window.confirm(`Apply negotiated terms? Paid installments and their original receipts remain unchanged. Future balance: ${naira(pendingAmounts.reduce<number>((s, n) => s + (n || 0), 0))}.`)) return;
    setSaving(true); setError("");
    try {
      await AdminAcademyApi.approveAcademyCommercialTerms(enrollmentId, {
        adjustment_id: adjustmentId,
        reason: reason.trim(),
        expected_price_snapshot_kobo: preview.price_snapshot_kobo,
        expected_installments: preview.installments,
        unpaid_installment_amounts_kobo: pendingAmounts as number[],
        historic_discount_kobo: discount!,
        agreed_cash_total_kobo: agreed!,
      });
      await load();
      await onChanged();
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment rejected; refresh and reconcile payments.");
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Negotiated tuition terms</h2>
          <p className="text-sm text-slate-600">Modify future installments, not a settled payment or cohort price.</p>
        </div>
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Close review" : "Review terms"}
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">Checking payment records…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {preview && (
        <div className="text-sm text-slate-700">
          Verified cash / internal credit: <strong>{naira(preview.verified_cash_kobo)}</strong>
          <span className="mx-2">·</span>
          Current nominal tuition: <strong>{naira(preview.price_snapshot_kobo)}</strong>
        </div>
      )}
      {expanded && preview && (
        <div className="space-y-4 border-t pt-4">
          {preview.installments.map((item) => {
            const locked = item.status === "paid" || item.status === "waived";
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div><strong>Installment #{item.number}</strong> <span className="text-slate-500">· {item.status}</span>
                  {locked && <p className="text-xs text-slate-500">Historical amount {naira(item.amount_kobo)} — locked</p>}
                </div>
                {locked ? <strong>{naira(item.amount_kobo)}</strong> : (
                  <label>New amount (₦)
                    <input className="ml-2 w-32 rounded-md border px-2 py-2" inputMode="decimal"
                      value={future[item.id] || ""}
                      onChange={(e) => setFuture((v) => ({ ...v, [item.id]: e.target.value }))} />
                  </label>
                )}
              </div>
            );
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Already applied historical coupon (₦)
              <input className="mt-1 block w-full rounded-md border px-3 py-2" inputMode="decimal"
                value={historicDiscount} onChange={(e) => setHistoricDiscount(e.target.value)} />
            </label>
            <label className="text-sm">Agreed total CASH tuition (₦)
              <input className="mt-1 block w-full rounded-md border px-3 py-2" inputMode="decimal"
                value={agreedCash} onChange={(e) => setAgreedCash(e.target.value)} />
            </label>
          </div>
          <p className="text-sm text-slate-700">
            New nominal obligations: <strong>{naira(nominal)}</strong> · Historical coupon: <strong>{naira(discount || 0)}</strong>
            {" "}· Net cash agreed: <strong>{naira(nominal - (discount || 0))}</strong>
          </p>
          <label className="block text-sm">Admin approval reason
            <textarea className="mt-1 block w-full rounded-md border p-3" rows={3} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Document the approved negotiation and agreement evidence (minimum 20 characters)" />
          </label>
          {preview.adjustments.length > 0 && (
            <details className="text-xs text-slate-600"><summary>Previous adjustments ({preview.adjustments.length})</summary>
              {preview.adjustments.map((item) => <p key={item.id} className="py-1">{item.created_at} — {item.reason}</p>)}
            </details>
          )}
          <button type="button" disabled={!valid || saving} onClick={() => void approve()}
            className="rounded-md bg-cyan-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Applying…" : "Approve future-only adjustment"}
          </button>
          {!valid && <p className="text-xs text-amber-800">All amounts must reconcile with verified cash, the historical discount and the agreed total. An explanation is required.</p>}
        </div>
      )}
    </section>
  );
}
