"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AcademyApi } from "@/lib/academy";

type Journey = Awaited<ReturnType<typeof AcademyApi.getMyAcademyJourneys>>[number];
type Cohort = Awaited<ReturnType<typeof AcademyApi.getEnrollableCohorts>>[number];

export default function ManageAcademyPage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof AcademyApi.getMyEnrollmentChangeRequests>>>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function reload() {
    const [j, c, r] = await Promise.all([
      AcademyApi.getMyAcademyJourneys(),
      AcademyApi.getEnrollableCohorts(),
      AcademyApi.getMyEnrollmentChangeRequests(),
    ]);
    setJourneys(j);
    setCohorts(c);
    setRequests(r);
  }
  useEffect(() => {
    reload().catch(() => setError("Could not load Academy enrollments."));
  }, []);

  async function switchCohort(enrollmentId: string) {
    const target = selection[enrollmentId];
    if (!target) return;
    if (!window.confirm("Request this cohort change? Existing payment records will never be erased.")) return;
    setBusy(enrollmentId);
    setError("");
    setMessage("");
    try {
      const result = await AcademyApi.changeMyCohort(enrollmentId, target);
      setMessage(result.message);
      await reload();
      if (result.state === "completed" && result.enrollment_id) {
        router.push(`/account/academy/enrollments/${result.enrollment_id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change cohort.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <Link href="/account/academy" className="text-sm text-cyan-700">← My Academy</Link>
        <h1 className="mt-2 text-2xl font-semibold">Manage Academy</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your programme history stays intact when you change cohorts. Payments and
          transfer proofs may require a review before the move is completed.
        </p>
      </div>
      {message && <div role="status" className="rounded-md bg-cyan-50 p-4 text-cyan-900">{message}</div>}
      {error && <div role="alert" className="rounded-md bg-red-50 p-4 text-red-900">{error}</div>}
      {journeys.length === 0 && <p className="text-slate-600">No Academy history yet.</p>}
      {journeys.map((journey) => (
        <section key={journey.program_id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">{journey.program_name}</h2>
          <p className="mt-1 text-xs text-slate-500">Your cohort and enrollment history</p>
          <div className="mt-4 space-y-4">
            {journey.enrollments.map((enrollment) => {
              const pending = requests.find((r) => r.from_enrollment_id === enrollment.id && r.state === "needs_review");
              const mostRecent = requests.find((r) => r.from_enrollment_id === enrollment.id);
              const canRequest = !pending && ["pending_approval", "waitlist", "enrolled"].includes(enrollment.status);
              const available = cohorts.filter((c) => c.program_id === journey.program_id && c.id !== enrollment.cohort_id);
              return (
                <div key={enrollment.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{enrollment.cohort_name || "Cohort not yet selected"}</p>
                      <p className="text-sm text-slate-500">
                        {enrollment.status.replaceAll("_", " ")} · Payment {enrollment.payment_status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Link className="text-sm text-cyan-700 underline" href={`/account/academy/enrollments/${enrollment.id}`}>View details</Link>
                  </div>
                  {pending && (
                    <p role="status" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Cohort change pending admin review. Your current enrollment and payment history remain unchanged.
                    </p>
                  )}
                  {!pending && mostRecent?.state === "rejected" && (
                    <p role="status" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Your previous cohort change request was declined. Your original enrollment remains unchanged; you can request a different cohort.
                    </p>
                  )}
                  {canRequest && available.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <label htmlFor={`target-${enrollment.id}`} className="block text-sm font-medium">Change cohort</label>
                      <select id={`target-${enrollment.id}`}
                        className="w-full rounded-md border border-slate-300 p-2"
                        value={selection[enrollment.id] || ""}
                        onChange={(e) => setSelection((old) => ({...old, [enrollment.id]: e.target.value}))}>
                        <option value="">Choose another cohort</option>
                        {available.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.location_name || "Location TBD"} · {c.price_override != null ? `₦${c.price_override.toLocaleString("en-NG")}` : "Price confirmed at checkout"}</option>)}
                      </select>
                      <p className="text-xs text-slate-500">Published price is shown before any personal discount or credited transfer. Final payment terms are confirmed separately.</p>
                      <button disabled={!selection[enrollment.id] || busy !== null}
                        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        onClick={() => switchCohort(enrollment.id)}>
                        {busy === enrollment.id ? "Checking enrollment…" : "Request cohort change"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
