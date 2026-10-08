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

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link href="/admin/academy" className="text-sm text-cyan-700">← Academy</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Cohort Change Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review change requests with payment activity or recorded progress.
          These records are read-only until a financially reconciled approval workflow is available.
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
