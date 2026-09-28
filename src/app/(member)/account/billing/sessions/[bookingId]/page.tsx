"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { productCheckoutAttempt } from "@/lib/productCheckoutAttempt";
import { formatCurrency } from "@/lib/upgradeContext";
import { BubblesSlider, BUBBLES_TO_NGN_RATE } from "@/components/checkout/BubblesSlider";
import { PaymentMethodChoice, type CheckoutPaymentMethod } from "@/components/checkout/PaymentMethodChoice";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";

type Booking = {
  id: string; session_id: string; session_title: string; session_starts_at: string;
  fee_amount_kobo: number; settled: boolean; status: string;
};
type Intent = { reference: string; status: string; checkout_url?: string | null; entitlement_applied_at?: string | null };

export default function SessionSettlementPage({ params }: { params: { bookingId: string } }) {
  const booking = useApi<Booking>(`/api/v1/sessions/bookings/${params.bookingId}/settlement`);
  const wallet = useApi<{ status: string; balance: number; available_balance?: number }>("/api/v1/wallet/me");
  const [method, setMethod] = useState<CheckoutPaymentMethod>("paystack");
  const [bubbles, setBubbles] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [fulfillmentPending, setFulfillmentPending] = useState(false);
  const balance = wallet.data?.status === "active" ? wallet.data.available_balance ?? wallet.data.balance : 0;
  const total = (booking.data?.fee_amount_kobo ?? 0) / 100;
  const applied = method === "paystack" ? Math.min(bubbles, balance, Math.floor(total / BUBBLES_TO_NGN_RATE)) : 0;
  const remainder = total - applied * BUBBLES_TO_NGN_RATE;
  const pay = async () => {
    if (!booking.data || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const body = {
        purpose: "session_booking", currency: "NGN", payment_method: method,
        session_id: booking.data.session_id, direct_amount: total,
        bubbles_to_apply: applied, payment_metadata: { booking_id: booking.data.id },
      };
      const attempt = productCheckoutAttempt(`booking:${booking.data.id}`, body);
      const intent = await apiPost<Intent>("/api/v1/payments/intents", {
        ...body, idempotency_key: attempt.idempotencyKey,
      }, { auth: true });
      if (intent.status === "paid") {
        setPaid(true); setFulfillmentPending(!intent.entitlement_applied_at); attempt.complete();
      } else if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else throw new Error("Payment could not be started. Try again to resume this payment.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start payment"); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (booking.loading) return <LoadingCard text="Loading outstanding fee…" />;
  if (booking.error || !booking.data) return <Alert variant="error">{booking.error || "Booking not found"}</Alert>;
  if (paid || booking.data.settled) return <Card className="space-y-3 p-6">
    <h1 className="text-xl font-semibold">{fulfillmentPending ? "Payment received" : "Session fee settled"}</h1>
    <p>{fulfillmentPending ? "Your payment is recorded. We’re finishing the booking update; please do not pay again." : `You have paid for ${booking.data.session_title}.`}</p>
    <Link href="/account/billing" className="text-cyan-700 underline">Back to Billing</Link>
  </Card>;
  if (booking.data.status !== "confirmed") return <Alert>This booking is no longer payable. Check your Billing page.</Alert>;
  return <Card className="mx-auto max-w-xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Settle your session fee</h1>
    <p>{booking.data.session_title} · {new Date(booking.data.session_starts_at).toLocaleDateString()}</p>
    <p className="text-xl font-semibold">Amount owed: {formatCurrency(total)}</p>
    {error && <Alert variant="error">{error}</Alert>}
    <fieldset disabled={busy} className="space-y-5">
      <PaymentMethodChoice value={method} onChange={(next) => { setMethod(next); setBubbles(0); }} />
      {method === "paystack" && <>
        {wallet.loading && <p>Loading your Bubbles balance…</p>}
        {wallet.error && <p className="text-sm">Bubbles balance is unavailable. You can still pay the full amount online.</p>}
        <BubblesSlider amountDueNgn={total} walletBalance={balance} bubblesToApply={applied} onChange={setBubbles} />
      </>}
      <p aria-live="polite">{applied > 0 && `${applied} Bubbles + `}{formatCurrency(remainder)} {method === "manual_transfer" ? "by bank transfer" : "online"}</p>
      <Button onClick={pay} disabled={busy} className="w-full">{busy ? "Processing…" : remainder === 0 ? "Settle with Bubbles" : method === "manual_transfer" ? "Continue to bank transfer" : `Pay ${formatCurrency(remainder)} online`}</Button>
    </fieldset>
  </Card>;
}
