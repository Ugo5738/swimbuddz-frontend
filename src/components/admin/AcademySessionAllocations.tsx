"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
type Preview = {
  suggested_purchased_classes: number | null;
  suggested_previously_consumed: number;
  suggested_opening_as_of: string;
  purchased_source: string | null;
  recorded_regular_attendances: number;
  recorded_unexcused_absences?: number;
  applied_prepaid_allocations: number;
  ordinary_sessions_reviewed: number;
  unverified_sessions: Array<{ session_id: string; status: string }>;
  pending_prepaid_session_ids: string[];
  warning: string;
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
  standardFeeNaira,
  memberNames,
  onRecorded,
  embedded = false,
}: {
  enrollments: Enrollment[];
  sessionId: string;
  standardFeeNaira: number | null;
  memberNames: Record<string, string>;
  onRecorded: () => void;
  embedded?: boolean;
}) {
  // Reuse the same enrollment data as the visible Academy roster.
  // Separate requests previously allowed the two panels to disagree on students.
  const eligibleEnrollments = useMemo(
    () => enrollments.filter((row) => row.status === "enrolled"),
    [enrollments]
  );
  const [enrollmentId, setEnrollmentId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [kind, setKind] = useState<"prepaid" | "paid_extra">("prepaid");
  const [amount, setAmount] = useState(() => standardFeeNaira != null && standardFeeNaira > 0 ? String(standardFeeNaira) : "");
  const [overrideReason, setOverrideReason] = useState("");
  const standardKobo = standardFeeNaira == null ? null : Math.round(standardFeeNaira * 100);
  const agreedKobo = amount.trim() === "" ? null : Math.round(Number(amount) * 100);
  const priceChanged = kind === "paid_extra" && standardKobo != null && agreedKobo != null && agreedKobo !== standardKobo;
  const priceDelta = priceChanged && agreedKobo != null && standardKobo != null ? agreedKobo - standardKobo : 0;
  const formatNaira = (value: number) => "₦" + value.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const reasonInvalid = reasonTouched && reason.trim().length < 10;
  const [purchased, setPurchased] = useState("");
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
    setPreview(null);
    setPreviewError("");
    setError("");
    apiGet<Summary>(
      `/api/v1/academy/admin/enrollments/${enrollmentId}/class-entitlements`,
      { auth: true }
    )
      .then((data) => {
        if (!active) return;
        setSummary(data);
        if (!data.configured) {
          apiGet<Preview>(
            `/api/v1/academy/admin/enrollments/${enrollmentId}/class-entitlements/preview?session_id=${sessionId}`,
            { auth: true }
          ).then((result) => {
            if (!active) return;
            setPreview(result);
            setPurchased(result.suggested_purchased_classes?.toString() ?? "");
            setConsumed(result.suggested_previously_consumed.toString());
            const date = new Date(result.suggested_opening_as_of);
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            setBaselineCutoff(local.toISOString().slice(0, 16));
            setBaselineReason(
              `Reviewed cohort attendance: ${result.recorded_regular_attendances} regular present/late; ${result.recorded_unexcused_absences ?? 0} unexcused absences; ${result.applied_prepaid_allocations} applied prepaid allocations. Verified against original purchase agreement and historical attendance before cutoff.`
            );
          }).catch(() => {
            if (active) setPreviewError("Historical attendance could not be loaded. Verify all figures manually before saving.");
          });
        }
      })
      .catch(() => { if (active) setError("Unable to load student's class balance."); });
    return () => { active = false; };
  }, [enrollmentId, message, sessionId]);

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
    if (!selected || !summary || (kind === "prepaid" && !summary.configured)) return;
    setReasonTouched(true);
    if (kind === "paid_extra" && (standardKobo == null || standardKobo <= 0)) {
      setError("The session has no valid standard booking price. Set one before recording a paid extra.");
      return;
    }
    if (priceChanged && overrideReason.trim().length < 10) {
      setError("Explain the price override in at least 10 characters.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("");
      reasonRef.current?.focus();
      return;
    }
    const agreedNaira = kind === "paid_extra" ? Number(amount) : 0;
    if ((kind === "paid_extra" && (amount.trim() === "" || agreedNaira <= 0)) ||
        !Number.isFinite(agreedNaira)) {
      setError("Enter the agreed positive extra-class price.");
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
          ...(kind === "paid_extra" ? {
            expected_standard_fee_kobo: standardKobo,
            override_reason: priceChanged ? overrideReason.trim() : null,
          } : {}),
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
    <section id="academy-student-allocation" className={embedded ? "space-y-3" : "space-y-3 rounded-xl border border-cyan-200 bg-white p-4 print:hidden"}>
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
      {selected && summary && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            How this student is attending
            <select value={kind} onChange={(e) => {
              setKind(e.target.value as "prepaid" | "paid_extra");
              setAmount(standardFeeNaira != null && standardFeeNaira > 0 ? String(standardFeeNaira) : "");
              setOverrideReason("");
            }}
              className="mt-1 w-full rounded border p-2">
              <option value="prepaid">Use one purchased Academy class — ₦0 extra</option>
              <option value="paid_extra">Separately paid extra class — no prepaid deduction</option>
            </select>
          </label>
        </div>
      )}
      {selected && summary && !summary.configured && kind === "prepaid" && (
        <div className="space-y-2 rounded border border-amber-300 p-3">
          <p className="text-sm font-semibold">Review suggested historical class balance</p>
          {preview && (
            <p className="text-xs text-slate-700" role="status">
              Found {preview.recorded_regular_attendances} confirmed regular attendances, {preview.recorded_unexcused_absences ?? 0} unexcused absences and {preview.applied_prepaid_allocations} applied prepaid allocations.
              {preview.unverified_sessions.length > 0 && ` ${preview.unverified_sessions.length} session(s) need attendance review.`}
              {preview.pending_prepaid_session_ids.length > 0 && ` ${preview.pending_prepaid_session_ids.length} pending prepaid allocations need review.`}
              The suggested purchased quantity comes from programme duration, not a verified purchase agreement.
            </p>
          )}
          {previewError && <p role="alert" className="text-xs text-amber-700">{previewError}</p>}
          <p className="text-xs text-slate-600">
            Confirm suggested values against original class agreement and attendance history before saving. Count present, late and unexcused absent classes as used. Excused or cancelled classes use no credit. Review the attendance records, excluding separately
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
      {selected && summary && (
        <div className="space-y-3">
          {summary.configured && <p className="text-sm text-slate-800">
            Purchased: <strong>{summary.purchased_classes}</strong> ·
            Previously used: <strong>{summary.opening_consumed}</strong> ·
            Individually allocated: <strong>{summary.applied_prepaid}</strong> ·
            Regular classes used: <strong>{summary.routine_attendance_consumed ?? 0}</strong> ·
            Reserved: <strong>{summary.reserved_prepaid}</strong> ·
            Remaining: <strong>{summary.remaining}</strong>
          </p>}
          {summary.configured && <p className="text-xs text-slate-600">
            Present, late and unexcused absent classes use one credit. Excused or cancelled classes use none.
          </p>}
          {summary.balance_verified === false && (
            <p role="alert" className="text-sm text-amber-800">
              Attendance has not been verified for {summary.unverified_routine_session_ids?.length ?? 0} routine class(es).
              Resolve these attendance records before consuming another prepaid class.
            </p>
          )}
          {!summary.configured && <p className="text-sm text-amber-700">Paid extras can be booked now. To use an included programme class, review and save the opening balance above.</p>}
          {kind === "paid_extra" && (
            <div className="space-y-2">
              <p className="text-sm" data-testid="academy-standard-price">
                Standard session price: <strong>{standardKobo != null && standardKobo > 0 ? formatNaira(standardKobo / 100) : "Not configured"}</strong>
              </p>
              <label className="block text-sm">
                Agreed additional price in naira (₦)
                <input type="number" min="0.01" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded border p-2" />
              </label>
              {priceChanged && (
                <div className="space-y-2 rounded border border-amber-400 p-3" role="status">
                  <p className="text-sm">
                    Standard price: {formatNaira(standardKobo! / 100)} → Agreed price: {formatNaira(agreedKobo! / 100)}
                    {" "}({formatNaira(Math.abs(priceDelta) / 100)} {priceDelta < 0 ? "reduction" : "increase"})
                  </p>
                  <label className="block text-sm">
                    Reason for price override (required)
                    <textarea value={overrideReason} minLength={10} required
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="mt-1 w-full rounded border p-2" />
                  </label>
                </div>
              )}
            </div>
          )}
          <label className="block text-sm">
            Reason / agreement (required)
            <textarea ref={reasonRef} value={reason} required minLength={10}
              aria-invalid={reasonInvalid}
              aria-describedby="academy-participation-reason-help"
              onBlur={() => setReasonTouched(true)}
              onChange={(e) => setReason(e.target.value)}
              className={`mt-1 w-full rounded border p-2 ${reasonInvalid ? "border-rose-500" : ""}`} />
          </label>
          <p id="academy-participation-reason-help"
            role={reasonInvalid ? "alert" : undefined}
            className={`text-xs ${reasonInvalid ? "text-rose-700" : "text-slate-600"}`}>
            {reasonInvalid
              ? "Enter a reason or agreement of at least 10 characters before recording participation."
              : "Required: at least 10 characters explaining the class agreement."}
          </p>
          <button type="button" disabled={busy || (kind === "prepaid" && (!summary.configured || summary.balance_verified === false))}
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
