"use client";

import { BubblesSlider } from "@/components/checkout/BubblesSlider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, type RideShareArea, type Session } from "@/lib/sessions";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookingSessionHeader } from "../../../[id]/book/_components/BookingSessionHeader";
import { MobileStickyBar } from "../../../[id]/book/_components/MobileStickyBar";
import { OrderSummary } from "../../../[id]/book/_components/OrderSummary";
import { RideShareSection } from "../../../[id]/book/_components/RideShareSection";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

interface RideConfig {
  id: string;
  ride_area_id: string;
  ride_area_name: string;
  cost: number;
  capacity: number;
  pickup_locations: Array<{
    id: string;
    name: string;
    description?: string;
    is_available: boolean;
    max_capacity: number;
    current_bookings: number;
    distance_text?: string;
    duration_text?: string;
    departure_time_calculated?: string;
  }>;
}

type PaymentIntentResponse = {
  reference: string;
  amount: number;
  checkout_url: string | null;
};

type DiscountPreviewResponse = {
  valid: boolean;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number;
  final_total: number;
  applies_to_component: string | null;
  message?: string;
};

type RideSelection = {
  rideAreaId: string | null;
  pickupLocationId: string | null;
  numSeats: number;
};

export function BundleBookingFlow({ ids }: { ids: string[] }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rideSelections, setRideSelections] = useState<Map<string, RideSelection>>(new Map());

  const [discountInput, setDiscountInput] = useState("");
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    amount: number;
    type: string | null;
    value: number | null;
  } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [bubblesToApply, setBubblesToApply] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (ids.length > 10) {
          setError("Maximum 10 sessions per bundle.");
          setLoading(false);
          return;
        }
        const sessionsData = await Promise.all(ids.map((id) => getSession(id)));
        if (cancelled) return;

        await Promise.all(
          sessionsData.map(async (s) => {
            try {
              const rideConfigs = await apiGet<RideConfig[]>(
                `/api/v1/transport/sessions/${s.id}/ride-configs`,
                { auth: true }
              );
              if (rideConfigs && rideConfigs.length > 0) {
                s.rideShareAreas = rideConfigs.map(
                  (config): RideShareArea => ({
                    id: config.id,
                    ride_area_id: config.ride_area_id,
                    ride_area_name: config.ride_area_name,
                    cost: config.cost,
                    capacity: config.capacity,
                    pickup_locations: config.pickup_locations.map((loc) => ({
                      id: loc.id,
                      name: loc.name,
                      description: loc.description,
                      is_available: loc.is_available,
                      max_capacity: loc.max_capacity,
                      current_bookings: loc.current_bookings,
                      distance_text: loc.distance_text,
                      duration_text: loc.duration_text,
                      departure_time_calculated: loc.departure_time_calculated,
                    })),
                  })
                );
              }
            } catch {
              // No ride configs for this session — optional
            }
          })
        );

        sessionsData.sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        );

        if (cancelled) return;
        setSessions(sessionsData);
      } catch (err) {
        console.error("Failed to load bundle sessions:", err);
        if (!cancelled) setError("Unable to load the selected sessions.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const wallet = await apiGet<{ balance: number; status: string }>("/api/v1/wallet/me", {
          auth: true,
        });
        if (!cancelled && wallet?.status === "active") {
          setWalletBalance(wallet.balance);
        }
      } catch {
        // Ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const poolFeesTotal = sessions.reduce((sum, s) => sum + (s.pool_fee || 0), 0);
  const rideShareTotal = sessions.reduce((sum, s) => {
    const sel = rideSelections.get(s.id);
    if (!sel || !sel.rideAreaId || !sel.pickupLocationId) return sum;
    const area = s.rideShareAreas?.find((a) => a.id === sel.rideAreaId);
    return sum + (area?.cost ?? 0) * sel.numSeats;
  }, 0);
  const subtotal = poolFeesTotal + rideShareTotal;
  const discountAmount = validatedDiscount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);
  const bubblesNeeded = Math.ceil(total / 100);

  const sliderMax = Math.min(walletBalance ?? 0, bubblesNeeded);
  const effectiveBubbles = Math.min(bubblesToApply, sliderMax);
  const bubblesValueNgn = effectiveBubbles * 100;
  const paystackAmount = Math.max(0, total - bubblesValueNgn);

  const lineItems = sessions.flatMap((s) => {
    const items: { id: string; label: string; amount: number }[] = [
      {
        id: `pool-${s.id}`,
        label: `Pool fee · ${s.title}`,
        amount: s.pool_fee || 0,
      },
    ];
    const sel = rideSelections.get(s.id);
    if (sel?.rideAreaId && sel?.pickupLocationId) {
      const area = s.rideShareAreas?.find((a) => a.id === sel.rideAreaId);
      if (area) {
        const cost = area.cost * sel.numSeats;
        items.push({
          id: `ride-${s.id}`,
          label: `Ride share · ${area.ride_area_name}${sel.numSeats > 1 ? ` ×${sel.numSeats}` : ""}`,
          amount: cost,
        });
      }
    }
    return items;
  });

  const updateRide = (sessionId: string, patch: Partial<RideSelection>) => {
    setRideSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(sessionId) ?? {
        rideAreaId: null,
        pickupLocationId: null,
        numSeats: 1,
      };
      next.set(sessionId, { ...current, ...patch });
      return next;
    });
    if (validatedDiscount) {
      setValidatedDiscount(null);
      setDiscountInput("");
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingDiscount(true);
    try {
      const response = await apiPost<DiscountPreviewResponse>(
        "/api/v1/payments/discounts/preview",
        {
          code: discountInput.trim().toUpperCase(),
          purpose: "session_bundle",
          subtotal,
        },
        { auth: true }
      );
      if (response.valid) {
        setValidatedDiscount({
          code: response.code,
          amount: response.discount_amount,
          type: response.discount_type,
          value: response.discount_value,
        });
        toast.success(response.message || `Discount "${response.code}" applied`);
      } else {
        toast.error(response.message || "Invalid discount code");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to validate discount code");
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleClearDiscount = () => {
    setDiscountInput("");
    setValidatedDiscount(null);
  };

  const handlePayment = async () => {
    if (total <= 0 || sessions.length === 0) return;
    setProcessing(true);

    const sessionRideConfigs: Record<
      string,
      { ride_config_id: string; pickup_location_id: string; num_seats: number }
    > = {};
    for (const [sessionId, sel] of rideSelections.entries()) {
      if (sel.rideAreaId && sel.pickupLocationId) {
        sessionRideConfigs[sessionId] = {
          ride_config_id: sel.rideAreaId,
          pickup_location_id: sel.pickupLocationId,
          num_seats: sel.numSeats,
        };
      }
    }

    try {
      const intent = await apiPost<PaymentIntentResponse>(
        "/api/v1/payments/intents",
        {
          purpose: "session_bundle",
          currency: "NGN",
          payment_method: "paystack",
          session_ids: sessions.map((s) => s.id),
          direct_amount: subtotal,
          discount_code: validatedDiscount?.code || undefined,
          bubbles_to_apply: effectiveBubbles > 0 ? effectiveBubbles : undefined,
          session_ride_configs:
            Object.keys(sessionRideConfigs).length > 0 ? sessionRideConfigs : undefined,
        },
        { auth: true }
      );

      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else {
        toast.error("Unable to initialize payment. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to process payment.";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingCard text="Loading sessions..." />
      </div>
    );
  }

  if (error || sessions.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Card className="p-6 space-y-6 text-center">
          <Alert variant="error" title="Unable to load">
            {error || "No sessions found."}
          </Alert>
          <Link href="/sessions">
            <Button>Back to Sessions</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const payDisabled = processing || total <= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to sessions
      </Link>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Book {sessions.length} Sessions
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatCurrency(subtotal)} · review each session and add ride share if needed
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {sessions.map((s) => {
            const sel = rideSelections.get(s.id) ?? {
              rideAreaId: null,
              pickupLocationId: null,
              numSeats: 1,
            };
            return (
              <div key={s.id} className="space-y-3">
                <BookingSessionHeader session={s} member={null} isRideOnlyFlow={false} />
                {s.rideShareAreas && s.rideShareAreas.length > 0 && (
                  <RideShareSection
                    rideShareAreas={s.rideShareAreas}
                    selectedRideAreaId={sel.rideAreaId}
                    selectedPickupLocationId={sel.pickupLocationId}
                    numSeats={sel.numSeats}
                    isRideOnlyFlow={false}
                    formatCurrency={formatCurrency}
                    onSelectRideArea={(areaId) =>
                      updateRide(s.id, {
                        rideAreaId: areaId,
                        pickupLocationId: null,
                      })
                    }
                    onSelectPickupLocation={(locationId) =>
                      updateRide(s.id, { pickupLocationId: locationId })
                    }
                    onChangeSeats={(seats) => updateRide(s.id, { numSeats: seats })}
                  />
                )}
              </div>
            );
          })}

          {total > 0 && (
            <Card className="p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {paystackAmount > 0 ? "Card payment via Paystack" : "Fully covered by Bubbles"}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex-shrink-0 rounded-lg p-2 bg-slate-100">
                  <svg
                    className="w-5 h-5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {paystackAmount > 0
                      ? `${formatCurrency(paystackAmount)} via Paystack`
                      : "No card payment needed"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {paystackAmount > 0
                      ? "Card, bank transfer, or USSD"
                      : "Bubbles cover the full amount"}
                  </p>
                </div>
              </div>
              {walletBalance !== null && walletBalance > 0 && (
                <BubblesSlider
                  amountDueNgn={total}
                  walletBalance={walletBalance}
                  bubblesToApply={effectiveBubbles}
                  onChange={setBubblesToApply}
                />
              )}
            </Card>
          )}

          <div className="lg:hidden">
            <OrderSummary
              lineItems={lineItems}
              poolFee={0}
              rideShareCost={0}
              selectedArea={undefined}
              selectedPickupLocationId={null}
              numSeats={1}
              discountAmount={discountAmount}
              validatedDiscount={validatedDiscount}
              discountInput={discountInput}
              validatingDiscount={validatingDiscount}
              subtotal={subtotal}
              total={total}
              payWithBubbles={false}
              bubblesNeeded={bubblesNeeded}
              effectiveBubbles={effectiveBubbles}
              paystackAmount={paystackAmount}
              isRideOnlyFlow={false}
              formatCurrency={formatCurrency}
              onDiscountInputChange={setDiscountInput}
              onApplyDiscount={handleApplyDiscount}
              onClearDiscount={handleClearDiscount}
              processing={processing}
              payDisabled={payDisabled}
              onPay={handlePayment}
            />
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6">
            <OrderSummary
              lineItems={lineItems}
              poolFee={0}
              rideShareCost={0}
              selectedArea={undefined}
              selectedPickupLocationId={null}
              numSeats={1}
              discountAmount={discountAmount}
              validatedDiscount={validatedDiscount}
              discountInput={discountInput}
              validatingDiscount={validatingDiscount}
              subtotal={subtotal}
              total={total}
              payWithBubbles={false}
              bubblesNeeded={bubblesNeeded}
              effectiveBubbles={effectiveBubbles}
              paystackAmount={paystackAmount}
              isRideOnlyFlow={false}
              formatCurrency={formatCurrency}
              onDiscountInputChange={setDiscountInput}
              onApplyDiscount={handleApplyDiscount}
              onClearDiscount={handleClearDiscount}
              processing={processing}
              payDisabled={payDisabled}
              onPay={handlePayment}
            />
          </div>
        </div>
      </div>

      <MobileStickyBar
        total={total}
        payWithBubbles={false}
        bubblesNeeded={bubblesNeeded}
        effectiveBubbles={effectiveBubbles}
        paystackAmount={paystackAmount}
        processing={processing}
        disabled={payDisabled}
        formatCurrency={formatCurrency}
        onPay={handlePayment}
      />
    </div>
  );
}
