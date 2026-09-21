"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PaymentProofLink } from "./PaymentProofLink";
import { OfflineSessionPaymentModal } from "./OfflineSessionPaymentModal";

type Payment = {
  reference: string;
  payer_email: string | null;
  purpose: string;
  status: string;
  currency: string;
  amount: number;
  proof_of_payment_media_id: string | null;
  entitlement_applied_at: string | null;
  entitlement_error: string | null;
  payment_metadata?: {
    submitted_transfer?: { external_reference: string; received_date: string; note?: string };
  };
};

export function AdminPaymentRecording() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const result = useApi<Payment[]>(
    query ? `/api/v1/payments/admin/recording?search=${encodeURIComponent(query)}` : null
  );
  const [selected, setSelected] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold">Record an offline payment or attach a receipt</h2>
      <p className="text-sm text-slate-600">
        For Membership, Club, Academy, sessions, store, Experiences, guests, Bubbles and Stroke Lab.
        Search an existing checkout reference or payer email. The recorded amount must match its
        frozen quote. For a session without a checkout, use Attendance → Record paid.
      </p>
      <p className="text-sm text-amber-800">
        Verify the bank credit first. Do not settle an abandoned/expired order without reviewing
        availability. Paid records only allow attaching a missing receipt, not charging again.
        Bubbles-plus-cash checkouts cannot be converted to offline settlement.
      </p>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query === input.trim()) result.refetch();
          else setQuery(input.trim());
        }}
      >
        <Input
          label="Payment reference or payer email"
          name="payment_search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          minLength={3}
          required
        />
        <Button type="submit" disabled={result.loading}>
          Search
        </Button>
      </form>
      {(error || result.error) && <Alert variant="error">{error || result.error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {query && !result.loading && !result.error && result.data?.length === 0 && (
        <p>
          No matching payment. Start the appropriate checkout first; never invent a payment amount
          here.
        </p>
      )}
      {result.data?.map((payment) => (
        <div key={payment.reference} className="space-y-3 rounded-lg border p-4">
          <p className="font-semibold">
            {payment.reference} · {payment.payer_email || "Guest"}
          </p>
          <p>
            {payment.purpose.replace(/_/g, " ")} · {payment.currency}{" "}
            {payment.amount.toLocaleString()} · {payment.status}
          </p>
          {payment.payment_metadata?.submitted_transfer && (
            <p className="break-all text-sm">
              Submitted transfer: {payment.payment_metadata.submitted_transfer.external_reference} ·{" "}
              {payment.payment_metadata.submitted_transfer.received_date}
            </p>
          )}
          {payment.status === "paid" && !payment.entitlement_applied_at && (
            <Alert variant="info">
              Payment received, but fulfillment is still pending. Do not record another payment;
              review activation.
            </Alert>
          )}
          <PaymentProofLink mediaId={payment.proof_of_payment_media_id} />
          {!payment.proof_of_payment_media_id && (
            <label className="block text-sm">
              Attach missing receipt
              <input
                className="mt-1 block"
                type="file"
                accept="image/*,.pdf"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    const media = await uploadMedia(
                      file,
                      "payment_proof",
                      payment.reference,
                      `Payment receipt ${payment.reference}`
                    );
                    await apiPost(
                      `/api/v1/payments/admin/${encodeURIComponent(payment.reference)}/receipt`,
                      { proof_media_id: media.id },
                      { auth: true }
                    );
                    result.refetch();
                    setMessage("Receipt attached. Payment status was not changed.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          )}
          {["pending", "pending_review"].includes(payment.status) && (
            <Button
              disabled={busy}
              onClick={() => {
                setSelected(payment);
                setError("");
                setMessage("");
              }}
            >
              Record verified payment
            </Button>
          )}
        </div>
      ))}
      {selected && (
        <OfflineSessionPaymentModal
          memberName={selected.payer_email || selected.reference}
          amountNaira={selected.amount}
          currency={selected.currency}
          paymentLabel={`${selected.reference} · ${selected.purpose.replace(/_/g, " ")}`}
          noteRequired
          submitting={busy}
          error={error}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
          onSubmit={async (body) => {
            setBusy(true);
            setError("");
            try {
              const saved = await apiPost<Payment>(
                `/api/v1/payments/admin/${encodeURIComponent(selected.reference)}/offline-payment`,
                { ...body, amount_kobo: Math.round(selected.amount * 100) },
                { auth: true }
              );
              setSelected(null);
              result.refetch();
              setMessage(
                saved.entitlement_applied_at
                  ? "Payment recorded and fulfillment completed."
                  : "Payment recorded. Fulfillment is pending—do not collect again."
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not record payment");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </Card>
  );
}
