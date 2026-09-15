"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { apiPost } from "@/lib/api";
import type { components } from "@/lib/api-types";

type Booking = components["schemas"]["SessionBookingResponse"];

export function CorrectMissingCohortFee({
  booking,
  memberName,
  defaultFee,
  onCorrected,
}: {
  booking: Booking;
  memberName: string;
  defaultFee: number;
  onCorrected: (booking: Booking) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(defaultFee);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (
    booking.status !== "confirmed" ||
    booking.fee_amount_kobo !== 0 ||
    booking.access_source ||
    booking.payment_intent_id ||
    booking.wallet_transaction_id ||
    booking.party_size !== 1 ||
    booking.corporate_program_id
  )
    return null;
  return (
    <>
      <button
        type="button"
        className="mt-1 text-xs text-amber-800 underline print:hidden"
        onClick={() => setOpen(true)}
      >
        Correct missing class fee
      </button>
      {open && (
        <Modal
          isOpen
          title={`Correct missing fee for ${memberName}`}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !Number.isFinite(fee) || fee <= 0 || reason.trim().length < 10) return;
              setBusy(true);
              setError("");
              try {
                const corrected = await apiPost<Booking>(
                  `/api/v1/sessions/bookings/${booking.id}/admin/reconcile-missing-cohort-fee`,
                  { fee_amount_kobo: Math.round(fee * 100), reason: reason.trim() },
                  { auth: true }
                );
                onCorrected(corrected);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not correct this booking.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm text-slate-700">
              Only for an old class booking incorrectly saved at ₦0. Verify the originally agreed
              amount; do not use a later price increase. This records an outstanding fee, not a
              payment. Afterwards, use Record paid for money already received.
            </p>
            <Input
              label="Originally agreed session fee (₦)"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
            />
            <Input
              label="Reason and verification"
              required
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || fee <= 0 || reason.trim().length < 10}>
              {busy ? "Saving…" : "Save fee correction (not payment)"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
