"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { AcademyApi } from "@/lib/academy";
import { AdminAcademyApi, type AcademySharedReceipt } from "@/lib/academy-admin";

type Enrollment = Awaited<ReturnType<typeof AcademyApi.listAllEnrollments>>[number];

const money = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", {
  maximumFractionDigits: 2, minimumFractionDigits: 0,
})}`;

export default function AcademySharedReceiptsPage() {
  const [bankReference, setBankReference] = useState("");
  const [receivedNaira, setReceivedNaira] = useState("");
  const [evidence, setEvidence] = useState("");
  const [receipt, setReceipt] = useState<AcademySharedReceipt | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedEnrollment, setSelectedEnrollment] = useState("");
  const [allocationNaira, setAllocationNaira] = useState("");
  const [oldPaymentReference, setOldPaymentReference] = useState("");
  const [oldPaymentReviewNote, setOldPaymentReviewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    AcademyApi.listAllEnrollments()
      .then(async (items) => {
        setEnrollments(items);
        const ids = [...new Set(items.map((item) => item.member_id).filter(Boolean))];
        const results = await Promise.all(ids.map(async (id) => {
          try {
            const member = await apiGet<{
              first_name?: string; last_name?: string; email?: string;
            }>(`/api/v1/members/${id}`, { auth: true });
            return [id, [member.first_name, member.last_name].filter(Boolean).join(" ")
              || member.email || "Swimmer"] as const;
          } catch {
            return [id, "Swimmer"] as const;
          }
        }));
        setNames(Object.fromEntries(results));
      })
      .catch(() => setError("Enrollment options are temporarily unavailable."));
  }, []);

  async function register() {
    const amount = Math.round(Number(receivedNaira) * 100);
    if (!bankReference.trim() || !Number.isSafeInteger(amount) || amount <= 0 || evidence.trim().length < 20) {
      setError("Provide the verified bank reference, exact NGN amount and bank confirmation notes (20 characters minimum).");
      return;
    }
    if (!window.confirm("Have you verified this exact payment against the bank statement? This creates ONE income record, not separate payments for each learner.")) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const result = await AdminAcademyApi.verifyAcademyReceipt({
        external_reference: bankReference.trim(),
        amount_kobo: amount,
        verification_note: evidence.trim(),
      });
      setReceipt(result);
      setMessage("Verified receipt recorded. You can allocate the total across the intended learners below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the verified receipt.");
    } finally { setLoading(false); }
  }

  async function allocate() {
    if (!receipt || !selectedEnrollment) return;
    const amount = Math.round(Number(allocationNaira) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > receipt.unallocated_kobo) {
      setError("Allocation must be greater than zero and cannot exceed the remaining receipt balance.");
      return;
    }
    setLoading(true); setError(""); setMessage("");
    try {
      const updated = await AdminAcademyApi.allocateAcademyReceipt(receipt.id, {
        enrollment_id: selectedEnrollment,
        amount_kobo: amount,
        idempotency_key: `academy:${receipt.id}:${selectedEnrollment}:${amount}`,
      });
      setReceipt(updated);
      setMessage("Allocation reserved. Select Apply to credit this learner's Academy balance.");
      setAllocationNaira("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation could not be reserved.");
    } finally { setLoading(false); }
  }

  async function apply(allocationId: string) {
    if (!receipt) return;
    setLoading(true); setError(""); setMessage("");
    try {
      await AdminAcademyApi.applyAcademyReceiptAllocation(receipt.id, allocationId);
      const updated = await AdminAcademyApi.getAcademyReceipt(receipt.id);
      setReceipt(updated);
      setMessage("This amount has been applied once to the learner's Academy balance.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm Academy credit. Retry Apply; do not register another receipt.");
    } finally { setLoading(false); }
  }

  async function linkOldCheckout() {
    if (!receipt) return;
    if (oldPaymentReference.trim().length < 3 || oldPaymentReviewNote.trim().length < 20) {
      setError("Enter the old checkout reference and a reconciliation explanation of at least 20 characters.");
      return;
    }
    if (!window.confirm(
      "Confirm this old individual checkout is represented by an APPLIED allocation of the verified shared receipt. Its existing proof stays on record and will no longer be individually collected."
    )) return;
    setLoading(true); setError(""); setMessage("");
    try {
      await AdminAcademyApi.reconcileLegacyAcademyAttempt(receipt.id, {
        payment_reference: oldPaymentReference.trim(),
        review_note: oldPaymentReviewNote.trim(),
      });
      setMessage("Original checkout linked to the verified shared receipt. Its proof remains available in payment history.");
      setOldPaymentReference("");
      setOldPaymentReviewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reconcile this checkout.");
    } finally { setLoading(false); }
  }

  const eligible = enrollments.filter((enrollment) =>
    ["pending_approval", "enrolled"].includes(String(enrollment.status))
  );
  const labelFor = (enrollmentId: string) => {
    const item = enrollments.find((entry) => entry.id === enrollmentId);
    return item
      ? `${names[item.member_id] || "Swimmer"} — ${item.cohort?.name || item.program?.name || "Academy"}`
      : "Enrollment details unavailable";
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div>
        <Link href="/admin/academy/enrollment-changes" className="text-sm text-cyan-700">← Academy Transfers</Link>
        <h1 className="mt-2 text-2xl font-bold">Shared Academy bank receipts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Register a single verified bank receipt and allocate it across swimmers.
          Each bank reference is recorded once. Allocations are tuition credits, not duplicate cash receipts.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-cyan-50 p-4 text-sm text-cyan-800">{message}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold">1. Verify one bank receipt</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Bank transaction reference
            <input value={bankReference} onChange={(e) => setBankReference(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2" placeholder="Reference on bank statement" />
          </label>
          <label className="text-sm">Total received (NGN)
            <input inputMode="decimal" value={receivedNaira}
              onChange={(e) => setReceivedNaira(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2" placeholder="100000" />
          </label>
        </div>
        <label className="block text-sm">Bank verification evidence
          <textarea rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            placeholder="Statement date, transaction ID, verified amount and reviewer reference" />
        </label>
        <p className="text-xs text-amber-700">
          Do not re-register an existing PAID payment under a new receipt.
          If a payment reference has already been settled, reconcile that payment rather than creating a second cash-in.
        </p>
        <button disabled={loading} onClick={register}
          className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "Working…" : "Verify and record receipt"}
        </button>
      </section>
      {receipt && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold">2. Allocate verified receipt</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-slate-500">Received</p><p className="font-semibold">{money(receipt.amount_kobo)}</p></div>
            <div><p className="text-slate-500">Allocated</p><p className="font-semibold">{money(receipt.allocated_kobo)}</p></div>
            <div><p className="text-slate-500">Unallocated</p><p className="font-semibold">{money(receipt.unallocated_kobo)}</p></div>
          </div>
          <p className="text-xs text-slate-500">Verified reference: {receipt.external_reference}</p>
          {receipt.unallocated_kobo > 0 && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <label className="block text-sm">Beneficiary and Academy cohort
                <select value={selectedEnrollment} onChange={(e) => setSelectedEnrollment(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2">
                  <option value="">Choose swimmer and enrollment</option>
                  {eligible.map((item) => (
                    <option key={item.id} value={item.id}>{labelFor(item.id)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">Allocate (NGN)
                <input inputMode="decimal" value={allocationNaira}
                  onChange={(e) => setAllocationNaira(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2"
                  placeholder="50000" />
              </label>
              <button onClick={allocate} disabled={loading || !selectedEnrollment}
                className="rounded-md border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-800 disabled:opacity-50">
                Reserve beneficiary allocation
              </button>
            </div>
          )}
          <h3 className="font-medium">Allocation history</h3>
          {receipt.allocations.length === 0 && <p className="text-sm text-slate-600">No allocations yet.</p>}
          <div className="space-y-2">
            {receipt.allocations.map((allocation) => (
              <div key={allocation.id} className="flex flex-wrap justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="text-sm">
                  <p className="font-medium">{labelFor(allocation.enrollment_id)}</p>
                  <p className="text-slate-500">{money(allocation.amount_kobo)} · {allocation.state}</p>
                </div>
                {allocation.state === "reserved" && (
                  <button disabled={loading} onClick={() => apply(allocation.id)}
                    className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    Apply to Academy balance
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <h3 className="font-semibold text-sm">3. Reconcile the old individual checkout or POP</h3>
            <p className="text-xs text-amber-900">
              After an allocation has been applied, link the learner's outdated individual
              payment attempt to this one verified bank receipt. This preserves uploaded
              proof and stops a separate payment attempt from being mistaken for a second deposit.
            </p>
            <label className="block text-sm">Original checkout/payment reference
              <input value={oldPaymentReference}
                onChange={(e) => setOldPaymentReference(e.target.value)}
                className="mt-1 w-full rounded-md border border-amber-300 p-2"
                placeholder="PAY-..." />
            </label>
            <label className="block text-sm">Reconciliation note
              <textarea rows={2} value={oldPaymentReviewNote}
                onChange={(e) => setOldPaymentReviewNote(e.target.value)}
                className="mt-1 w-full rounded-md border border-amber-300 p-2"
                placeholder="Bank proof matches the verified shared deposit and learner's applied allocation" />
            </label>
            <button type="button" disabled={loading || !receipt.allocations.some((a) => a.state === "applied")}
              onClick={linkOldCheckout}
              className="rounded-md border border-amber-700 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50">
              Link old checkout to shared receipt
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
