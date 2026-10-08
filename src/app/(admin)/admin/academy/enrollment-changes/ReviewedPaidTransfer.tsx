"use client";

import { useState } from "react";
import {
  AdminAcademyApi,
  type ReviewedAcademyFinancePreview,
} from "@/lib/academy-admin";

const toNaira = (kobo: number) => (kobo / 100).toLocaleString("en-NG", {
  maximumFractionDigits: 2,
});
const toKobo = (input: string) => Math.round(Number(input || "0") * 100);

export function ReviewedPaidTransfer({
  changeId,
  onCompleted,
}: {
  changeId: string;
  onCompleted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ReviewedAcademyFinancePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transferNaira, setTransferNaira] = useState("");
  const [consumedNaira, setConsumedNaira] = useState("0");
  const [discountNaira, setDiscountNaira] = useState("0");
  const [discountReason, setDiscountReason] = useState("");
  const [reason, setReason] = useState("");
  const [attendanceReviewed, setAttendanceReviewed] = useState(false);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const result = await AdminAcademyApi.previewReviewedAcademyTransfer(changeId);
      setPreview(result);
      setTransferNaira(String(
        Math.min(result.verified_total_kobo, result.destination_base_tuition_kobo) / 100
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify original payments.");
    } finally { setLoading(false); }
  }

  async function approve() {
    if (!preview) return;
    const transfer = toKobo(transferNaira);
    const used = toKobo(consumedNaira);
    const discount = toKobo(discountNaira);
    if ([transfer, used, discount].some((value) => !Number.isSafeInteger(value) || value < 0)) {
      setError("Enter non-negative whole-kobo amounts."); return;
    }
    if (transfer + used !== preview.verified_total_kobo) {
      setError("Tuition credit plus verified consumed services must equal the verified balance. Resolve any refund or surplus before approval.");
      return;
    }
    if (transfer > preview.destination_base_tuition_kobo - discount) {
      setError("Transfer credit exceeds discounted destination tuition. Resolve any refundable surplus first.");
      return;
    }
    if (reason.trim().length < 20 || (discount > 0 && discountReason.trim().length < 10)) {
      setError("Enter a detailed approval reason, and explain any manually approved discount.");
      return;
    }
    if (preview.recorded_progress_count > 0 && !attendanceReviewed) {
      setError("Review attendance and milestone evidence before approving an attended transfer.");
      return;
    }
    if (!window.confirm(
      "Approve this financially reconciled cohort transfer? The old enrollment and payment history will remain, while verified tuition credit moves to the new cohort."
    )) return;
    setLoading(true); setError("");
    try {
      await AdminAcademyApi.approveReviewedAcademyTransfer(changeId, {
        reason: reason.trim(),
        transferable_credit_kobo: transfer,
        consumed_services_kobo: used,
        discount_kobo: discount,
        discount_reason: discount ? discountReason.trim() : undefined,
        confirmed_attendance_review: attendanceReviewed,
      });
      await onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finance approval could not be completed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-cyan-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Reviewed paid or attended transfer</p>
          <p className="text-xs text-slate-600">Use only verified tuition credits, payment records, and reviewed attendance.</p>
        </div>
        <button type="button" onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }} className="rounded-md border border-cyan-700 px-3 py-2 text-sm text-cyan-800">
          {open ? "Hide review" : "Review paid transfer"}
        </button>
      </div>
      {open && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-600">Verifying financial records…</p>}
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {preview && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <div><span className="text-slate-500">Verified tuition</span><p className="font-semibold">₦{toNaira(preview.verified_total_kobo)}</p></div>
                <div><span className="text-slate-500">Approved receipt credits</span><p className="font-semibold">₦{toNaira(preview.verified_allocation_credit_kobo)}</p></div>
                <div><span className="text-slate-500">Destination base price</span><p className="font-semibold">₦{toNaira(preview.destination_base_tuition_kobo)}</p></div>
              </div>
              {preview.blocked_payment_references.length > 0 && (
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  {preview.blocked_payment_references.length} payment attempt(s) still require reconciliation. Resolve those before transferring.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Tuition credit to new cohort (NGN)
                  <input inputMode="decimal" value={transferNaira} onChange={(e) => setTransferNaira(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2" />
                </label>
                <label className="text-sm">Value of classes/services already consumed (NGN)
                  <input inputMode="decimal" value={consumedNaira} onChange={(e) => setConsumedNaira(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2" />
                </label>
                <label className="text-sm">New-cohort discount (NGN)
                  <input inputMode="decimal" value={discountNaira} onChange={(e) => setDiscountNaira(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2" />
                </label>
                <label className="text-sm">Reason for discount
                  <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2"
                    placeholder="Only if carrying an approved discount" />
                </label>
              </div>
              <p className="text-sm text-slate-700">
                Expected new tuition balance: <strong>₦{toNaira(Math.max(0, preview.destination_base_tuition_kobo - toKobo(discountNaira) - toKobo(transferNaira)))}</strong>
              </p>
              <label className="block text-sm">Reason and financial reconciliation evidence
                <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2"
                  placeholder="Verified payment references, reviewed attendance, and reason for transferring the unused balance" />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={attendanceReviewed}
                  onChange={(e) => setAttendanceReviewed(e.target.checked)} />
                <span>I reviewed existing classes, milestones and videos. Attendance stays with the original cohort; approved milestone evidence is preserved for the new cohort.</span>
              </label>
              <button type="button" onClick={approve} disabled={loading || !preview.eligible}
                className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Approve reviewed cohort transfer
              </button>
            </>
          )}
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="text-sm text-cyan-700 underline">Refresh verified balances</button>
        </div>
      )}
    </div>
  );
}
