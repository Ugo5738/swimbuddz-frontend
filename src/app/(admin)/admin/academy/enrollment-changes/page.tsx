"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import {
  AdminAcademyApi,
  type AcademyEnrollmentChangeReview,
} from "@/lib/academy-admin";

const formatNaira = (kobo?: number | null) =>
  kobo == null ? "Not recorded" : `₦${(kobo / 100).toLocaleString("en-NG")}`;

export default function AcademyEnrollmentChangeReviewsPage() {
  const [reviews, setReviews] = useState<AcademyEnrollmentChangeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [closureForms, setClosureForms] = useState<Record<string, { evidence: string; note: string; expanded: boolean }>>({});
  const [approvalReasons, setApprovalReasons] = useState<Record<string, string>>({});

  function updateClosure(reference: string, patch: Partial<{ evidence: string; note: string; expanded: boolean }>) {
    setClosureForms((current) => ({
      ...current,
      [reference]: {
        evidence: current[reference]?.evidence || "",
        note: current[reference]?.note || "",
        expanded: current[reference]?.expanded || false,
        ...patch,
      },
    }));
  }

  async function loadReviews() {
    const data = await AdminAcademyApi.listEnrollmentChangeReviews();
    setReviews(data);
    const members = [...new Set(data.map((item) => item.member_id).filter((id): id is string => !!id))];
    const names = await Promise.all(members.map(async (id) => {
      try {
        const member = await apiGet<{ first_name?: string; last_name?: string; email?: string }>(
          `/api/v1/members/${id}`, { auth: true }
        );
        return [id, [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "Member"] as const;
      } catch {
        return [id, "Member (details unavailable)"] as const;
      }
    }));
    setMemberNames(Object.fromEntries(names));
  }

  useEffect(() => {
    loadReviews()
      .catch(() => setError("Could not load pending Academy transfer reviews."))
      .finally(() => setLoading(false));
  }, []);

  async function rejectRequest(id: string) {
    if (!window.confirm("Reject this request? The member's enrollment and payments will remain unchanged.")) return;
    setWorking(id);
    setError("");
    try {
      await AdminAcademyApi.rejectEnrollmentChange(id);
      await loadReviews();
    } catch {
      setError("Could not reject this request. Please retry.");
    } finally {
      setWorking(null);
    }
  }

  async function closeUnpaid(reference: string) {
    const { evidence = "", note = "" } = closureForms[reference] || {};
    if (evidence.trim().length < 10 || note.trim().length < 10) {
      setError("Provide bank/provider closure evidence and an explanation (at least 10 characters each).");
      return;
    }
    if (!window.confirm(`Close ${reference} as unpaid? You must already have verified no transfer was received.`)) return;
    setWorking(reference);
    setError("");
    try {
      const preview = await AdminAcademyApi.previewCheckoutAttempt(reference);
      if (preview.payment.status === "paid" || preview.payment.status === "pending_review") {
        throw new Error("This payment is paid or has proof awaiting review. Reconcile it instead.");
      }
      await AdminAcademyApi.closeUnpaidCheckoutAttempt(reference, {
        preview_token: preview.preview_token,
        provider_closure_evidence: evidence.trim(),
        note: note.trim(),
        apply: true,
      });
      await loadReviews();
      window.alert("Payment attempt closed with an audit trail. Complete the remaining attempts before approving the cohort change.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close checkout.");
    } finally {
      setWorking(null);
    }
  }

  async function approveUnpaid(changeId: string) {
    const reason = approvalReasons[changeId] || "";
    if (reason.trim().length < 10) {
      setError("Enter an approval reason of at least 10 characters.");
      return;
    }
    if (!window.confirm("The backend will block this unless every previous attempt is certified closed-unpaid, with no paid installments or progress. Continue?")) return;
    setWorking(changeId);
    setError("");
    try {
      await AdminAcademyApi.approveUnpaidEnrollmentChange(changeId, reason.trim());
      await loadReviews();
      window.alert("Cohort moved. The member can review their new enrollment.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve transfer.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link href="/admin/academy" className="text-sm text-cyan-700">← Academy</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Cohort Change Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review change requests with payment activity or recorded progress.
          Approve only verified-unpaid transfers here. Requests involving received money, receipts or attendance must be reconciled separately.
        </p>
      </header>
      {loading && <p className="text-sm text-slate-600">Loading transfer requests…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && reviews.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No cohort changes awaiting review.</p>
      )}
      <div className="space-y-4">
        {reviews.map((review) => (
          <section key={review.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{review.member_id ? memberNames[review.member_id] || "Academy member" : "Academy member"} · Cohort change</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Needs review</span>
            </div>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div><span className="text-slate-500">Current cohort</span><p className="font-medium">{review.original_cohort_name || "Cohort details unavailable"}</p></div>
              <div><span className="text-slate-500">Requested cohort</span><p className="font-medium">{review.target_cohort_name || "Cohort details unavailable"}</p></div>
              <div><span className="text-slate-500">Original tuition snapshot</span><p className="font-semibold">{formatNaira(review.snapshot.old_price_kobo)}</p></div>
              <div><span className="text-slate-500">New cohort base tuition</span><p className="font-semibold">{formatNaira(review.snapshot.target_base_price_kobo)}</p></div>
            </div>
            <p className="text-sm text-slate-600">
              Payment attempts: {review.snapshot.payment_references?.length || 0} · {review.snapshot.payment_statuses?.join(", ") || "No statuses"}
            </p>
            <p className="text-xs text-amber-800">
              Do not mark this transfer complete until deposits, payment proofs, discounts and old payment attempts have been reconciled.
              A shared receipt must never be counted twice.
            </p>
            <Link href={`/admin/academy/enrollments/${review.from_enrollment_id}`}
              className="inline-block text-sm font-medium text-cyan-700 underline">View enrollment details</Link>
            <div className="space-y-3">
              {(review.snapshot.payment_references || []).map((reference, index) => (
                <div key={reference} className="rounded-lg border border-slate-200 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Payment attempt {index + 1}</p>
                      <p className="text-xs text-slate-500">
                        Status at request: {review.snapshot.payment_statuses?.[index]?.replaceAll("_", " ") || "Unknown"}
                      </p>
                    </div>
                    <button type="button" disabled={working !== null}
                      onClick={() => updateClosure(reference, { expanded: !closureForms[reference]?.expanded })}
                      className="rounded-md border border-amber-300 px-3 py-2 text-sm text-amber-800 disabled:opacity-50">
                      {closureForms[reference]?.expanded ? "Close form" : "Review as unpaid"}
                    </button>
                  </div>
                  {closureForms[reference]?.expanded && (
                    <div className="space-y-3">
                      <p className="text-sm text-red-700">
                        Only use this if the bank or payment provider has confirmed this attempt received no money. Never close a verified payment or uploaded proof.
                      </p>
                      <label className="block text-sm">
                        Provider/bank closure evidence
                        <textarea value={closureForms[reference]?.evidence || ""}
                          onChange={(event) => updateClosure(reference, { evidence: event.target.value })}
                          rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-2"
                          placeholder="Bank confirmation, failed transaction reference or provider response" />
                      </label>
                      <label className="block text-sm">
                        Review note
                        <textarea value={closureForms[reference]?.note || ""}
                          onChange={(event) => updateClosure(reference, { note: event.target.value })}
                          rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-2"
                          placeholder="Reason this payment attempt is safe to close" />
                      </label>
                      <button type="button" disabled={working !== null}
                        onClick={() => closeUnpaid(reference)}
                        className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                        {working === reference ? "Verifying…" : "Confirm closure as unpaid"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="rounded-lg border border-cyan-200 p-3 space-y-2">
                <p className="text-sm font-semibold">Finalize a verified-unpaid cohort change</p>
                <p className="text-xs text-slate-600">
                  The backend requires all existing checkout attempts to be formally closed, with no received money, paid installments or attendance. Otherwise approval is refused.
                </p>
                <label className="block text-sm">
                  Approval reason
                  <textarea value={approvalReasons[review.id] || ""}
                    onChange={(event) => setApprovalReasons((current) => ({ ...current, [review.id]: event.target.value }))}
                    rows={2} className="mt-1 w-full rounded-md border border-slate-300 p-2"
                    placeholder="Reason for approving this unpaid cohort correction" />
                </label>
                <button type="button" onClick={() => approveUnpaid(review.id)}
                  disabled={working !== null}
                  className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {working === review.id ? "Reviewing…" : "Approve verified-unpaid transfer"}
                </button>
              </div>
            </div>
            <button type="button" onClick={() => rejectRequest(review.id)}
              disabled={working !== null}
              className="ml-4 rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50">
              {working === review.id ? "Rejecting…" : "Reject request"}
            </button>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Technical references</summary>
              <p>Enrollment: {review.from_enrollment_id}</p>
              <p>Destination cohort: {review.target_cohort_id}</p>
              <p>Payment references: {review.snapshot.payment_references?.join(", ") || "None"}</p>
            </details>
          </section>
        ))}
      </div>
    </main>
  );
}
