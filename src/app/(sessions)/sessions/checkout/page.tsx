"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, type Session } from "@/lib/sessions";
import { ArrowLeft, Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

type PaymentIntentResponse = {
  reference: string;
  amount: number;
  checkout_url: string | null;
  original_amount?: number;
  discount_applied?: number;
  discount_code?: string;
};

type DiscountPreviewResponse = {
  valid: boolean;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number;
  final_total: number;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function BundleCheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";

  const initialIds = useMemo(
    () => idsParam.split(",").map((s) => s.trim()).filter(Boolean),
    [idsParam]
  );

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Discount
  const [discountCode, setDiscountCode] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplying, setDiscountApplying] = useState(false);
  const [discount, setDiscount] = useState<DiscountPreviewResponse | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Payment method
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [payWithBubbles, setPayWithBubbles] = useState(false);

  useEffect(() => {
    async function load() {
      if (initialIds.length === 0) {
        setError("No sessions selected.");
        setLoading(false);
        return;
      }
      if (initialIds.length > 10) {
        setError("Maximum 10 sessions per bundle.");
        setLoading(false);
        return;
      }
      try {
        const results = await Promise.allSettled(initialIds.map((id) => getSession(id)));
        const loaded: Session[] = [];
        for (const r of results) {
          if (r.status === "fulfilled") loaded.push(r.value);
        }
        if (loaded.length === 0) {
          setError("Could not load any of the selected sessions.");
        } else {
          // Sort by start time ascending
          loaded.sort(
            (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          );
          setSessions(loaded);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load sessions.");
      } finally {
        setLoading(false);
      }

      // Fetch wallet balance (best-effort)
      try {
        const wallet = await apiGet<{ balance: number }>("/api/v1/wallet/me", {
          auth: true,
        });
        setWalletBalance(wallet?.balance || 0);
      } catch {
        setWalletBalance(0);
      }
    }
    load();
  }, [initialIds]);

  const subtotal = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.pool_fee || 0), 0),
    [sessions]
  );
  const discountAmount = discount?.discount_amount || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const removeSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      // Clear discount if cart changes
      setDiscount(null);
      setDiscountCode("");
    },
    []
  );

  const applyDiscount = useCallback(async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    setDiscountApplying(true);
    setDiscountError(null);
    try {
      const preview = await apiPost<DiscountPreviewResponse>(
        "/api/v1/payments/discounts/preview",
        {
          code,
          purpose: "session_bundle",
          amount: subtotal,
        },
        { auth: true }
      );
      if (preview.valid) {
        setDiscount(preview);
        setDiscountCode(code);
      } else {
        setDiscountError("Invalid discount code.");
        setDiscount(null);
      }
    } catch {
      setDiscountError("Could not validate discount code.");
      setDiscount(null);
    } finally {
      setDiscountApplying(false);
    }
  }, [discountInput, subtotal]);

  const removeDiscount = useCallback(() => {
    setDiscount(null);
    setDiscountCode("");
    setDiscountInput("");
    setDiscountError(null);
  }, []);

  const handlePay = useCallback(async () => {
    if (sessions.length === 0) return;
    setPaying(true);
    try {
      // Route: wallet path if Bubbles covers total
      if (payWithBubbles && walletBalance >= total) {
        // Create intent with payment_method="manual_transfer" + wallet flag
        const intent = await apiPost<PaymentIntentResponse>(
          "/api/v1/payments/intents",
          {
            purpose: "session_bundle",
            currency: "NGN",
            payment_method: "paystack",
            session_ids: sessions.map((s) => s.id),
            direct_amount: total,
            discount_code: discountCode || undefined,
          },
          { auth: true }
        );
        // For wallet payments, we'd debit the wallet. For MVP, use Paystack checkout.
        if (intent.checkout_url) {
          window.location.href = intent.checkout_url;
          return;
        }
        toast.success("Booking confirmed!");
        router.push(`/sessions/checkout/success?ref=${intent.reference}`);
        return;
      }

      const intent = await apiPost<PaymentIntentResponse>(
        "/api/v1/payments/intents",
        {
          purpose: "session_bundle",
          currency: "NGN",
          payment_method: "paystack",
          session_ids: sessions.map((s) => s.id),
          direct_amount: total,
          discount_code: discountCode || undefined,
        },
        { auth: true }
      );

      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else {
        router.push(`/sessions/checkout/success?ref=${intent.reference}`);
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }, [sessions, payWithBubbles, walletBalance, total, discountCode, router]);

  if (loading) return <LoadingCard text="Loading checkout..." />;

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>
        <Alert variant="error" title="Checkout error">
          {error}
        </Alert>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>
        <Card className="p-8 text-center">
          <p className="text-slate-600">Your bundle is empty.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sessions
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Book Multiple Sessions</h1>
        <p className="mt-1 text-sm text-slate-600">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"} · {formatCurrency(total)} total
        </p>
      </header>

      {/* Session list */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDateTime(s.starts_at)}
                  </span>
                  {(s.location_name || s.location) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {s.location_name || s.location}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(s.pool_fee || 0)}
                </p>
              </div>
              <button
                onClick={() => removeSession(s.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-600 transition-colors"
                aria-label="Remove session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Discount code */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-900">Discount code</p>
        {discount ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 p-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{discount.code}</p>
              <p className="text-xs text-emerald-600">
                -{formatCurrency(discount.discount_amount)} off
              </p>
            </div>
            <button
              onClick={removeDiscount}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              <Button
                onClick={applyDiscount}
                disabled={discountApplying || !discountInput.trim()}
                variant="outline"
                size="md"
              >
                {discountApplying ? "..." : "Apply"}
              </Button>
            </div>
            {discountError && <p className="text-xs text-red-600">{discountError}</p>}
          </div>
        )}
      </Card>

      {/* Order summary */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Order summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">
              Subtotal ({sessions.length} {sessions.length === 1 ? "session" : "sessions"})
            </span>
            <span className="text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          {discount && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({discount.code})</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>

      {/* Payment method picker (wallet toggle) */}
      {walletBalance > 0 && walletBalance >= total && (
        <Card className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={payWithBubbles}
              onChange={(e) => setPayWithBubbles(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Pay with Bubbles</p>
              <p className="text-xs text-slate-500">
                Balance: {walletBalance.toLocaleString()} Bubbles
              </p>
            </div>
          </label>
        </Card>
      )}

      {/* Ride share note */}
      <Alert variant="info" title="Ride share">
        Ride share is booked per session. Book your bundle first, then add ride share from each
        session detail page.
      </Alert>

      {/* Sticky pay bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(total)}</p>
            </div>
            <Button
              onClick={handlePay}
              disabled={paying || sessions.length === 0 || total <= 0}
              size="md"
            >
              {paying
                ? "Processing..."
                : payWithBubbles && walletBalance >= total
                  ? "Pay with Bubbles"
                  : `Pay ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BundleCheckoutPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading checkout..." />}>
      <BundleCheckoutInner />
    </Suspense>
  );
}
