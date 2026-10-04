"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Member = { id: string; first_name: string; last_name: string; email: string };

type GuestWalkInInput = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  fee_amount_kobo?: number;
  payment_status: "unpaid" | "paid" | "waived" | "included" | "unknown";
  payment_method?: string | null;
  payment_reference?: string | null;
  waiver_status: "accepted" | "missing" | "not_required" | "unknown";
  notes?: string | null;
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
  const [kind, setKind] = useState<"member" | "guest">("member");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [fee, setFee] = useState(defaultFee);
  const [note, setNote] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestFee, setGuestFee] = useState(defaultGuestFee);
  const [guestPaymentStatus, setGuestPaymentStatus] = useState<
    "unpaid" | "paid" | "waived" | "included" | "unknown"
  >(defaultGuestFee === 0 ? "included" : "unpaid");
  const [guestPaymentMethod, setGuestPaymentMethod] = useState("");
  const [guestPaymentReference, setGuestPaymentReference] = useState("");
  const [guestWaiverStatus, setGuestWaiverStatus] = useState<
    "accepted" | "missing" | "not_required" | "unknown"
  >("missing");
  const [guestNote, setGuestNote] = useState("");

  const { data, loading, error } = useApi<Member[]>(
    query ? `/api/v1/members/?search=${encodeURIComponent(query)}&limit=20` : null
  );

  const switchKind = (next: "member" | "guest") => {
    setKind(next);
    setFee(defaultFee);
    setGuestFee(defaultGuestFee);
    setGuestPaymentStatus(defaultGuestFee === 0 ? "included" : "unpaid");
  };

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 print:hidden">
      <summary className="cursor-pointer font-medium">Add walk-in</summary>
      <p className="my-3 text-sm text-slate-600">
        Record someone who physically attended without an advance booking. Attendance and payment
        are recorded as separate facts.
      </p>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Walk-in type">
        <Button
          type="button"
          size="sm"
          variant={kind === "member" ? "primary" : "secondary"}
          onClick={() => switchKind("member")}
        >
          Existing member
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "guest" ? "primary" : "secondary"}
          onClick={() => switchKind("guest")}
        >
          Guest / not registered
        </Button>
      </div>

      {kind === "member" ? (
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
              variant="secondary"
              disabled={loading || search.trim().length < 2}
              onClick={() => {
                setQuery(search.trim());
                setSelected(null);
              }}
            >
              Search members
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {loading && <p>Searching…</p>}
          {!loading && !error && query === search.trim() && data && (
            <select
              aria-label="Member to record"
              required
              value={selected?.id ?? ""}
              onChange={(e) =>
                setSelected(data.find((member) => member.id === e.target.value) ?? null)
              }
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
            hint="Use the amount agreed for that swim. Existing bookings keep their saved amount."
          />
          <Input
            label="Attendance reconciliation note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            maxLength={500}
            hint="Explain why this attendance is being recorded now."
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
            if (!guestName.trim()) return;
            if (
              confirm(
                `Record ${guestName.trim()} as a walk-in guest at ₦${guestFee.toLocaleString()}? This does not create a member account or falsely mark a waiver as accepted.`
              )
            ) {
              void onRecordGuest({
                full_name: guestName.trim(),
                email: guestEmail.trim() || null,
                phone: guestPhone.trim() || null,
                fee_amount_kobo: Math.round(guestFee * 100),
                payment_status: guestPaymentStatus,
                payment_method: guestPaymentMethod.trim() || null,
                payment_reference: guestPaymentReference.trim() || null,
                waiver_status: guestWaiverStatus,
                notes: guestNote.trim() || null,
              });
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              maxLength={160}
            />
            <Input
              label="Phone (recommended)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              maxLength={32}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              maxLength={320}
            />
            <Input
              label="Guest rate for this swim (₦)"
              type="number"
              min={0}
              step="0.01"
              value={guestFee}
              onChange={(e) => setGuestFee(Number(e.target.value))}
              required
            />
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Payment status</span>
            <select
              value={guestPaymentStatus}
              onChange={(e) =>
                setGuestPaymentStatus(
                  e.target.value as "unpaid" | "paid" | "waived" | "included" | "unknown"
                )
              }
              className="mt-1 w-full rounded border p-2"
            >
              <option value="unpaid">Unpaid / collect later</option>
              <option value="paid">Already paid</option>
              <option value="waived">Waived</option>
              <option value="included">Included / free</option>
              <option value="unknown">Unknown — reconcile later</option>
            </select>
          </label>

          {guestPaymentStatus === "paid" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Payment method"
                value={guestPaymentMethod}
                onChange={(e) => setGuestPaymentMethod(e.target.value)}
                placeholder="bank_transfer, cash, card"
                maxLength={32}
              />
              <Input
                label="Payment reference (optional)"
                value={guestPaymentReference}
                onChange={(e) => setGuestPaymentReference(e.target.value)}
                maxLength={128}
              />
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Waiver status</span>
            <select
              value={guestWaiverStatus}
              onChange={(e) =>
                setGuestWaiverStatus(
                  e.target.value as "accepted" | "missing" | "not_required" | "unknown"
                )
              }
              className="mt-1 w-full rounded border p-2"
            >
              <option value="missing">Missing — follow up required</option>
              <option value="accepted">Accepted (only choose if actually documented)</option>
              <option value="not_required">Not required</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <Input
            label="Walk-in note (optional)"
            value={guestNote}
            onChange={(e) => setGuestNote(e.target.value)}
            maxLength={500}
            hint="Useful for how they arrived, who referred them, or payment follow-up."
          />
          <p className="text-xs text-slate-500">
            This creates a guest participant for this session only. It does not create a SwimBuddz
            account, membership, booking form or waiver acceptance on their behalf.
          </p>
          <Button type="submit" disabled={disabled || !guestName.trim()}>
            Record guest walk-in
          </Button>
        </form>
      )}
    </details>
  );
}
