"use client";

import { useEffect, useRef, useState } from "react";
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
type OpenBookingPayment = {
  reference: string;
  purpose: string;
  status: string;
  payment_method: string;
  amount: number;
  currency: string;
  bubbles_to_apply: number;
  bubbles_value_ngn: number;
  checkout_url?: string | null;
  can_cancel_and_switch: boolean;
};
type OpenBookingPaymentResponse = {
  open_payment: OpenBookingPayment | null;
  already_settled: boolean;
};
type SwitchMethodResponse = {
  outcome: "closed_unpaid" | "already_paid" | "ready";
  reference?: string | null;
  message: string;
};

export default function SessionSettlementPage({ params }: { params: { bookingId: string } }) {
  const booking = useApi<Booking>(`/api/v1/sessions/bookings/${params.bookingId}/settlement`);
  const openPaymentState = useApi<OpenBookingPaymentResponse>(
    `/api/v1/payments/bookings/${params.bookingId}/open-payment`,
  );
  const wallet = useApi<{ status: string; balance: number; available_balance?: number }>("/api/v1/wallet/me");
  const [method, setMethod] = useState<CheckoutPaymentMethod>("paystack");
  const [bubbles, setBubbles] = useState(0);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paid, setPaid] = useState(false);
  const [fulfillmentPending, setFulfillmentPending] = useState(false);
  const balance = wallet.data?.status === "active" ? wallet.data.available_balance ?? wallet.data.balance : 0;
  const total = (booking.data?.fee_amount_kobo ?? 0) / 100;
  const applied = method === "paystack" ? Math.min(bubbles, balance, Math.floor(total / BUBBLES_TO_NGN_RATE)) : 0;
  const remainder = total - applied * BUBBLES_TO_NGN_RATE;

  // Refresh open payment & booking state when user navigates back from external Paystack checkout (including iOS Safari bfcache).
  useEffect(() => {
    const refresh = () => {
      booking.refetch();
      openPaymentState.refetch();
      wallet.refetch();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookingId]);

  const submitIntent = async (chosenMethod: CheckoutPaymentMethod, chosenBubbles: number) => {
    if (!booking.data || submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const body = {
        purpose: "session_booking", currency: "NGN", payment_method: chosenMethod,
        session_id: booking.data.session_id, direct_amount: total,
        bubbles_to_apply: chosenBubbles, payment_metadata: { booking_id: booking.data.id },
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start payment";
      setError(message);
      if (message.toLowerCase().includes("already open")) {
        openPaymentState.refetch();
      }
    } finally {
      submitting.current = false; setBusy(false);
    }
  };

  const pay = async () => {
    await submitIntent(method, applied);
  };

  const handleResumeOpen = async (openRow: OpenBookingPayment) => {
    if (openRow.checkout_url) {
      window.location.href = openRow.checkout_url;
      return;
    }
    const originalMethod: CheckoutPaymentMethod =
      openRow.payment_method === "manual_transfer" ? "manual_transfer" : "paystack";
    await submitIntent(originalMethod, openRow.bubbles_to_apply);
  };

  const handleSwitchMethod = async () => {
    if (switching || busy) return;
    setSwitching(true); setError(""); setNotice("");
    try {
      const res = await apiPost<SwitchMethodResponse>(
        `/api/v1/payments/bookings/${params.bookingId}/open-payment/switch`,
        undefined,
        { auth: true },
      );
      if (res.outcome === "already_paid") {
        setPaid(true);
        setNotice(res.message);
        booking.refetch();
        openPaymentState.refetch();
        return;
      }
      setNotice(res.message);
      openPaymentState.refetch();
      wallet.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch payment method right now.");
      openPaymentState.refetch();
    } finally {
      setSwitching(false);
    }
  };

  if (booking.loading) return <LoadingCard text="Loading outstanding fee…" />;
  if (booking.error || !booking.data) return <Alert variant="error">{booking.error || "Booking not found"}</Alert>;
  if (paid || booking.data.settled || openPaymentState.data?.already_settled) {
    return <Card className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">{fulfillmentPending ? "Payment received" : "Session fee settled"}</h1>
      <p>{fulfillmentPending ? "Your payment is recorded. We’re finishing the booking update; please do not pay again." : `You have paid for ${booking.data.session_title}.`}</p>
      <Link href="/account/billing" className="text-cyan-700 underline">Back to Billing</Link>
    </Card>;
  }
  if (booking.data.status !== "confirmed") return <Alert>This booking is no longer payable. Check your Billing page.</Alert>;

  const openRow = openPaymentState.data?.open_payment ?? null;

  return <Card className="mx-auto max-w-xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Settle your session fee</h1>
    <p>{booking.data.session_title} · {new Date(booking.data.session_starts_at).toLocaleDateString()}</p>
    <p className="text-xl font-semibold">Amount owed: {formatCurrency(total)}</p>
    {notice && <Alert variant="info">{notice}</Alert>}
    {error && <Alert variant="error">{error}</Alert>}

    {openRow ? (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="space-y-1">
          <p className="font-semibold">Open payment in progress ({openRow.reference})</p>
          <p>
            Method: <strong>{openRow.payment_method === "manual_transfer" ? "Bank transfer" : "Pay online"}</strong>
            {" · "}
            {openRow.bubbles_to_apply > 0 ? `${openRow.bubbles_to_apply} Bubbles + ` : ""}
            {formatCurrency(openRow.amount)}
          </p>
        </div>

        {openRow.purpose === "session_bundle" ? (
          <div className="space-y-3">
            <p>This swim is part of a combined session payment. Resume it directly below.</p>
            {openRow.checkout_url && (
              <Button onClick={() => { window.location.href = openRow.checkout_url!; }} className="w-full">
                Resume combined payment ({formatCurrency(openRow.amount)})
              </Button>
            )}
          </div>
        ) : openRow.payment_method === "manual_transfer" ? (
          <div className="space-y-3">
            {openRow.status === "pending_review" ? (
              <p>We’re reviewing your uploaded bank transfer receipt. Please do not start another payment.</p>
            ) : (
              <p>Finish this transfer by uploading your receipt so our team can confirm it.</p>
            )}
            <Link
              href={
                openRow.status === "pending"
                  ? `/account/billing?pending_transfer=${encodeURIComponent(openRow.reference)}#bank-transfer-receipts`
                  : "/account/billing#bank-transfer-receipts"
              }
              className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white"
            >
              {openRow.status === "pending" ? "Upload transfer receipt" : "View receipt status"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p>You can finish that Paystack checkout or cancel the unpaid attempt to use Bubbles or bank transfer instead.</p>
            <Button onClick={() => void handleResumeOpen(openRow)} disabled={busy || switching} className="w-full">
              {busy ? "Opening…" : `Resume online payment (${formatCurrency(openRow.amount)})`}
            </Button>
            {openRow.can_cancel_and_switch && (
              <Button
                variant="outline"
                onClick={() => void handleSwitchMethod()}
                disabled={busy || switching}
                className="w-full"
              >
                {switching ? "Checking with Paystack…" : "Switch payment method or Bubbles"}
              </Button>
            )}
          </div>
        )}
      </div>
    ) : (
      <fieldset disabled={busy || switching} className="space-y-5">
        <PaymentMethodChoice value={method} onChange={(next) => { setMethod(next); setBubbles(0); }} />
        {method === "paystack" && <>
          {wallet.loading && <p>Loading your Bubbles balance…</p>}
          {wallet.error && <p className="text-sm">Bubbles balance is unavailable. You can still pay the full amount online.</p>}
          <BubblesSlider amountDueNgn={total} walletBalance={balance} bubblesToApply={applied} onChange={setBubbles} />
        </>}
        <p aria-live="polite">{applied > 0 && `${applied} Bubbles + `}{formatCurrency(remainder)} {method === "manual_transfer" ? "by bank transfer" : "online"}</p>
        <Button onClick={pay} disabled={busy} className="w-full">{busy ? "Processing…" : remainder === 0 ? "Settle with Bubbles" : method === "manual_transfer" ? "Continue to bank transfer" : `Pay ${formatCurrency(remainder)} online`}</Button>
      </fieldset>
    )}
  </Card>;
}
