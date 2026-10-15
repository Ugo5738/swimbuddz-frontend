"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Agreement = {
  id: string;
  agreed_session_fee_kobo: number;
  valid_from: string;
  valid_until: string;
  reason: string;
};

const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

export function ClubCommercialTerms({ enrollmentId, endsAt }: { enrollmentId: string; endsAt: string }) {
  const [rows, setRows] = useState<Agreement[]>([]);
  const [standard, setStandard] = useState("15000");
  const [agreed, setAgreed] = useState("10000");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const reload = async () => {
    const result = await apiGet<{adjustments: Agreement[]}>(`/api/v1/clubs/admin/enrollments/${enrollmentId}/commercial-terms`, {auth: true});
    setRows(result.adjustments);
  };
  useEffect(() => { void reload().catch((e: Error) => setError(e.message)); }, [enrollmentId]);

  const submit = async () => {
    setError("");
    const standardKobo = Math.round(Number(standard) * 100);
    const agreedKobo = Math.round(Number(agreed) * 100);
    if (!Number.isFinite(standardKobo) || !Number.isFinite(agreedKobo) || standardKobo <= 0 || agreedKobo < 0 || agreedKobo > standardKobo) {
      setError("Enter an agreed rate no higher than the regular Club rate.");
      return;
    }
    if (reason.trim().length < 20) {
      setError("Record why the agreed amount differs from the standard price (at least 20 characters).");
      return;
    }
    setBusy(true);
    try {
      const effectiveStart = new Date(Date.now() + 60_000).toISOString();
      await apiPost(
        `/api/v1/clubs/admin/enrollments/${enrollmentId}/commercial-terms`,
        {
          adjustment_id: crypto.randomUUID(),
          standard_session_fee_kobo: standardKobo,
          agreed_session_fee_kobo: agreedKobo,
          valid_from: effectiveStart,
          valid_until: endsAt,
          reason: reason.trim(),
        },
        { auth: true },
      );
      await reload();
      setOpen(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve commercial terms");
    } finally {
      setBusy(false);
    }
  };

  return <section className="space-y-3 rounded-xl border border-slate-200 p-4">
    <h3 className="font-semibold text-slate-900">Approved swim pricing</h3>
    <p className="text-sm text-slate-600">The public Club rate stays unchanged. Only future regular practices on this pay-per-swim enrollment use approved terms; paid add-ons retain their full fee.</p>
    {rows.length > 0 ? <div className="space-y-2">
      {rows.map(row => <div key={row.id} className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-medium">{money(row.agreed_session_fee_kobo)} per regular practice</p>
        <p className="text-slate-600">Until {new Date(row.valid_until).toLocaleDateString("en-NG")} · {row.reason}</p>
      </div>)}
    </div> : <p className="text-sm text-slate-600">No approved rate amendments. Regular Club prices apply.</p>}
    {!open ? <Button variant="outline" onClick={() => setOpen(true)}>Approve temporary rate</Button> :
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <Input label="Normal VI session price (₦)" inputMode="decimal" value={standard} onChange={e => setStandard(e.target.value)} />
        <Input label="Agreed session price (₦)" inputMode="decimal" value={agreed} onChange={e => setAgreed(e.target.value)} />
        <p className="text-sm text-slate-600">Effective shortly after approval until enrollment expires on {new Date(endsAt).toLocaleDateString("en-NG")}. Future already-quoted bookings are not repriced.</p>
        <label className="block text-sm">Reason for approval
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Original rate communicated before the new Club pricing was finalised"
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex gap-2"><Button disabled={busy} onClick={submit}>{busy ? "Saving…" : "Approve rate"}</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button></div>
      </div>}
    {!open && error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
  </section>;
}
