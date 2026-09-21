"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiPost, apiUpload } from "@/lib/api";
import { BANK_TRANSFER_ACCOUNT } from "@/lib/bank-transfer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

type Transfer = {
  reference: string;
  amount_kobo: number;
  currency: string;
  purpose: string;
  status: string;
  fulfilled: boolean;
  receipt_attached: boolean;
  reservation_expires_at?: string | null;
};

export default function TransferPage() {
  const { reference } = useParams<{ reference: string }>();
  const [token, setToken] = useState("");
  const [payment, setPayment] = useState<Transfer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bankReference, setBankReference] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const capability = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    setToken(capability);
    if (!capability) {
      setError("Open the private transfer link from your checkout.");
      return;
    }
    let active = true;
    apiPost<Transfer>(`/api/v1/payments/manual-transfer/${encodeURIComponent(reference)}/view`, {
      access_token: capability,
    })
      .then((value) => {
        if (active) setPayment(value);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load payment");
      });
    return () => {
      active = false;
    };
  }, [reference]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (file && !payment?.receipt_attached) {
        const data = new FormData();
        data.append("file", file);
        data.append("access_token", token);
        setPayment(
          await apiUpload<Transfer>(
            `/api/v1/payments/manual-transfer/${encodeURIComponent(reference)}/upload`,
            data
          )
        );
      }
      setPayment(
        await apiPost<Transfer>(
          `/api/v1/payments/manual-transfer/${encodeURIComponent(reference)}/submit`,
          {
            access_token: token,
            external_reference: bankReference.trim(),
            received_date: date,
          }
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit transfer");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 py-10">
      <h1 className="text-2xl font-bold">Bank transfer</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {!payment && !error && <p>Loading payment…</p>}
      {payment && (
        <Card className="space-y-4">
          <p>
            {payment.purpose.replace(/_/g, " ")} · {payment.reference}
          </p>
          <p className="text-3xl font-bold">
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: payment.currency,
            }).format(payment.amount_kobo / 100)}
          </p>
          {payment.status === "paid" ? (
            <Alert variant="success">
              Payment recorded.{" "}
              {payment.fulfilled
                ? "Your access has been confirmed."
                : "Access activation is processing; do not pay again."}
            </Alert>
          ) : payment.status === "pending_review" ? (
            <Alert variant="info">
              Transfer submitted for Admin verification. Do not pay again. This is not yet a
              confirmed booking or ticket.
            </Alert>
          ) : !["pending", "failed"].includes(payment.status) ? (
            <Alert variant="info">
              This checkout is closed. Contact Admin if you already transferred; do not send a new
              payment.
            </Alert>
          ) : (
            <>
              <div className="rounded-lg bg-cyan-50 p-4 text-slate-900">
                <p>{BANK_TRANSFER_ACCOUNT.bankName}</p>
                <p className="text-xl font-bold">{BANK_TRANSFER_ACCOUNT.accountNumber}</p>
                <p>{BANK_TRANSFER_ACCOUNT.accountName}</p>
              </div>
              <p className="text-sm">
                Already transferred? Submit the existing transaction reference; do not transfer
                again. If the amount differs or covers multiple purchases, contact Admin for
                allocation. Reservations keep their stated expiry; contact Admin before paying an
                expired reservation.
              </p>
              {payment.reservation_expires_at && (
                <Alert variant="info">
                  Reservation deadline: {new Date(payment.reservation_expires_at).toLocaleString()}.
                  Receipt submission does not extend this hold. If this time has passed, contact
                  Admin before sending money. You can still submit a transfer already made for
                  reconciliation.
                </Alert>
              )}
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Bank transaction reference"
                  name="bank_reference"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  minLength={3}
                  maxLength={128}
                  required
                />
                <Input
                  label="Transfer date"
                  name="transfer_date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                {payment.receipt_attached ? (
                  <p>Receipt file attached.</p>
                ) : (
                  <label className="block text-sm">
                    Receipt image or PDF (optional, up to 10 MB)
                    <input
                      className="mt-2 block w-full"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? "Submitting…" : "Submit transfer for review"}
                </Button>
              </form>
            </>
          )}
        </Card>
      )}
    </main>
  );
}
