"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { hasTierAccess, requiredTierForSessionType } from "@/lib/sessionAccess";
import { getSession, type RideShareArea, type Session } from "@/lib/sessions";
import { getEffectiveTier } from "@/lib/tiers";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AlreadyBooked } from "./_components/AlreadyBooked";
import { BookingError } from "./_components/BookingError";
import { BookingSessionHeader } from "./_components/BookingSessionHeader";
import { BookingSuccess } from "./_components/BookingSuccess";
import { MobileStickyBar } from "./_components/MobileStickyBar";
import { OrderSummary } from "./_components/OrderSummary";
import { PaymentMethodPicker } from "./_components/PaymentMethodPicker";
import { RideShareSection } from "./_components/RideShareSection";
import { TierGate } from "./_components/TierGate";

// ---------------------------------------------------------------------------
// Helpers & types
// ---------------------------------------------------------------------------

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
  original_amount?: number;
  discount_applied?: number;
  discount_code?: string;
};

interface PaymentResponse {
  status: string;
  entitlement_applied_at: string | null;
  entitlement_error: string | null;
  payment_metadata?: { session_id?: string };
}

interface DiscountPreviewResponse {
  valid: boolean;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number;
  final_total: number;
  applies_to_component: string | null;
  message: string | null;
}

interface MemberProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  membership?: {
    primary_tier?: string | null;
    active_tiers?: string[] | null;
    requested_tiers?: string[] | null;
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SessionBookPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();

