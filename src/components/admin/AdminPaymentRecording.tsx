"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { MediaInput } from "@/components/ui/MediaInput";
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
  payment_method?: string | null;
  currency: string;
  amount: number;
  proof_of_payment_media_id: string | null;
  entitlement_applied_at: string | null;
  entitlement_error: string | null;
  payment_metadata?: {
    submitted_transfer?: { external_reference: string | null; received_date: string; note?: string };
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
  const [evidenceReferences, setEvidenceReferences] = useState<Record<string, string>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
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
              Submitted transfer: {payment.payment_metadata.submitted_transfer.external_reference || "Receipt only"} ·{" "}
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
            <MediaInput
              purpose="payment_proof"
              label="Attach missing receipt"
              disabled={busy}
              onUploadingChange={setBusy}
              onError={(message) => setError(message || "")}
              onChange={async (mediaId) => {
                if (!mediaId) return;
                setBusy(true);
                setError("");
                setMessage("");
                try {
                  await apiPost(
                    `/api/v1/payments/admin/${encodeURIComponent(payment.reference)}/receipt`,
                    { proof_media_id: mediaId },
                    { auth: true }
                  );
                  result.refetch();
                  setMessage("Receipt attached. Payment status was not changed.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not attach receipt");
                } finally { setBusy(false); }
              }}
            />
          )}
          {["pending", "failed"].includes(payment.status) && payment.payment_method !== "paystack" && (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <p className="font-semibold">Submit payment evidence for review</p>
              <p className="text-sm text-slate-600">
                Attach a receipt above, enter a transaction reference below, or use both.
                This does not record money as received or activate access.
              </p>
              <Input
                label="Bank reference (optional with receipt)"
                value={evidenceReferences[payment.reference] || ""}
                onChange={(event) => setEvidenceReferences((current) => ({
                  ...current, [payment.reference]: event.target.value,
                }))}
                maxLength={128}
              />
              <Input
                label="Evidence note (optional)"
                value={evidenceNotes[payment.reference] || ""}
                onChange={(event) => setEvidenceNotes((current) => ({
                  ...current, [payment.reference]: event.target.value,
                }))}
                maxLength={500}
              />
              <Button
                disabled={busy || (!payment.proof_of_payment_media_id && !evidenceReferences[payment.reference]?.trim())}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(
                      `/api/v1/payments/admin/${encodeURIComponent(payment.reference)}/evidence`,
                      {
                        external_reference: evidenceReferences[payment.reference]?.trim() || null,
                        note: evidenceNotes[payment.reference]?.trim() || null,
                        proof_media_id: payment.proof_of_payment_media_id,
                      },
                      { auth: true }
                    );
                    await result.refetch();
                    setMessage("Evidence submitted for review. Payment has not been marked as paid.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not submit evidence");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Submit evidence for review
              </Button>
            </div>
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
