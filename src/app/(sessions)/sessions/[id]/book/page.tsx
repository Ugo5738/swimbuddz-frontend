"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { BubblesSlider } from "@/components/checkout/BubblesSlider";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, type RideShareArea, type Session } from "@/lib/sessions";
import { getPaidMembershipTier } from "@/lib/tiers";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SessionVolunteerPanel } from "@/components/volunteer/SessionVolunteerPanel";
import { AlreadyBooked } from "./_components/AlreadyBooked";
import { BookingError } from "./_components/BookingError";
import { BookingSessionHeader } from "./_components/BookingSessionHeader";
import { BookingSuccess } from "./_components/BookingSuccess";
import { MobileStickyBar } from "./_components/MobileStickyBar";

import { GuestsForm, guestIsValid, type GuestInfo } from "./_components/GuestsForm";
import { OrderSummary } from "./_components/OrderSummary";
import { RideShareSection, type RidePassenger } from "./_components/RideShareSection";
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
  status: string;
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
  // When the existing booking has an outstanding fee (e.g. admin walk-in
  // where the member never paid online), the AlreadyBooked screen exposes
  // a "Pay outstanding" button. Populated by the unpaid-bookings fetch.
  const [unpaidBooking, setUnpaidBooking] = useState<{
    id: string;
    fee_amount_kobo: number;
  } | null>(null);

  // Ride share
  const [selectedRideAreaId, setSelectedRideAreaId] = useState<string | null>(null);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string | null>(null);
  const [existingRideBooking, setExistingRideBooking] = useState<any>(null);
  const [isRideOnlyFlow, setIsRideOnlyFlow] = useState(false);
  const [numSeats, setNumSeats] = useState(1);
  const [ridePassengers, setRidePassengers] = useState<RidePassenger[]>([
    { passenger_type: "member", full_name: "" },
  ]);

  // Guests (bring-a-friend). party_size = 1 (member) + guests.length.
  const [guests, setGuests] = useState<GuestInfo[]>([]);

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
  const [bubblesToApply, setBubblesToApply] = useState(0);

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
  const partySize = 1 + guests.length;
  const poolFee = isRideOnlyFlow ? 0 : (session?.pool_fee ?? 0) * partySize;
  const subtotal = poolFee + rideShareCost;
  const discountAmount = validatedDiscount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);
  const bubblesNeeded = Math.floor(total / 100);
  const hasRideShareAreas = session?.rideShareAreas && session.rideShareAreas.length > 0;

  const effectiveBubbles = Math.min(bubblesToApply, walletBalance ?? 0, Math.floor(total / 100));
  const paystackAmount = Math.max(0, total - effectiveBubbles * 100);
  const payWithBubbles = effectiveBubbles > 0;
  useEffect(() => {
    if (bubblesToApply !== effectiveBubbles) setBubblesToApply(effectiveBubbles);
  }, [bubblesToApply, effectiveBubbles]);

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
        const sessionData = await getSession(params.id, { auth: true });

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
            apiGet<{ balance: number; available_balance?: number; status: string }>(
              "/api/v1/wallet/me",
              {
                auth: true,
              }
            ),
          ]);
          if (profile.status === "fulfilled") {
            setMember(profile.value);
          } else {
            setError("Please sign in to book this session.");
          }
          if (wallet.status === "fulfilled" && wallet.value.status === "active") {
            setWalletBalance(wallet.value.available_balance ?? wallet.value.balance);
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

  // Check existing bookings (SessionBooking + legacy attendance + ride)
  useEffect(() => {
    let cancelled = false;
    async function loadExistingBooking() {
      try {
        // Phase 3.3: a confirmed SessionBooking is the canonical "I've
        // paid for this session" record. It does NOT create an
        // attendance row (attendance is day-of, at sign-in), so this
        // must be checked directly — otherwise the page can't tell the
        // user already paid and re-shows the payment form (double-pay
        // risk). Fall back to the legacy attendance check below for
        // pre-Phase-3.3 bookings.
        let foundStatus: string | null = null;
        try {
          const myBookings = await apiGet<Array<{ session_id: string; status?: string }>>(
            "/api/v1/sessions/bookings/me?status_filter=confirmed",
            {
              auth: true,
            }
          );
          if (cancelled) return;
          const booking = (myBookings || []).find((b) => b.session_id === params.id);
          if (booking) {
            foundStatus = String(booking.status || "confirmed").toLowerCase();
          }
        } catch {
          // Endpoint unavailable / not authenticated — fall through to
          // the legacy attendance check.
        }

        if (!foundStatus) {
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
          foundStatus = status || "booked";
        }

        setExistingBookingStatus(foundStatus);

        // Best-effort: if this confirmed booking still has an outstanding
        // pool fee (no payment + no Bubbles linked), surface a Pay button
        // in the AlreadyBooked screen.
        try {
          const unpaid = await apiGet<
            Array<{ id: string; session_id: string; fee_amount_kobo: number }>
          >("/api/v1/sessions/bookings/me/unpaid", { auth: true });
          if (cancelled) return;
          const match = (unpaid || []).find((b) => b.session_id === params.id);
          if (match) {
            setUnpaidBooking({ id: match.id, fee_amount_kobo: match.fee_amount_kobo });
          }
        } catch {
          // Endpoint may be unavailable — fine, just don't surface the button.
        }

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
    // Map the bring-a-friend guests to the backend BookingGuestCreate shape.
    const guestsPayload = guests.map((g) => ({
      full_name: g.name.trim(),
      phone: g.phone.trim() || null,
      intent: "social" as const,
      date_of_birth: g.dob || null,
      guardian_name: g.guardianName.trim() || null,
      guardian_phone: g.guardianPhone.trim() || null,
      waiver_accepted: g.waiverAccepted,
    }));

    // A genuinely free session needs no payment intent.
    if (subtotal <= 0) {
      setProcessing(true);
      try {
        if (!isRideOnlyFlow) {
          // A1 Phase 3.3 — book the session (creates SessionBooking).
          // pay_with_bubbles=true (or free session) → endpoint debits
          // wallet and flips to CONFIRMED atomically (preserves the
          // one-click UX the old sign-in flow gave us). Day-of
          // attendance still happens via the existing sign-in endpoint,
          // which now links AttendanceRecord.booking_id back here.
          await apiPost(
            `/api/v1/sessions/${params.id}/book`,
            {
              session_id: params.id,
              fee_amount_kobo: Math.round((session?.pool_fee ?? 0) * partySize * 100),
              pay_with_bubbles: false,
              guests: guestsPayload,
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
              pay_with_bubbles: false,
              num_seats: numSeats,
              passengers: ridePassengers,
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
              passengers: ridePassengers,
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
      // A1 Phase 3.3 — for a real session (not ride-only) create the
      // PENDING SessionBooking first, then pay for it. The entitlement
      // handler (purpose=session_booking) flips it to CONFIRMED once
      // Paystack verifies. Ride-only flow has no session booking.
      let bookingId: string | undefined;
      if (!isRideOnlyFlow) {
        const booking = await apiPost<{ id: string }>(
          `/api/v1/sessions/${session!.id}/book`,
          {
            session_id: session!.id,
            fee_amount_kobo: Math.round((session?.pool_fee ?? 0) * partySize * 100),
            pay_with_bubbles: false,
            guests: guestsPayload,
          },
          { auth: true }
        );
        bookingId = booking.id;
      }

      const intent = await apiPost<PaymentIntentResponse>(
        "/api/v1/payments/intents",
        {
          purpose: isRideOnlyFlow ? "ride_share" : "session_booking",
          currency: "NGN",
          payment_method: "paystack",
          session_id: session!.id,
          direct_amount: subtotal,
          ride_config_id: selectedRideAreaId || undefined,
          pickup_location_id: selectedPickupLocationId || undefined,
          num_seats: numSeats,
          passengers: selectedRideAreaId && selectedPickupLocationId ? ridePassengers : undefined,
          bubbles_to_apply: effectiveBubbles || undefined,
          discount_code: validatedDiscount?.code || undefined,
          ...(bookingId ? { payment_metadata: { booking_id: bookingId } } : {}),
        },
        { auth: true }
      );

      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else if (intent.status === "paid") {
        setPaymentSuccess(true);
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
    // Compute bubbles actually used: slider value when set, else fall back to toggle logic.
    const bubblesUsed = effectiveBubbles;
    const paystackAmountDisplay = Math.max(0, total - bubblesUsed * 100);
    return (
      <BookingSuccess
        session={session}
        breakdown={{
          poolFee,
          rideShareFee: rideShareCost,
          discountAmount,
          discountCode: validatedDiscount?.code,
          bubblesApplied: bubblesUsed,
          paystackAmount: paystackAmountDisplay,
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
        unpaidBooking={unpaidBooking}
      />
    );
  }

  const memberTier = member ? getPaidMembershipTier(member) : "prospect";
  const requiredTier = session.access?.required_tier ?? "community";
  const canBookSession = session.access?.bookable === true;
  if (!isRideOnlyFlow && !canBookSession) {
    const isAccessMissing = !session.access;
    const isUnavailable = session.access?.reason === "session_unavailable";
    return (
      <TierGate
        requiredTier={requiredTier}
        memberTier={memberTier}
        title={
          isAccessMissing ? "Access unavailable" : isUnavailable ? "Session unavailable" : undefined
        }
        message={
          session.access?.message ??
          "We could not verify your booking access. Please refresh and try again."
        }
        showUpgrade={!isAccessMissing && !isUnavailable}
      />
    );
  }

  // --- Pay button disabled logic ---
  const payDisabled =
    processing ||
    (!!selectedRideAreaId && !selectedPickupLocationId) ||
    (isRideOnlyFlow && (!selectedRideAreaId || !selectedPickupLocationId)) ||
    (!isRideOnlyFlow && guests.some((g) => !guestIsValid(g)));

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

          {/* Bring-a-friend guests — only when the session accepts guests and
              not in the ride-only flow. */}
          {!isRideOnlyFlow && session?.allows_guests !== false && (
            <GuestsForm
              guests={guests}
              onChange={setGuests}
              maxGuests={session?.max_guests_per_booking ?? 4}
              perHeadFee={session?.pool_fee ?? 0}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Ride share */}
          {hasRideShareAreas && (
            <RideShareSection
              rideShareAreas={session.rideShareAreas!}
              selectedRideAreaId={selectedRideAreaId}
              selectedPickupLocationId={selectedPickupLocationId}
              numSeats={numSeats}
              passengers={ridePassengers}
              isRideOnlyFlow={isRideOnlyFlow}
              formatCurrency={formatCurrency}
              onSelectRideArea={handleRideAreaChange}
              onSelectPickupLocation={setSelectedPickupLocationId}
              onChangeSeats={setNumSeats}
              onChangePassengers={setRidePassengers}
            />
          )}

          {/* Payment method */}
          {total > 0 && (
            <Card className="p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {paystackAmount > 0 ? "Card payment via Paystack" : "Fully covered by Bubbles"}
                </p>
              </div>

              {/* Card payment info */}
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

          {/* Volunteer opportunities attached to this session — placed
              below payment as a secondary "while you're here" prompt.
              Renders nothing if no open slots match the viewer's tier. */}
          <SessionVolunteerPanel sessionId={session.id} />

          {/* Validation message (mobile only, since desktop has it in sidebar) */}
          {validationMessage && (
            <p className="text-center text-sm text-amber-600 lg:hidden">{validationMessage}</p>
          )}

          {/* Order summary - inline on mobile only */}
          <div className="lg:hidden">
            <OrderSummary
              poolFee={poolFee}
              partySize={partySize}
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
              effectiveBubbles={effectiveBubbles}
              paystackAmount={paystackAmount}
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
              partySize={partySize}
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
              effectiveBubbles={effectiveBubbles}
              paystackAmount={paystackAmount}
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
