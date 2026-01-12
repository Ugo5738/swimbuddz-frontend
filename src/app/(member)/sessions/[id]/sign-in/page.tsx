"use client";

import { SessionSignIn } from "@/components/sessions/SessionSignIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, RideShareArea, Session } from "@/lib/sessions";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

// Payment response type for verification
interface PaymentResponse {
    status: string;
    entitlement_applied_at: string | null;
    entitlement_error: string | null;
    payment_metadata?: {
        session_id?: string;
    };
}

export default function SessionSignInPage({ params }: { params: { id: string } }) {
    const searchParams = useSearchParams();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Payment callback state
    const paymentReference = searchParams.get("reference") || searchParams.get("trxref");
    const [verifying, setVerifying] = useState(!!paymentReference);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

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
                    // Payment not yet fully processed - poll or show pending
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

    useEffect(() => {
        async function loadSessionData() {
            try {
                const sessionData = await getSession(params.id);

                try {
                    const rideConfigs = await apiGet<RideConfig[]>(
                        `/api/v1/transport/sessions/${params.id}/ride-configs`,
                        { auth: true }
                    );

                    if (rideConfigs && rideConfigs.length > 0) {
                        sessionData.rideShareAreas = rideConfigs.map((config): RideShareArea => ({
                            id: config.id, // session ride config id
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
                        }));
                    }
                } catch (transportErr) {
                    console.log("No ride share config found for session:", transportErr);
                }

                setSession(sessionData);
            } catch (err) {
                console.error("Failed to fetch session:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        loadSessionData();
    }, [params.id]);

    // Show verifying state while checking payment
    if (verifying) {
        return <LoadingCard text="Verifying payment..." />;
    }

    // Show payment success confirmation
    if (paymentSuccess && session) {
        const startsAt = new Date(session.starts_at);
        const formattedDate = startsAt.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });
        const startTime = startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(session.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        return (
            <div className="max-w-xl mx-auto px-4 py-8">
                <Card className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-3xl">
                            ✓
                        </div>
                        <h1 className="text-2xl font-bold text-emerald-600">
                            You're confirmed for {session.title}
                        </h1>
                        <p className="text-slate-600">
                            {session.location} — {formattedDate}, {startTime}–{endTime}
                        </p>
                    </div>

                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-emerald-500">✓</span>
                            <div>
                                <p className="font-semibold text-emerald-900">Payment successful</p>
                                <p className="text-sm text-emerald-700">Your attendance has been recorded.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/account">
                            <Button className="w-full">Go to Dashboard</Button>
                        </Link>
                        <Link href="/sessions">
                            <Button variant="secondary" className="w-full">View All Sessions</Button>
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
                        <Link href={`/sessions/${params.id}/sign-in`}>
                            <Button className="w-full">Try Again</Button>
                        </Link>
                        <Link href="/account/billing">
                            <Button variant="secondary" className="w-full">Check Billing</Button>
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
        return notFound();
    }

    return <SessionSignIn session={session} />;
}
