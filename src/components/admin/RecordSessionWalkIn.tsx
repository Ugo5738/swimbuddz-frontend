"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Member = { id: string; first_name: string; last_name: string; email: string };

export type GuestWalkInInput = {
  full_name: string;
  email?: string;
  phone?: string;
  fee_amount_kobo?: number;
  fee_override_reason?: string;
  payment_status: "unreconciled" | "pending" | "not_due";
  notes?: string;
};

export function RecordSessionWalkIn({
  defaultFee,
  defaultGuestFee,
  disabled,
  onRecord,
  onRecordGuest,
}: {
  defaultFee: number;
  defaultGuestFee: number;
  disabled: boolean;
  onRecord: (memberId: string, feeKobo: number, note: string) => Promise<void>;
  onRecordGuest: (input: GuestWalkInInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<"member" | "guest">("member");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [fee, setFee] = useState(defaultFee);
  const [note, setNote] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestFee, setGuestFee] = useState(defaultGuestFee);
  const [guestFeeReason, setGuestFeeReason] = useState("");
  const [guestPaymentStatus, setGuestPaymentStatus] =
    useState<GuestWalkInInput["payment_status"]>("unreconciled");
  const [guestNote, setGuestNote] = useState("");

  const { data, loading, error } = useApi<Member[]>(
    query ? `/api/v1/members/?search=${encodeURIComponent(query)}&limit=20` : null
  );

  const guestFeeChanged = Math.round(guestFee * 100) !== Math.round(defaultGuestFee * 100);

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 print:hidden">
      <summary className="cursor-pointer font-medium">Add walk-in</summary>
      <p className="my-3 text-sm text-slate-600">
        Record someone who actually attended without an advance booking. Existing members keep
        their member history; unregistered guests get a guest walk-in record without inventing an
        account, booking, payment or waiver.
      </p>

      <div className="mb-4 flex gap-2" role="group" aria-label="Walk-in type">
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
      </div>

      {mode === "member" ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              selected &&
              confirm(
                `Record ${selected.first_name} as present in the selected session, with a session fee of ₦${fee.toLocaleString()}? No payment will be collected by this action.`
              )
            ) {
              void onRecord(selected.id, Math.round(fee * 100), note);
            }
          }}
        >
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
          {!loading && !error && query === search.trim() && data && (
            <select
              aria-label="Member to record"
              required
              value={selected?.id ?? ""}
              onChange={(e) => setSelected(data.find((member) => member.id === e.target.value) ?? null)}
              className="w-full rounded border p-2"
            >
              <option value="">{data.length ? "Select the member" : "No matching members"}</option>
              {data.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} — {member.email}
                </option>
              ))}
            </select>
          )}
          <Input
            label="Session fee owed for this swim (₦)"
            type="number"
            min={0}
            step="0.01"
            required
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
          <Input
            label="Attendance reconciliation note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            maxLength={500}
          />
          <Button type="submit" disabled={disabled || !selected || !note.trim()}>
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
              payment_status: guestPaymentStatus,
              ...(guestNote.trim() ? { notes: guestNote.trim() } : {}),
            }).then(() => {
              setGuestName("");
              setGuestEmail("");
              setGuestPhone("");
              setGuestFee(defaultGuestFee);
              setGuestFeeReason("");
              setGuestPaymentStatus("unreconciled");
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
          <label className="block text-sm">
            Payment status
            <select
              value={guestPaymentStatus}
              onChange={(e) =>
                setGuestPaymentStatus(e.target.value as GuestWalkInInput["payment_status"])
              }
              className="mt-1 w-full rounded border p-2"
            >
              <option value="unreconciled">Needs reconciliation</option>
              <option value="pending">Payment pending</option>
              <option value="not_due">No payment due</option>
            </select>
          </label>
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
