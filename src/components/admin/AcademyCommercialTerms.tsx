"use client";

import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { AdminAcademyApi, type AcademyCommercialTermsPreview } from "@/lib/academy-admin";
import { useEffect, useState } from "react";

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
  const { data, loading, error: loadError, refetch } = useApi<AcademyCommercialTermsPreview>(
    `/api/v1/academy/admin/enrollments/${enrollmentId}/commercial-terms`,
  );
  const preview = data?.enrollment_id === enrollmentId ? data : null;
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [future, setFuture] = useState<Record<string, string>>({});
  const [historicDiscount, setHistoricDiscount] = useState("0");
  const [agreedCash, setAgreedCash] = useState("");
  const [reason, setReason] = useState("");
  const [adjustmentId, setAdjustmentId] = useState("");
  const [billingMode, setBillingMode] = useState<"full" | "installments">("installments");

  useEffect(() => {
    if (!preview) return;
    const rows = preview.installments.length ? preview.installments :
      (preview.suggested_installments || []).map((item) => ({
        ...item, id: `new-${item.number}`, status: "pending", reference: null,
      }));
    setFuture(Object.fromEntries(rows
      .filter((item) => item.status === "pending" || item.status === "missed")
      .map((item) => [item.id, String(item.amount_kobo / 100)])));
    const previousDiscount = Number(preview.adjustments[0]?.approved_terms.historic_discount_kobo || 0);
    setHistoricDiscount(String(previousDiscount / 100));
    setAgreedCash(String((preview.price_snapshot_kobo - previousDiscount) / 100));
    setBillingMode(rows.length ? "installments" : "full");
    setAdjustmentId(crypto.randomUUID());
    setReason("");
    setError("");
  }, [preview]);

  const existingPlan = !!preview?.installments.length;
  const rows = existingPlan ? preview!.installments :
    (preview?.suggested_installments || []).map((item) => ({
      ...item, id: `new-${item.number}`, status: "pending", reference: null,
    }));
  const paid = rows.filter((i) => i.status === "paid");
  const unpaid = rows.filter((i) => i.status === "pending" || i.status === "missed");
  const isFullPayment = !existingPlan && billingMode === "full";
  const agreed = koboFromInput(agreedCash);
  const pendingAmounts = isFullPayment ? [agreed] : unpaid.map((i) => koboFromInput(future[i.id] || ""));
  const discount = paid.length ? koboFromInput(historicDiscount) : 0;
  const nominalPaid = paid.reduce((sum, i) => sum + i.amount_kobo, 0);
  const nominal = nominalPaid + pendingAmounts.reduce<number>((sum, i) => sum + (i || 0), 0);
  const depositValid = paid.length > 0 || isFullPayment ||
    (pendingAmounts.length >= 2 && (pendingAmounts[0] || 0) * 3 >= nominal);
  const valid = !!preview && !loading && !loadError && pendingAmounts.length > 0 &&
    pendingAmounts.every((a) => a !== null && a > 0) && depositValid &&
    discount !== null && agreed !== null && agreed > 0 && discount <= nominalPaid &&
    nominal <= preview.price_snapshot_kobo && nominal - discount === agreed &&
    nominalPaid - discount === preview.verified_cash_kobo && reason.trim().length >= 20;

  async function approve() {
    if (!preview || !valid || !adjustmentId || saving) return;
    if (!window.confirm(`Save agreed tuition of ${naira(agreed!)}? Amount still to pay: ${naira(pendingAmounts.reduce<number>((s, n) => s + (n || 0), 0))}.`)) return;
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
        ...(!existingPlan ? { billing_mode: billingMode } : {}),
      });
      setExpanded(false);
      refetch();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the agreement. Refresh and review the payment records.");
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Negotiated tuition terms</h2>
          <p className="text-sm text-slate-600">
            {paid.length ? "Update the remaining payments for this learner." :
              "Set this learner’s agreed price before their first payment."}
          </p>
        </div>
        <Button type="button" variant="outline" disabled={loading || saving || !preview || !!loadError}
          aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Close review" : "Review terms"}
        </Button>
      </div>
      {loading && <p role="status" className="text-sm text-slate-500">Checking payment records…</p>}
      {(error || loadError) && <p role="alert" className="text-sm text-red-700">{error || loadError}</p>}
      {loadError && <Button type="button" variant="outline" onClick={refetch}>Try again</Button>}
      {preview && !loadError && (
        <div className="text-sm text-slate-700">
          Already paid / credited: <strong>{naira(preview.verified_cash_kobo)}</strong>
          <span className="mx-2">·</span>
          Current tuition: <strong>{naira(preview.price_snapshot_kobo)}</strong>
        </div>
      )}
      {expanded && preview && !loading && !loadError && (
        <div className="space-y-4 border-t pt-4">
          {!existingPlan && (
            <label className="block text-sm">Payment plan
              <select className="mt-1 block w-full rounded-md border p-3" value={billingMode}
                onChange={(event) => setBillingMode(event.target.value as "full" | "installments")}>
                <option value="full">Pay in full</option>
                {preview.can_create_installments && rows.length > 0 && <option value="installments">Pay in installments</option>}
              </select>
            </label>
          )}
          {!isFullPayment && rows.map((item) => {
            const locked = item.status === "paid" || item.status === "waived";
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div><strong>Installment #{item.number}</strong> <span className="text-slate-500">· {item.status}</span>
                  {locked && <p className="text-xs text-slate-500">Previously settled — amount preserved</p>}
                </div>
                {locked ? <strong>{naira(item.amount_kobo)}</strong> : (
                  <label>Amount (₦)
                    <input aria-label={`Installment ${item.number} amount (₦)`}
                      className="ml-2 w-32 rounded-md border px-2 py-2" inputMode="decimal"
                      value={future[item.id] || ""}
                      onChange={(e) => setFuture((v) => ({ ...v, [item.id]: e.target.value }))} />
                  </label>
                )}
              </div>
            );
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            {paid.length > 0 && <label className="text-sm">Already applied historical coupon (₦)
              <input className="mt-1 block w-full rounded-md border px-3 py-2" inputMode="decimal"
                value={historicDiscount} onChange={(e) => setHistoricDiscount(e.target.value)} />
            </label>}
            <label className="text-sm">Agreed total tuition (₦)
              <input className="mt-1 block w-full rounded-md border px-3 py-2" inputMode="decimal"
                value={agreedCash} onChange={(e) => setAgreedCash(e.target.value)} />
            </label>
          </div>
          <p className="text-sm text-slate-700">
            Scheduled tuition: <strong>{naira(nominal)}</strong>
            {paid.length > 0 && <> · Historical coupon: <strong>{naira(discount || 0)}</strong></>}
            {" "}· Agreed tuition to pay: <strong>{naira(nominal - (discount || 0))}</strong>
          </p>
          {!depositValid && <p className="text-sm text-amber-800">The first installment must cover at least one-third of the agreed tuition.</p>}
          <label className="block text-sm">Admin approval reason
            <textarea className="mt-1 block w-full rounded-md border p-3" rows={3} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Record the agreed price and payment arrangement (minimum 20 characters)" />
          </label>
          {preview.adjustments.length > 0 && (
            <details className="text-xs text-slate-600"><summary>Previous agreements ({preview.adjustments.length})</summary>
              {preview.adjustments.map((item) => <p key={item.id} className="py-1">{item.created_at} — {item.reason}</p>)}
            </details>
          )}
          <Button type="button" disabled={!valid || saving} onClick={() => void approve()}>
            {saving ? "Saving…" : paid.length ? "Approve future-only adjustment" : "Save agreed terms"}
          </Button>
          {!valid && <p className="text-xs text-amber-800">The payments must add up to the agreed tuition and match any existing payment history. Add an approval reason to save.</p>}
          {paid.length === 0 && <p className="text-sm text-slate-600">After saving, copy the learner’s payment link below. Checkout will show this agreement.</p>}
        </div>
      )}
    </section>
  );
}
