"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, RideShareArea, Session } from "@/lib/sessions";
import { ArrowLeft, Calendar, Clock, CreditCard, MapPin, Tag, Users } from "lucide-react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Type for transport service ride config response
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

// Payment intent response type
type PaymentIntentResponse = {
    reference: string;
    amount: number;
    checkout_url: string | null;
    original_amount?: number;
    discount_applied?: number;
    discount_code?: string;
};

// Payment response type for verification
interface PaymentResponse {
    status: string;
    entitlement_applied_at: string | null;
    entitlement_error: string | null;
    payment_metadata?: {
        session_id?: string;
    };
}

// Discount preview response
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
}

export default function SessionBookPage({ params }: { params: { id: string } }) {
    const searchParams = useSearchParams();
    const [session, setSession] = useState<Session | null>(null);
    const [member, setMember] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [existingBookingStatus, setExistingBookingStatus] = useState<string | null>(null);

    // Ride share state
    const [selectedRideAreaId, setSelectedRideAreaId] = useState<string | null>(null);
    const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string | null>(null);

    // Discount state
    const [discountInput, setDiscountInput] = useState("");
    const [validatedDiscount, setValidatedDiscount] = useState<{
        code: string;
        amount: number;
        type: string | null;
        value: number | null;
    } | null>(null);
    const [validatingDiscount, setValidatingDiscount] = useState(false);

    // Payment state
    const [processing, setProcessing] = useState(false);

    // Payment callback state
    const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
    const [verifying, setVerifying] = useState(!!paymentReference);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Calculate costs
    const poolFee = session?.pool_fee ?? 0;
    const selectedArea = session?.rideShareAreas?.find((a) => a.id === selectedRideAreaId);
    const rideShareCost = selectedArea?.cost ?? 0;
    const subtotal = poolFee + rideShareCost;
    const discountAmount = validatedDiscount?.amount ?? 0;
    const total = Math.max(0, subtotal - discountAmount);

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
                // Load session
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

                // Load member profile
                try {
                    const profile = await apiGet<MemberProfile>("/api/v1/members/me", { auth: true });
                    setMember(profile);
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

    // Check existing bookings
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
            } catch {
                // Ignore - best-effort UX improvement
            }
        }
        loadExistingBooking();
        return () => {
            cancelled = true;
        };
    }, [params.id]);

    // Apply discount code
    const handleApplyDiscount = async () => {
        if (!discountInput.trim()) return;

        setValidatingDiscount(true);
        try {
            const response = await apiPost<DiscountPreviewResponse>(
                "/api/v1/payments/discounts/preview",
                {
                    code: discountInput.trim().toUpperCase(),
                    purpose: "session_fee",
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

    const handleClearDiscount = () => {
        setDiscountInput("");
        setValidatedDiscount(null);
    };

    // Process payment
    const handlePayment = async () => {
        // For free sessions (total = 0), just sign in directly
        if (total <= 0) {
            setProcessing(true);
            try {
                await apiPost(
                    `/api/v1/attendance/sessions/${params.id}/sign-in`,
                    {
                        status: "PRESENT",
                        ride_share_option: selectedRideAreaId ? "join" : undefined,
                        needs_ride: !!selectedRideAreaId,
                        pickup_location: selectedPickupLocationId,
                    },
                    { auth: true }
                );
                setPaymentSuccess(true);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unable to book this session.";
                toast.error(message);
            } finally {
                setProcessing(false);
            }
            return;
        }

        setProcessing(true);
        try {
            const intent = await apiPost<PaymentIntentResponse>(
                "/api/v1/payments/intents",
                {
                    purpose: "session_fee",
                    currency: "NGN",
                    payment_method: "paystack",
                    session_id: session!.id,
                    direct_amount: subtotal,
                    ride_config_id: selectedRideAreaId || undefined,
                    pickup_location_id: selectedPickupLocationId || undefined,
                    attendance_status: "PRESENT",
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

    // Show verifying state while checking payment
    if (verifying) {
        return <LoadingCard text="Verifying payment..." />;
    }

    // Show payment success
    if (paymentSuccess && session) {
        const startsAt = new Date(session.starts_at);
        const formattedDate = startsAt.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
        });
        const startTime = startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const endTime = new Date(session.ends_at).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <div className="max-w-xl mx-auto px-4 py-8">
                <Card className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-3xl">
                            ✓
                        </div>
                        <h1 className="text-2xl font-bold text-emerald-600">You're confirmed!</h1>
                        <p className="text-lg font-semibold text-slate-900">{session.title}</p>
                        <p className="text-slate-600">
                            {session.location_name ?? session.location} — {formattedDate}, {startTime}–{endTime}
                        </p>
                    </div>

                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-emerald-500">✓</span>
                            <div>
                                <p className="font-semibold text-emerald-900">Booking confirmed</p>
                                <p className="text-sm text-emerald-700">Your attendance has been recorded.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/account">
                            <Button className="w-full">Go to Dashboard</Button>
                        </Link>
                        <Link href="/sessions">
                            <Button variant="secondary" className="w-full">
                                View All Sessions
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // Show payment error
    if (paymentError) {
        return (
            <div className="max-w-xl mx-auto px-4 py-8">
                <Card className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-orange-500 text-white text-3xl">
                            !
                        </div>
                        <h1 className="text-2xl font-bold text-red-600">Payment Issue</h1>
                        <p className="text-slate-600">{paymentError}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href={`/sessions/${params.id}/book`}>
                            <Button className="w-full">Try Again</Button>
                        </Link>
                        <Link href="/account/billing">
                            <Button variant="secondary" className="w-full">
                                Check Billing
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    if (loading) {
        return <LoadingCard text="Loading session..." />;
    }

    if (error || !session) {
        if (error === "Session not found.") {
            return notFound();
        }
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

    // Already booked
    if (existingBookingStatus) {
        const startsAt = new Date(session.starts_at);
        const formattedDate = startsAt.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
        });
        const startTime = startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const endTime = new Date(session.ends_at).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <div className="max-w-xl mx-auto px-4 py-8">
                <Card className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-3xl">
                            ✓
                        </div>
                        <h1 className="text-2xl font-bold text-emerald-600">You're already booked!</h1>
                        <p className="text-lg font-semibold text-slate-900">{session.title}</p>
                        <p className="text-slate-600">
                            {session.location_name ?? session.location} — {formattedDate}, {startTime}–{endTime}
                        </p>
                        <p className="text-sm text-slate-500">
                            Status: <span className="font-semibold capitalize">{existingBookingStatus}</span>
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/account/attendance/history">
                            <Button className="w-full">View My Attendance</Button>
                        </Link>
                        <Link href="/sessions">
                            <Button variant="secondary" className="w-full">
                                Back to Sessions
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // Parse session times
    const startsAt = new Date(session.starts_at);
    const endsAt = new Date(session.ends_at);
    const formattedDate = startsAt.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const startTime = startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const endTime = endsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const hasRideShareAreas = session.rideShareAreas && session.rideShareAreas.length > 0;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {/* Back link */}
            <Link
                href="/sessions"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to sessions
            </Link>

            {/* Session Details Card */}
            <Card className="p-6 space-y-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-cyan-600 uppercase tracking-wide">Book Session</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{session.title}</h1>
                </div>

                <div className="grid gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                            {startTime} – {endTime}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{session.location_name ?? session.location ?? "TBA"}</span>
                    </div>
                    {session.capacity && (
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>Capacity: {session.capacity} swimmers</span>
                        </div>
                    )}
                </div>

                {session.description && (
                    <p className="text-sm text-slate-600 border-t border-slate-100 pt-4">{session.description}</p>
                )}
            </Card>

            {/* Attendee Info */}
            {member && (
                <Card className="p-6 space-y-2">
                    <h2 className="text-lg font-semibold text-slate-900">Attendee</h2>
                    <div className="text-sm text-slate-600">
                        <p className="font-medium text-slate-900">
                            {member.first_name} {member.last_name}
                        </p>
                        <p>{member.email}</p>
                        {member.phone && <p>{member.phone}</p>}
                    </div>
                </Card>
            )}

            {/* Ride Share Section */}
            {hasRideShareAreas && (
                <Card className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Ride Share</h2>
                        <span className="text-xs text-slate-500">Optional</span>
                    </div>

                    <p className="text-sm text-slate-600">
                        Need a ride to the pool? Select a pickup area to book a seat.
                    </p>

                    {/* Ride Areas */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {session.rideShareAreas!.map((area) => (
                            <div
                                key={area.id}
                                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                                    selectedRideAreaId === area.id
                                        ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                                onClick={() => {
                                    if (selectedRideAreaId === area.id) {
                                        setSelectedRideAreaId(null);
                                        setSelectedPickupLocationId(null);
                                    } else {
                                        setSelectedRideAreaId(area.id);
                                        setSelectedPickupLocationId(null);
                                    }
                                    // Clear discount when ride share changes (affects total)
                                    if (validatedDiscount) {
                                        handleClearDiscount();
                                    }
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-900">{area.ride_area_name}</p>
                                        <p className="text-xs text-slate-500">
                                            {area.pickup_locations.length} pickup point
                                            {area.pickup_locations.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <span className="font-semibold text-cyan-600">{formatCurrency(area.cost)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pickup Locations */}
                    {selectedRideAreaId && selectedArea && (
                        <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                            <p className="text-sm font-medium text-slate-900">Select Pickup Location</p>
                            <div className="grid gap-2">
                                {selectedArea.pickup_locations.map((loc) => {
                                    const isSelected = selectedPickupLocationId === loc.id;
                                    const isFull = loc.current_bookings >= loc.max_capacity;
                                    const isDisabled = !loc.is_available || isFull;

                                    return (
                                        <div
                                            key={loc.id}
                                            className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                                                isDisabled
                                                    ? "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                                                    : isSelected
                                                    ? "border-cyan-500 bg-white ring-1 ring-cyan-500 cursor-pointer"
                                                    : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                                            }`}
                                            onClick={() => {
                                                if (!isDisabled) {
                                                    setSelectedPickupLocationId(loc.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="pickup_location"
                                                    checked={isSelected}
                                                    readOnly
                                                    disabled={isDisabled}
                                                    className="h-4 w-4 border-slate-300 text-cyan-600"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{loc.name}</p>
                                                    {loc.description && (
                                                        <p className="text-xs text-slate-500">{loc.description}</p>
                                                    )}
                                                    {loc.departure_time_calculated && (
                                                        <p className="text-xs text-cyan-600 mt-1">
                                                            Departs:{" "}
                                                            {new Date(loc.departure_time_calculated).toLocaleTimeString(
                                                                "en-GB",
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                }
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                        isDisabled
                                                            ? "bg-slate-200 text-slate-600"
                                                            : "bg-emerald-100 text-emerald-700"
                                                    }`}
                                                >
                                                    {isDisabled
                                                        ? isFull
                                                            ? "Full"
                                                            : "Unavailable"
                                                        : `${loc.current_bookings}/${loc.max_capacity}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Order Summary */}
            <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>

                <div className="space-y-3">
                    {/* Line items */}
                    <div className="flex justify-between py-2">
                        <span className="text-slate-700">Session Fee</span>
                        <span className="text-slate-900">{formatCurrency(poolFee)}</span>
                    </div>

                    {selectedArea && (
                        <div className="flex justify-between py-2">
                            <span className="text-slate-700">Ride Share ({selectedArea.ride_area_name})</span>
                            <span className="text-slate-900">{formatCurrency(rideShareCost)}</span>
                        </div>
                    )}

                    {/* Discount section */}
                    <div className="pt-3 border-t border-slate-100">
                        {validatedDiscount ? (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 min-w-0">
                                        <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-emerald-700">
                                                {validatedDiscount.code}
                                            </p>
                                            <p className="text-xs text-emerald-600">
                                                {validatedDiscount.type === "percentage"
                                                    ? `${validatedDiscount.value}% off`
                                                    : `${formatCurrency(validatedDiscount.value ?? 0)} off`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm font-semibold text-emerald-700">
                                            -{formatCurrency(discountAmount)}
                                        </span>
                                        <button
                                            onClick={handleClearDiscount}
                                            className="p-1 rounded-full text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"
                                            aria-label="Remove discount"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={discountInput}
                                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                                    placeholder="Discount code"
                                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-cyan-400 focus:border-transparent uppercase placeholder:text-slate-400"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleApplyDiscount}
                                    disabled={!discountInput.trim() || validatingDiscount}
                                    className="flex-shrink-0"
                                >
                                    {validatingDiscount ? "..." : "Apply"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t border-slate-200 flex justify-between">
                        <span className="text-base font-semibold text-slate-900">Total</span>
                        <div className="text-right">
                            {discountAmount > 0 && (
                                <span className="text-sm text-slate-400 line-through mr-2">
                                    {formatCurrency(subtotal)}
                                </span>
                            )}
                            <span className="text-xl font-bold text-cyan-600">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Payment Button */}
            <div className="space-y-4">
                <Button
                    onClick={handlePayment}
                    disabled={processing || (!!selectedRideAreaId && !selectedPickupLocationId)}
                    size="lg"
                    className="w-full"
                >
                    {processing ? (
                        "Processing..."
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            {total <= 0 ? "Confirm Booking" : `Pay ${formatCurrency(total)}`}
                        </span>
                    )}
                </Button>

                {selectedRideAreaId && !selectedPickupLocationId && (
                    <p className="text-center text-sm text-amber-600">Please select a pickup location to continue.</p>
                )}

                <p className="text-center text-xs text-slate-400">
                    {total <= 0
                        ? "This session is free! Click to confirm your booking."
                        : "Payments are securely processed by Paystack."}
                </p>
            </div>
        </div>
    );
}
