"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type Member = {
    id?: string | null;
    email?: string | null;
    membership?: {
        community_paid_until?: string | null;
        club_paid_until?: string | null;
        active_tiers?: string[] | null;
        requested_tiers?: string[] | null;
        primary_tier?: string | null;
        pending_payment_reference?: string | null;
    } | null;
};

type PaymentRecord = {
    id: string;
    reference: string;
    status: string;
    paid_at?: string | null;
    entitlement_applied_at?: string | null;
    entitlement_error?: string | null;
    payment_metadata?: {
        purpose?: string;
    } | null;
};

type PricingConfig = {
    community_annual: number;
    club_quarterly: number;
    club_biannual: number;
    club_annual: number;
    currency: string;
};

type Cohort = {
    id: string;
    name: string;
    program_name?: string;
    start_date?: string;
    price?: number;
    status?: string;
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(amount: number): string {
    return `₦${amount.toLocaleString("en-NG")}`;
}

// ============================================================================
// Component
// ============================================================================

export default function BillingPage() {
    const searchParams = useSearchParams();
    const providerReference = searchParams.get("reference") || searchParams.get("trxref");
    const isPaystackReturn = Boolean(providerReference);

    const [member, setMember] = useState<Member | null>(null);
    const [pricing, setPricing] = useState<PricingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [verificationTimedOut, setVerificationTimedOut] = useState(false);
    const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);

    // Load data
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [memberData, pricingData] = await Promise.all([
                apiGet<Member>("/api/v1/members/me", { auth: true }),
                apiGet<PricingConfig>("/api/v1/payments/pricing"),
            ]);
            setMember(memberData);
            setPricing(pricingData);
        } catch (e) {
            console.error("Failed to load billing data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Load returned payment if coming from Paystack
    useEffect(() => {
        if (!providerReference) return;
        const fetchPayment = async () => {
            try {
                const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
                const match = payments.find((p) => p.reference === providerReference);
                setReturnedPayment(match || null);
            } catch {
                // If we can't fetch payments, still try to verify
                setReturnedPayment(null);
            }
        };
        fetchPayment();
    }, [providerReference]);

    // Timeout for verification - after 30 seconds, stop showing loading
    useEffect(() => {
        if (!isPaystackReturn) return;
        const timeout = setTimeout(() => {
            setVerificationTimedOut(true);
        }, 30000); // 30 second timeout
        return () => clearTimeout(timeout);
    }, [isPaystackReturn]);

    // Auto-verify payment on return
    useEffect(() => {
        if (!providerReference || verifying || verificationError) return;
        if (returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at) return;

        const verify = async () => {
            setVerifying(true);
            try {
                await apiPost(`/api/v1/payments/paystack/verify/${encodeURIComponent(providerReference)}`, undefined, { auth: true });
                toast.success("Payment verified!");
                setVerificationError(null);
                await load();
                // Re-fetch payment to get updated status
                const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
                const match = payments.find((p) => p.reference === providerReference);
                setReturnedPayment(match || null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Verification failed";
                setVerificationError(message);
                toast.error(message);
            } finally {
                setVerifying(false);
            }
        };
        const timer = setTimeout(verify, 1000);
        return () => clearTimeout(timer);
    }, [providerReference, returnedPayment, verifying, verificationError, load]);

    // Load open cohorts for Academy section
    useEffect(() => {
        const fetchCohorts = async () => {
            try {
                const cohorts = await apiGet<Cohort[]>("/api/v1/academy/cohorts?status=open", { auth: true });
                setOpenCohorts(cohorts);
            } catch {
                setOpenCohorts([]);
            }
        };
        fetchCohorts();
    }, []);

    // Computed membership status
    const now = Date.now();
    const communityActive = useMemo(() => {
        const until = member?.membership?.community_paid_until;
        if (!until) return false;
        return new Date(until).getTime() > now;
    }, [member, now]);

    const clubActive = useMemo(() => {
        const until = member?.membership?.club_paid_until;
        if (!until) return false;
        return new Date(until).getTime() > now;
    }, [member, now]);

    // Loading state
    if (loading) {
        return <LoadingCard text="Loading billing..." />;
    }

    // Processing payment return - but don't block forever
    const shouldShowPaymentLoading = isPaystackReturn &&
        !verificationError &&
        !verificationTimedOut &&
        (!returnedPayment || returnedPayment.status === "pending" || (returnedPayment.status === "paid" && !returnedPayment.entitlement_applied_at));

    if (shouldShowPaymentLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-slate-900">Confirming Payment</h1>
                <LoadingCard text={returnedPayment?.status === "paid" ? "Activating membership..." : "Confirming payment..."} />
                <p className="text-center text-sm text-slate-500">This usually takes just a few seconds...</p>
            </div>
        );
    }

    const communityFee = pricing?.community_annual ?? 20000;

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Membership & Billing</h1>
                <p className="text-slate-600">
                    Manage your memberships and upgrade when you're ready.
                </p>
            </header>

            {/* Verification Error Alert */}
            {isPaystackReturn && verificationError && (
                <Alert variant="error" title="Payment verification issue">
                    {verificationError}. Your payment may still have been processed. Please check your email or contact support if the issue persists.
                </Alert>
            )}

            {/* Verification Timeout Alert */}
            {isPaystackReturn && verificationTimedOut && !returnedPayment?.entitlement_applied_at && (
                <Alert variant="info" title="Verification taking longer than expected">
                    Payment verification is still processing. Your membership will be activated automatically once complete. You can refresh this page to check status.
                </Alert>
            )}

            {/* Success Banner */}
            {isPaystackReturn && returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at && (() => {
                const purpose = returnedPayment.payment_metadata?.purpose?.toLowerCase() || "";
                const isClub = purpose.includes("club");
                const isAcademy = purpose.includes("academy");

                let title = "Welcome to Community! 🎉";
                let description = "Your membership has been activated. You now have full access to member features.";

                if (isClub) {
                    title = "Club is now active! 🎉";
                    description = "You can now book sessions and access all Club features.";
                } else if (isAcademy) {
                    title = "Academy enrollment confirmed! 🎉";
                    description = "You're enrolled! Check your email for cohort details and next steps.";
                }

                return (
                    <Alert variant="success" title={title}>
                        {description}
                    </Alert>
                );
            })()}

            {/* Error Banner */}
            {isPaystackReturn && returnedPayment?.entitlement_error && (
                <Alert variant="error" title="Payment issue">
                    Payment confirmed but activation failed: {returnedPayment.entitlement_error}
                </Alert>
            )}

            {/* ============================================================ */}
            {/* COMMUNITY CARD */}
            {/* ============================================================ */}
            <Card className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Community</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Annual membership that unlocks all member features.
                        </p>
                    </div>
                    <span className="text-sm text-slate-500">{formatCurrency(communityFee)}/year</span>
                </div>

                <dl className="grid gap-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <dt className="text-slate-600">Status:</dt>
                        <dd className={`col-span-2 font-medium ${communityActive ? "text-emerald-600" : "text-slate-500"}`}>
                            {communityActive ? "✓ Active" : "Inactive"}
                        </dd>
                    </div>
                    {communityActive && (
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Valid until:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">
                                {formatDate(member?.membership?.community_paid_until)}
                            </dd>
                        </div>
                    )}
                </dl>

                {communityActive ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                        <p className="font-medium">Your Community membership is active!</p>
                        <p className="mt-1 text-emerald-600">
                            You have full access to member features.
                        </p>
                    </div>
                ) : (
                    <Link href="/checkout?purpose=community">
                        <Button>Activate Community ({formatCurrency(communityFee)})</Button>
                    </Link>
                )}
            </Card>

            {/* ============================================================ */}
            {/* CLUB CARD */}
            {/* ============================================================ */}
            {clubActive ? (
                <Card className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Club</h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Recurring membership for regular sessions with coaches.
                            </p>
                        </div>
                    </div>

                    <dl className="grid gap-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Status:</dt>
                            <dd className="col-span-2 font-medium text-emerald-600">✓ Active</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Valid until:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">
                                {formatDate(member?.membership?.club_paid_until)}
                            </dd>
                        </div>
                    </dl>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                        <p className="font-medium">Your Club membership is active!</p>
                        <p className="mt-1 text-emerald-600">
                            You can book sessions and access all Club features.
                        </p>
                    </div>
                </Card>
            ) : communityActive ? (
                <Card className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Want to join Club?</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Get access to regular swimming sessions with coaches. Pay quarterly, bi-annually, or annually.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <Link href="/upgrade/club/readiness">
                            <Button>Upgrade to Club</Button>
                        </Link>
                        <Link href="/membership" className="text-sm text-cyan-600 hover:text-cyan-800">
                            How it works →
                        </Link>
                    </div>
                </Card>
            ) : null}

            {/* ============================================================ */}
            {/* ACADEMY CARD */}
            {/* ============================================================ */}
            {communityActive && (
                <Card className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Want to join Academy?</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Structured swimming programs with expert coaches. Complete your goals faster with personalized training.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <Link href="/upgrade/academy/details">
                            <Button>Enroll in Academy</Button>
                        </Link>
                        <Link href="/academy" className="text-sm text-cyan-600 hover:text-cyan-800">
                            How it works →
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}