  // Core data
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingBookingStatus, setExistingBookingStatus] = useState<string | null>(null);

  // Ride share
  const [selectedRideAreaId, setSelectedRideAreaId] = useState<string | null>(null);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string | null>(null);
  const [existingRideBooking, setExistingRideBooking] = useState<any>(null);
  const [isRideOnlyFlow, setIsRideOnlyFlow] = useState(false);
  const [numSeats, setNumSeats] = useState(1);

  // Discount
  const [discountInput, setDiscountInput] = useState("");
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    amount: number;
    type: string | null;
    value: number | null;
  } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Wallet / bubbles
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payWithBubbles, setPayWithBubbles] = useState(false);

  // Payment
  const [processing, setProcessing] = useState(false);
  const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
  const [verifying, setVerifying] = useState(!!paymentReference);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Derived values ---
  const selectedArea = session?.rideShareAreas?.find((a) => a.id === selectedRideAreaId);
  const perSeatRideCost = selectedArea && selectedPickupLocationId ? selectedArea.cost : 0;
  const rideShareCost = perSeatRideCost * numSeats;
  const poolFee = isRideOnlyFlow ? 0 : (session?.pool_fee ?? 0);
  const subtotal = poolFee + rideShareCost;
  const discountAmount = validatedDiscount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);
  const bubblesNeeded = Math.ceil(total / 100);
  const canPayWithBubbles = total > 0 && walletBalance !== null && walletBalance >= bubblesNeeded;
  const hasRideShareAreas = session?.rideShareAreas && session.rideShareAreas.length > 0;

  // --- Effects ---

  // Verify payment if coming back from Paystack
  useEffect(() => {
    if (!paymentReference) return;
    async function verifyPayment() {
      try {
        const payment = await apiPost<PaymentResponse>(
          `/api/v1/payments/paystack/verify/${paymentReference}`,
          {},
          { auth: true }
        );
        if (payment.status === "paid" && payment.entitlement_applied_at) {
          setPaymentSuccess(true);
        } else if (payment.entitlement_error) {
          setPaymentError(payment.entitlement_error);
        } else {
          setPaymentError("Payment is still processing. Please wait a moment and refresh.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to verify payment";
        setPaymentError(message);
      } finally {
        setVerifying(false);
      }
    }
    verifyPayment();
  }, [paymentReference]);

  // Load session and member data
  useEffect(() => {
    async function loadData() {
      try {
        const sessionData = await getSession(params.id);

        // Load ride configs
        try {
          const rideConfigs = await apiGet<RideConfig[]>(
            `/api/v1/transport/sessions/${params.id}/ride-configs`,
            { auth: true }
          );
          if (rideConfigs && rideConfigs.length > 0) {
            sessionData.rideShareAreas = rideConfigs.map(
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
        } catch (transportErr) {
          console.log("No ride share config found for session:", transportErr);
        }

        setSession(sessionData);

        // Load member profile and wallet balance in parallel
        try {
          const [profile, wallet] = await Promise.allSettled([
            apiGet<MemberProfile>("/api/v1/members/me", { auth: true }),
            apiGet<{ balance: number; status: string }>("/api/v1/wallet/me", {
              auth: true,
            }),
          ]);
          if (profile.status === "fulfilled") {
            setMember(profile.value);
          } else {
            setError("Please sign in to book this session.");
          }
          if (wallet.status === "fulfilled" && wallet.value.status === "active") {
            setWalletBalance(wallet.value.balance);
          }
        } catch {
          setError("Please sign in to book this session.");
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
        setError("Session not found.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  // Check existing bookings (attendance + ride)
  useEffect(() => {
    let cancelled = false;
    async function loadExistingBooking() {
      try {
        const attendance = await apiGet<Array<{ session_id: string; status?: string }>>(
          "/api/v1/attendance/me",
          { auth: true }
        );
        if (cancelled) return;
        const record = (attendance || []).find((r) => r.session_id === params.id);
        if (!record) return;
        const status = String(record.status || "").toLowerCase();
        if (status === "cancelled" || status === "canceled" || status === "no_show") {
          return;
        }
        setExistingBookingStatus(status || "booked");

        // Check for existing ride booking
        let hasRideBooking = false;
        try {
          const rideBooking = await apiGet<any>(
            `/api/v1/transport/sessions/${params.id}/bookings/me`,
            { auth: true }
          );
          if (cancelled) return;
          if (rideBooking) {
            setExistingRideBooking(rideBooking);
            hasRideBooking = true;
          }
        } catch {
          // 404 or error means no ride booking — that's fine
        }

        // Note: we do NOT auto-set isRideOnlyFlow here.
        // The AlreadyBooked screen shows a "Need a ride?" button
        // that lets the user opt into the ride-only flow explicitly.
      } catch {
        // Ignore - best-effort UX improvement
      }
    }
    loadExistingBooking();
    return () => {
      cancelled = true;
    };
  }, [params.id, session]);

  // --- Handlers ---

  const handleClearDiscount = () => {
    setDiscountInput("");
    setValidatedDiscount(null);
  };

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingDiscount(true);
    try {
      const response = await apiPost<DiscountPreviewResponse>(
        "/api/v1/payments/discounts/preview",
        {
          code: discountInput.trim().toUpperCase(),
          purpose: isRideOnlyFlow ? "ride_share" : "session_fee",
          subtotal: subtotal,
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
      const message = e instanceof Error ? e.message : "Failed to validate discount code";
      toast.error(message);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRideAreaChange = (areaId: string | null) => {
    setSelectedRideAreaId(areaId);
    // Clear discount when ride share changes (affects total)
    if (validatedDiscount) handleClearDiscount();
  };

  const handlePayment = async () => {
    // Free session OR paying with Bubbles → direct sign-in path
    if (total <= 0 || payWithBubbles) {
      setProcessing(true);
      try {
        if (!isRideOnlyFlow) {
          await apiPost(
            `/api/v1/attendance/sessions/${params.id}/sign-in`,
            {
              status: "present",
              ride_share_option: selectedRideAreaId ? "join" : undefined,
              needs_ride: !!selectedRideAreaId,
              pickup_location: selectedPickupLocationId,
              pay_with_bubbles: payWithBubbles && total > 0,
            },
            { auth: true }
          );
        }

        // Book ride if ride selected
        if (selectedRideAreaId && selectedPickupLocationId && rideShareCost > 0) {
          await apiPost(
            `/api/v1/transport/sessions/${params.id}/bookings`,
            {
              session_ride_config_id: selectedRideAreaId,
              pickup_location_id: selectedPickupLocationId,
              pay_with_bubbles: payWithBubbles && total > 0,
              num_seats: numSeats,
            },
            { auth: true }
          );
        } else if (isRideOnlyFlow && selectedRideAreaId && selectedPickupLocationId) {
          await apiPost(
            `/api/v1/transport/sessions/${params.id}/bookings`,
            {
              session_ride_config_id: selectedRideAreaId,
              pickup_location_id: selectedPickupLocationId,
              pay_with_bubbles: true,
              num_seats: numSeats,
            },
            { auth: true }
          );
        }

        setPaymentSuccess(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to book this session.";
        toast.error(message);
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Paystack flow
    setProcessing(true);
    try {
      const intent = await apiPost<PaymentIntentResponse>(
        "/api/v1/payments/intents",
        {
          purpose: isRideOnlyFlow ? "ride_share" : "session_fee",
          currency: "NGN",
          payment_method: "paystack",
          session_id: session!.id,
          direct_amount: subtotal,
          ride_config_id: selectedRideAreaId || undefined,
          pickup_location_id: selectedPickupLocationId || undefined,
          num_seats: numSeats,
          ...(isRideOnlyFlow ? {} : { attendance_status: "present" }),
          discount_code: validatedDiscount?.code || undefined,
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

  // --- Early returns ---

  if (verifying) return <LoadingCard text="Verifying payment..." />;

  if (paymentSuccess && session) {
    const bubblesUsed = payWithBubbles && total > 0 ? bubblesNeeded : 0;
    const paystackAmount = payWithBubbles ? 0 : total;
    return (
      <BookingSuccess
        session={session}
        breakdown={{
          poolFee,
          rideShareFee: rideShareCost,
          discountAmount,
          discountCode: validatedDiscount?.code,
          bubblesApplied: bubblesUsed,
          paystackAmount,
          total,
          reference: paymentReference || undefined,
        }}
      />
    );
  }

  if (paymentError) {
    return <BookingError sessionId={params.id} errorMessage={paymentError} />;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingCard text="Loading session..." />
      </div>
    );

  if (error || !session) {
    if (error === "Session not found.") return notFound();
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Card className="p-6 space-y-6 text-center">
          <Alert variant="error" title="Unable to load">
            {error || "Session not found."}
          </Alert>
          <Link href="/sessions">
            <Button>Back to Sessions</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (existingBookingStatus && !isRideOnlyFlow) {
    return (
      <AlreadyBooked
        session={session}
        existingBookingStatus={existingBookingStatus}
        existingRideBooking={existingRideBooking}
        hasRideShareAreas={!!hasRideShareAreas}
        onAddRideShare={() => setIsRideOnlyFlow(true)}
      />
    );
  }

  const memberTier = member ? getEffectiveTier(member) : "community";
  const requiredTier = requiredTierForSessionType(session.session_type);
  if (!hasTierAccess(memberTier, requiredTier)) {
    return <TierGate requiredTier={requiredTier} memberTier={memberTier} />;
  }

  // --- Pay button disabled logic ---
  const payDisabled =
    processing ||
    (!!selectedRideAreaId && !selectedPickupLocationId) ||
    (isRideOnlyFlow && (!selectedRideAreaId || !selectedPickupLocationId));

  const validationMessage: string | null = null;

  // --- Main booking UI ---
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back link – sits above the grid so both columns align */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to sessions
      </Link>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left column: session details + form sections */}
        <div className="lg:col-span-2 space-y-5">
          <BookingSessionHeader session={session} member={member} isRideOnlyFlow={isRideOnlyFlow} />

          {/* Ride share */}
          {hasRideShareAreas && (
            <RideShareSection
              rideShareAreas={session.rideShareAreas!}
              selectedRideAreaId={selectedRideAreaId}
              selectedPickupLocationId={selectedPickupLocationId}
              numSeats={numSeats}
              isRideOnlyFlow={isRideOnlyFlow}
              formatCurrency={formatCurrency}
              onSelectRideArea={handleRideAreaChange}
              onSelectPickupLocation={setSelectedPickupLocationId}
              onChangeSeats={setNumSeats}
            />
          )}

          {/* Payment method - compact segmented control */}
          {total > 0 && (
            <PaymentMethodPicker
              payWithBubbles={payWithBubbles}
              canPayWithBubbles={canPayWithBubbles}
              walletBalance={walletBalance}
              bubblesNeeded={bubblesNeeded}
              onSelectMethod={setPayWithBubbles}
            />
          )}

          {/* Validation message (mobile only, since desktop has it in sidebar) */}
          {validationMessage && (
            <p className="text-center text-sm text-amber-600 lg:hidden">{validationMessage}</p>
          )}

          {/* Order summary - inline on mobile only */}
          <div className="lg:hidden">
            <OrderSummary
              poolFee={poolFee}
              rideShareCost={rideShareCost}
              selectedArea={selectedArea}
              selectedPickupLocationId={selectedPickupLocationId}
              numSeats={numSeats}
              discountAmount={discountAmount}
              validatedDiscount={validatedDiscount}
              discountInput={discountInput}
              validatingDiscount={validatingDiscount}
              subtotal={subtotal}
              total={total}
              payWithBubbles={payWithBubbles}
              bubblesNeeded={bubblesNeeded}
              isRideOnlyFlow={isRideOnlyFlow}
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

        {/* Right column: sticky order summary (desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6">
            <OrderSummary
              poolFee={poolFee}
              rideShareCost={rideShareCost}
              selectedArea={selectedArea}
              selectedPickupLocationId={selectedPickupLocationId}
              numSeats={numSeats}
              discountAmount={discountAmount}
              validatedDiscount={validatedDiscount}
              discountInput={discountInput}
              validatingDiscount={validatingDiscount}
              subtotal={subtotal}
              total={total}
              payWithBubbles={payWithBubbles}
              bubblesNeeded={bubblesNeeded}
              isRideOnlyFlow={isRideOnlyFlow}
              formatCurrency={formatCurrency}
              onDiscountInputChange={setDiscountInput}
              onApplyDiscount={handleApplyDiscount}
              onClearDiscount={handleClearDiscount}
              processing={processing}
              payDisabled={payDisabled}
              onPay={handlePayment}
            />

            {validationMessage && (
              <p className="text-center text-sm text-amber-600 mt-3">{validationMessage}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <MobileStickyBar
        total={total}
        payWithBubbles={payWithBubbles}
        bubblesNeeded={bubblesNeeded}
        processing={processing}
        disabled={payDisabled}
        formatCurrency={formatCurrency}
        onPay={handlePayment}
      />
    </div>
  );
}
