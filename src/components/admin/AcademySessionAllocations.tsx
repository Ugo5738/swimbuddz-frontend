"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Enrollment = { id: string; member_id: string; status: string };
type Summary = {
  configured: boolean;
  purchased_classes?: number;
  opening_consumed?: number;
  applied_prepaid?: number;
  routine_attendance_consumed?: number;
  balance_verified?: boolean;
  unverified_routine_session_ids?: string[];
  reserved_prepaid?: number;
  remaining?: number;
  allocations?: Array<{
    session_id: string;
    kind: string;
    status: string;
    agreed_fee_kobo: number;
  }>;
};
type Recorded = {
  booking_id: string;
  kind: string;
  fee_amount_kobo: number;
  payment_status: string;
  entitlement_status: string;
};

export function AcademySessionAllocations({
  enrollments,
  sessionId,
  memberNames,
  onRecorded,
}: {
  enrollments: Enrollment[];
  sessionId: string;
  memberNames: Record<string, string>;
  onRecorded: () => void;
}) {
  // Reuse the same enrollment data as the visible Academy roster.
  // Separate requests previously allowed the two panels to disagree on students.
  const eligibleEnrollments = useMemo(
    () => enrollments.filter((row) => row.status === "enrolled"),
    [enrollments]
  );
  const [enrollmentId, setEnrollmentId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [kind, setKind] = useState<"prepaid" | "paid_extra">("prepaid");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [purchased, setPurchased] = useState("12");
  const [consumed, setConsumed] = useState("");
  const [baselineReason, setBaselineReason] = useState("");
  const [baselineCutoff, setBaselineCutoff] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(
    () => eligibleEnrollments.find((item) => item.id === enrollmentId),
    [eligibleEnrollments, enrollmentId]
  );

  useEffect(() => {
    if (!enrollmentId) {
      setSummary(null);
      return;
    }
    let active = true;
    setSummary(null);
    setError("");
    apiGet<Summary>(
      `/api/v1/academy/admin/enrollments/${enrollmentId}/class-entitlements`,
      { auth: true }
    )
      .then((data) => { if (active) setSummary(data); })
      .catch(() => { if (active) setError("Unable to load student's class balance."); });
    return () => { active = false; };
  }, [enrollmentId, message]);

  async function establishBaseline() {
    if (!enrollmentId || !summary || summary.configured) return;
    const purchasedClasses = Number(purchased);
    const previous = Number(consumed);
    if (!Number.isInteger(purchasedClasses) || purchasedClasses <= 0 ||
        consumed.trim() === "" || !Number.isInteger(previous) || previous < 0 ||
        previous > purchasedClasses || baselineReason.trim().length < 15 || !baselineCutoff) {
      setError("Enter the verified purchased and previously used class counts and a reason.");
      return;
    }
    if (!window.confirm("Confirm the historical class balance is verified. This cannot be reset.")) return;
    setBusy(true);
    setError("");
    try {
      await apiPost(
        `/api/v1/academy/admin/enrollments/${enrollmentId}/class-entitlements/baseline`,
        {
          purchased_classes: purchasedClasses,
          previously_consumed: previous,
          opening_as_of: new Date(baselineCutoff).toISOString(),
          reason: baselineReason.trim(),
        },
        { auth: true }
      );
      setMessage("Opening class balance saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the balance.");
    } finally {
      setBusy(false);
    }
  }

  async function allocate() {
    if (!selected || !summary?.configured) return;
    const agreedNaira = kind === "paid_extra" ? Number(amount) : 0;
    if ((kind === "paid_extra" && (amount.trim() === "" || agreedNaira <= 0)) ||
        !Number.isFinite(agreedNaira) || reason.trim().length < 10) {
      setError("Enter the agreed positive extra-class price and a clear reason.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPost<Recorded>(
        `/api/v1/sessions/${sessionId}/admin/academy-participation`,
        {
          member_id: selected.member_id,
          enrollment_id: selected.id,
          kind,
          agreed_fee_kobo: Math.round(agreedNaira * 100),
          reason: reason.trim(),
        },
        { auth: true }
      );
      setMessage(
        `Recorded ${result.kind} participation; ${result.payment_status}. Booking ${result.booking_id}.`
      );
      onRecorded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record Academy participation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="academy-student-allocation" className="space-y-3 rounded-xl border border-cyan-200 bg-white p-4 print:hidden">
      <h2 className="font-semibold text-slate-900">Academy · student class allocation</h2>
      <p className="text-sm text-slate-600">
        One shared physical session; classify each student independently.
        Attendance does not mean an additional payment was received.
      </p>
      {eligibleEnrollments.length === 0 && (
        <p role="status" className="text-sm text-amber-700">
          No active cohort enrollments were loaded. Verify the selected session and its cohort before recording attendance.
        </p>
      )}
      <label className="block text-sm font-medium">
        Student
        <select
          value={enrollmentId}
          onChange={(e) => { setEnrollmentId(e.target.value); setMessage(""); }}
          className="mt-1 w-full rounded border p-2"
        >
          <option value="">Select enrolled student</option>
          {eligibleEnrollments.map((item) => (
            <option key={item.id} value={item.id}>
              {memberNames[item.member_id] || item.member_id}
            </option>
          ))}
        </select>
      </label>
      {selected && summary && !summary.configured && (
        <div className="space-y-2 rounded border border-amber-300 p-3">
          <p className="text-sm font-semibold">Verify historical class balance first</p>
          <p className="text-xs text-slate-600">
            Count previously consumed classes from real attendance records, excluding separately
            paid extras and authorised support. Include older cohorts only under a reviewed
            transfer agreement. Do not guess or reset an existing plan.
          </p>
          <label className="block text-sm">
            Purchased Academy classes
            <input type="number" min={1} value={purchased}
              onChange={(e) => setPurchased(e.target.value)}
              className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm">
            Previously consumed prepaid classes
            <input type="number" min={0} value={consumed}
              onChange={(e) => setConsumed(e.target.value)}
              className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm">
            Historical cutoff — classes before this point are counted in the opening balance
            <input type="datetime-local" value={baselineCutoff}
              onChange={(e) => setBaselineCutoff(e.target.value)}
              className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm">
            Source and cutoff for verified baseline
            <textarea value={baselineReason}
              onChange={(e) => setBaselineReason(e.target.value)}
              className="mt-1 w-full rounded border p-2" />
          </label>
          <button type="button" disabled={busy} onClick={() => void establishBaseline()}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Save verified opening balance
          </button>
        </div>
      )}
      {selected && summary?.configured && (
        <div className="space-y-3">
          <p className="text-sm text-slate-800">
            Purchased: <strong>{summary.purchased_classes}</strong> ·
            Previously used: <strong>{summary.opening_consumed}</strong> ·
            Individually allocated: <strong>{summary.applied_prepaid}</strong> ·
            Regular attended classes: <strong>{summary.routine_attendance_consumed ?? 0}</strong> ·
            Reserved: <strong>{summary.reserved_prepaid}</strong> ·
            Remaining: <strong>{summary.remaining}</strong>
          </p>
          {summary.balance_verified === false && (
            <p role="alert" className="text-sm text-amber-800">
              Attendance has not been verified for {summary.unverified_routine_session_ids?.length ?? 0} routine class(es).
              Resolve these attendance records before consuming another prepaid class.
            </p>
          )}
          <label className="block text-sm font-medium">
            How this student is attending
            <select value={kind} onChange={(e) => setKind(e.target.value as "prepaid" | "paid_extra")}
              className="mt-1 w-full rounded border p-2">
              <option value="prepaid">Use one purchased Academy class — ₦0 extra</option>
              <option value="paid_extra">Separately paid extra class — no prepaid deduction</option>
            </select>
          </label>
          {kind === "paid_extra" && (
            <label className="block text-sm">
              Agreed additional price in naira (₦)
              <input type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded border p-2" />
            </label>
          )}
          <label className="block text-sm">
            Reason / agreement
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2" />
          </label>
          <button type="button" disabled={busy || !summary.configured || (kind === "prepaid" && summary.balance_verified === false)}
            onClick={() => void allocate()}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Record student participation
          </button>
          {summary.allocations?.filter((item) => item.session_id === sessionId).map((item) => (
            <p className="text-xs text-slate-600" key={item.session_id}>
              Existing allocation: {item.kind} · {item.status} ·
              ₦{(item.agreed_fee_kobo / 100).toLocaleString("en-NG")}
            </p>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
