"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type WalkInMember = {
  id: string; first_name: string; last_name: string; email: string;
  fee_amount_kobo?: number | null;
};
type Member = WalkInMember;

export type GuestWalkInInput = {
  full_name: string;
  email?: string;
  phone?: string;
  fee_amount_kobo?: number;
  fee_override_reason?: string;
  payment_status?: "unknown" | "unpaid";
  notes?: string;
};

export function RecordSessionWalkIn({
  sessionId,
  defaultFee,
  defaultGuestFee,
  disabled,
  onRecord,
  onRecordGuest,
  eligibleMembers,
  mode: controlledMode,
  embedded = false,
}: {
  sessionId: string;
  defaultFee: number;
  defaultGuestFee: number;
  disabled: boolean;
  onRecord: (memberId: string, feeKobo: number, note: string, overrideReason?: string) => Promise<void>;
  onRecordGuest: (input: GuestWalkInInput) => Promise<void>;
  eligibleMembers?: WalkInMember[];
  mode?: "member" | "guest";
  embedded?: boolean;
}) {
  const [localMode, setMode] = useState<"member" | "guest">("member");
  const mode = controlledMode ?? localMode;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [fee, setFee] = useState(defaultFee);
  const [note, setNote] = useState("");
  const [feeOverrideReason, setFeeOverrideReason] = useState("");
  type Admission = { allowed: boolean; reason: string; fee_amount_kobo: number; access_source: string | null; pricing_audience: string | null };
  const admission = useApi<Admission>(selected && mode === "member" ? `/api/v1/sessions/${sessionId}/admin/member-admission/${selected.id}` : null);
  const quotedFee = admission.data?.fee_amount_kobo ?? null;
  const quotedNaira = quotedFee === null ? null : quotedFee / 100;
  const isOverride = quotedNaira !== null && Math.round(fee * 100) !== quotedFee;
  useEffect(() => {
    if (admission.data?.allowed && quotedNaira !== null) {
      setFee(quotedNaira);
      setFeeOverrideReason("");
    }
  }, [admission.data, quotedNaira]);


  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestFee, setGuestFee] = useState(defaultGuestFee);
  const [guestFeeReason, setGuestFeeReason] = useState("");
  const [guestPaymentStatus, setGuestPaymentStatus] =
    useState<"unknown" | "unpaid">("unknown");
  const [guestNote, setGuestNote] = useState("");

  const remote = useApi<Member[]>(
    query && eligibleMembers === undefined
      ? `/api/v1/members/?search=${encodeURIComponent(query)}&limit=20` : null
  );
  const data = eligibleMembers === undefined ? remote.data : eligibleMembers.filter((member) =>
    `${member.first_name} ${member.last_name} ${member.email}`.toLowerCase().includes(query.toLowerCase())
  );
  const loading = eligibleMembers === undefined && remote.loading;
  const error = eligibleMembers === undefined ? remote.error : null;

  const guestFeeChanged = Math.round(guestFee * 100) !== Math.round(defaultGuestFee * 100);

  return (
    <details open={embedded ? true : undefined} className={embedded ? "print:hidden" : "rounded-xl border border-slate-200 bg-white p-4 print:hidden"}>
      {!embedded && <summary className="cursor-pointer font-medium">Add walk-in</summary>}
      <p className="my-3 text-sm text-slate-600">
        Record someone who actually attended without an advance booking. Existing members keep
        their member history; unregistered guests get a guest walk-in record without inventing an
        account, booking, payment or waiver.
      </p>

      {controlledMode === undefined && <div className="mb-4 flex gap-2" role="group" aria-label="Walk-in type">
        <Button
          type="button"
          size="sm"
          variant={mode === "member" ? "primary" : "outline"}
          onClick={() => setMode("member")}
        >
          Existing member
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "guest" ? "primary" : "outline"}
          onClick={() => setMode("guest")}
        >
          Guest / not registered
        </Button>
      </div>}

      {mode === "member" ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              selected && admission.data?.allowed && !admission.loading &&
              (!isOverride || feeOverrideReason.trim().length >= 10) &&
              confirm(
                `Record ${selected.first_name} as present in the selected session, with a session fee of ₦${fee.toLocaleString()}? No payment will be collected by this action.`
              )
            ) {
              void onRecord(selected.id, Math.round(fee * 100), note, isOverride ? feeOverrideReason.trim() : undefined);
            }
          }}
        >
          {eligibleMembers !== undefined && <p className="text-sm text-slate-600">
            Only members with Club access for this swim are listed. Academy enrollment alone does not grant Club access.
          </p>}
          <div className="flex items-end gap-2">
            <Input
              label="Find member by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading || search.trim().length < 2}
              onClick={() => {
                setQuery(search.trim());
                setSelected(null);
              }}
            >
              Search members
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {loading && <p>Searching…</p>}
          {!loading && !error && query && query === search.trim() && data && (
            <select
              aria-label="Member to record"
              required
              value={selected?.id ?? ""}
              onChange={(e) => {
                const member = data.find((item) => item.id === e.target.value) ?? null;
                setSelected(member);
                setFee(member?.fee_amount_kobo != null ? member.fee_amount_kobo / 100 : defaultFee);
                setFeeOverrideReason("");
              }}
              className="w-full rounded border p-2"
            >
              <option value="">{data.length ? "Select the member" : "No matching members"}</option>
              {data.map((member) => (
                <option key={member.id} value={member.id}>
                  {`${member.first_name} ${member.last_name}`.trim()} — {member.email}
                </option>
              ))}
            </select>
          )}
          {admission.loading && selected && <p role="status" className="text-sm text-slate-600">Checking member eligibility and rate…</p>}
          {admission.error && <p role="alert" className="text-sm text-red-700">Could not verify membership: {String(admission.error)}</p>}
          {admission.data && <div role="status" className={`rounded-lg p-3 text-sm ${admission.data.allowed ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
            <strong>{admission.data.allowed ? "Eligible" : "Not eligible"}</strong> · {admission.data.reason}.
            {admission.data.allowed && <> Standard session fee: ₦{(admission.data.fee_amount_kobo / 100).toLocaleString("en-NG")}. <button type="button" className="font-semibold underline" onClick={() => setFee(admission.data!.fee_amount_kobo / 100)}>Use standard rate</button></>}
          </div>}
          <Input
            label="Session fee owed for this swim (₦)"
            type="number"
            min={0}
            step="0.01"
            required
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
          {isOverride && <Input label="Reason for agreed fee override (10+ characters)" value={feeOverrideReason} onChange={(event) => setFeeOverrideReason(event.target.value)} required maxLength={500} />}
          <Input
            label="Attendance reconciliation note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            maxLength={500}
          />
          <Button type="submit" disabled={disabled || !selected || !note.trim() || admission.loading || !admission.data?.allowed || (isOverride && feeOverrideReason.trim().length < 10)}>
            Record member walk-in
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onRecordGuest({
              full_name: guestName.trim(),
              ...(guestEmail.trim() ? { email: guestEmail.trim() } : {}),
              ...(guestPhone.trim() ? { phone: guestPhone.trim() } : {}),
              fee_amount_kobo: Math.round(guestFee * 100),
              ...(guestFeeChanged && guestFeeReason.trim()
                ? { fee_override_reason: guestFeeReason.trim() }
                : {}),
              ...(guestFee > 0 ? { payment_status: guestPaymentStatus } : {}),
              ...(guestNote.trim() ? { notes: guestNote.trim() } : {}),
            }).then(() => {
              setGuestName("");
              setGuestEmail("");
              setGuestPhone("");
              setGuestFee(defaultGuestFee);
              setGuestFeeReason("");
              setGuestPaymentStatus("unknown");
              setGuestNote("");
            });
          }}
        >
          <Input
            label="Guest name"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Phone (recommended)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>
          <Input
            label="Guest rate for this swim (₦)"
            type="number"
            min={0}
            step="0.01"
            required
            value={guestFee}
            onChange={(e) => setGuestFee(Number(e.target.value))}
            hint="Defaults to the configured guest rate and is snapshotted on this walk-in."
          />
          {guestFeeChanged && (
            <Input
              label="Reason for price override"
              required
              value={guestFeeReason}
              onChange={(e) => setGuestFeeReason(e.target.value)}
              maxLength={500}
            />
          )}
          {guestFee > 0 ? (
            <label className="block text-sm">
              Payment status
              <select
                value={guestPaymentStatus}
                onChange={(e) => setGuestPaymentStatus(e.target.value as "unknown" | "unpaid")}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="unknown">Needs reconciliation</option>
                <option value="unpaid">Payment outstanding</option>
              </select>
            </label>
          ) : (
            <p className="text-xs text-slate-600">
              This walk-in has no amount due. The backend records the rate as included.
            </p>
          )}
          <Input
            label="Attendance note (optional)"
            value={guestNote}
            onChange={(e) => setGuestNote(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-amber-700">
            Safety waiver is recorded as missing. This form does not accept a waiver on the
            guest&apos;s behalf.
          </p>
          <Button
            type="submit"
            disabled={
              disabled ||
              guestName.trim().length < 2 ||
              (guestFeeChanged && !guestFeeReason.trim())
            }
          >
            Record guest walk-in
          </Button>
        </form>
      )}
    </details>
  );
}
