"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Member = {
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    membership_tier?: string | null;
    membership_tiers?: string[] | null;
    requested_membership_tiers?: string[] | null;
    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    location_preference?: string[] | null;
    time_of_day_availability?: string[] | null;
    availability_slots?: string[] | null;
};

type PaymentIntent = {
    reference: string;
    amount: number;
    currency: string;
    purpose: string;
    status: string;
    checkout_url?: string | null;
    created_at: string;
};

type PaymentRecord = {
    id: string;
    reference: string;
    status: string;
    provider?: string | null;
    provider_reference?: string | null;
    paid_at?: string | null;
    entitlement_applied_at?: string | null;
    entitlement_error?: string | null;
};

function parseDateMs(value: any): number | null {
    if (!value) return null;
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? ms : null;
}

function formatDate(value?: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BillingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const required = searchParams.get("required");
    const provider = searchParams.get("provider");
    const providerReference = searchParams.get("reference") || searchParams.get("trxref");

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activatingCommunity, setActivatingCommunity] = useState(false);
    const [activatingClub, setActivatingClub] = useState(false);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
    const [communityIntent, setCommunityIntent] = useState<PaymentIntent | null>(null);
    const [clubIntent, setClubIntent] = useState<PaymentIntent | null>(null);
    const [clubBillingCycle, setClubBillingCycle] = useState<"monthly" | "quarterly" | "biannual" | "annual">("monthly");
    const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(null);

    const fetchMember = useCallback(async () => {
        return await apiGet<Member>("/api/v1/members/me", { auth: true });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMember();
            setMember(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load billing.");
        } finally {
            setLoading(false);
        }
    }, [fetchMember]);

    const refreshMember = useCallback(async () => {
        try {
            const data = await fetchMember();
            setMember(data);
        } catch {
            // Silent refresh: keep current UI state
        }
    }, [fetchMember]);

    const refreshReturnedPayment = useCallback(async (reference: string) => {
        try {
            const all = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
            const match = all.find((p) => p.reference === reference) || null;
            setReturnedPayment(match);
        } catch {
            // Silent refresh
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const now = Date.now();
    const communityActive = useMemo(() => {
        const until = parseDateMs(member?.community_paid_until);
        return until !== null && until > now;
    }, [member, now]);

    const clubActive = useMemo(() => {
        const until = parseDateMs(member?.club_paid_until);
        return until !== null && until > now;
    }, [member, now]);

    const approvedTiers = useMemo(() => {
        const tiers = (member?.membership_tiers && member.membership_tiers.length > 0)
            ? member.membership_tiers
            : member?.membership_tier
                ? [member.membership_tier]
                : ["community"];
        return tiers.map((t) => String(t).toLowerCase());
    }, [member]);

    const requestedTiers = useMemo(
        () => (member?.requested_membership_tiers || []).map((t) => String(t).toLowerCase()),
        [member]
    );

    const showClubSection = useMemo(() => {
        return (
            requestedTiers.includes("club") ||
            requestedTiers.includes("academy") ||
            approvedTiers.includes("club") ||
            approvedTiers.includes("academy")
        );
    }, [approvedTiers, requestedTiers]);

    const clubReadinessComplete = useMemo(() => {
        if (!member) return false;
        const hasSafetyLogistics = Boolean(
            member.emergency_contact_name &&
            member.emergency_contact_relationship &&
            member.emergency_contact_phone &&
            member.location_preference &&
            member.location_preference.length > 0 &&
            member.time_of_day_availability &&
            member.time_of_day_availability.length > 0
        );
        const hasAvailability = Boolean(
            member.availability_slots && member.availability_slots.length > 0
        );
        return hasSafetyLogistics && hasAvailability;
    }, [member]);

    const missingClubRequirements = useMemo(() => {
        if (!member) return [];
        const missing: string[] = [];
        if (!member.emergency_contact_name || !member.emergency_contact_relationship || !member.emergency_contact_phone) {
            missing.push("Emergency contact");
        }
        if (!member.location_preference || member.location_preference.length === 0) {
            missing.push("Preferred locations");
        }
        if (!member.time_of_day_availability || member.time_of_day_availability.length === 0) {
            missing.push("Time of day availability");
        }
        if (!member.availability_slots || member.availability_slots.length === 0) {
            missing.push("Weekly availability");
        }
        return missing;
    }, [member]);

    const clubApproved = approvedTiers.includes("club") || approvedTiers.includes("academy");
    const canActivateClub = communityActive && (clubApproved || clubReadinessComplete);

    const verifyPaystackPayment = useCallback(async (reference: string) => {
        setVerifyingPayment(true);
        try {
            await apiPost(`/api/v1/payments/paystack/verify/${encodeURIComponent(reference)}`, undefined, { auth: true });
            toast.success("Payment verified");
            await refreshMember();
            await refreshReturnedPayment(reference);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Unable to verify payment.";
            toast.error(message);
        } finally {
            setVerifyingPayment(false);
        }
    }, [refreshMember, refreshReturnedPayment]);

    const allowManualVerify = process.env.NODE_ENV !== "production";

    const activateCommunity = async () => {
        setActivatingCommunity(true);
        try {
            const intent = await apiPost<PaymentIntent>(
                "/api/v1/payments/intents",
                { purpose: "community_annual", years: 1, currency: "NGN" },
                { auth: true }
            );
            setCommunityIntent(intent);
            if (intent.checkout_url) {
                window.location.href = intent.checkout_url;
                return;
            }
            toast.success(`Payment reference created: ${intent.reference}`);
        } catch (e) {
            toast.error("Failed to start Community payment");
        } finally {
            setActivatingCommunity(false);
        }
    };

    const activateClub = async () => {
        setActivatingClub(true);
        try {
            const intent = await apiPost<PaymentIntent>(
                "/api/v1/payments/intents",
                { purpose: "club_monthly", club_billing_cycle: clubBillingCycle, months: 1, currency: "NGN" },
                { auth: true }
            );
            setClubIntent(intent);
            if (intent.checkout_url) {
                window.location.href = intent.checkout_url;
                return;
            }
            toast.success(`Payment reference created: ${intent.reference}`);
        } catch (e) {
            toast.error("Failed to start Club payment");
        } finally {
            setActivatingClub(false);
        }
    };

    useEffect(() => {
        if (provider === "paystack" && providerReference) {
            refreshReturnedPayment(providerReference);
        }
    }, [provider, providerReference, refreshReturnedPayment]);

    useEffect(() => {
        if (provider !== "paystack" || !providerReference) return;
        if (communityActive) {
            router.replace("/dashboard/billing");
            return;
        }

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 10;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const tick = async () => {
            if (cancelled) return;
            attempts += 1;
            await refreshReturnedPayment(providerReference);
            await refreshMember();
            if (attempts >= maxAttempts) return;
            timeoutId = setTimeout(tick, 2500);
        };

        // Small delay to give the webhook time to arrive.
        timeoutId = setTimeout(tick, 1500);
        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [communityActive, provider, providerReference, refreshMember, refreshReturnedPayment, router]);

    useEffect(() => {
        if (provider !== "paystack" || !providerReference) return;
        if (communityActive) return;
        if (autoVerifyAttempted) return;

        setAutoVerifyAttempted(true);
        const timer = window.setTimeout(() => {
            verifyPaystackPayment(providerReference);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [autoVerifyAttempted, communityActive, provider, providerReference, verifyPaystackPayment]);

    if (loading) return <LoadingCard text="Loading billing..." />;

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="error" title="Billing error">
                    {error}
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Membership & Billing</h1>
                <p className="text-slate-600">
                    Activate Community to unlock member features. Club and Academy are add-ons that you activate when you’re ready.
                </p>
            </header>

            {provider === "paystack" && providerReference && !communityActive && (
                <Alert
                    variant="info"
                    title={returnedPayment?.status === "paid" ? "Payment received" : "Waiting for payment confirmation"}
                >
                    Reference: <span className="font-mono">{providerReference}</span>.{" "}
                    {returnedPayment?.status === "paid" ? (
                        returnedPayment.entitlement_applied_at ? (
                            <>Membership activation is complete. This page will refresh shortly.</>
                        ) : returnedPayment.entitlement_error ? (
                            <>Payment is marked paid, but activation failed: {returnedPayment.entitlement_error}</>
                        ) : (
                            <>Payment is confirmed on Paystack. We’re activating your membership now (may take a moment).</>
                        )
                    ) : (
                        <>Paystack will notify SwimBuddz via webhook after a successful payment.</>
                    )}
                    <span className="inline-flex items-center">
                        <Button
                            type="button"
                            variant="secondary"
                            className="ml-2"
                            onClick={async () => {
                                await refreshReturnedPayment(providerReference);
                                await refreshMember();
                            }}
                        >
                            Refresh status
                        </Button>
                    </span>
                    {allowManualVerify ? (
                        <span className="inline-flex items-center">
                            <Button
                                type="button"
                                variant="secondary"
                                className="ml-2"
                                onClick={() => verifyPaystackPayment(providerReference)}
                                disabled={verifyingPayment}
                            >
                                {verifyingPayment ? "Verifying..." : "Verify payment"}
                            </Button>
                        </span>
                    ) : null}
                </Alert>
            )}

            {required === "community" && !communityActive && (
                <Alert variant="info" title="Community activation required">
                    Activate your annual Community membership to continue.
                </Alert>
            )}
            {required === "club" && !clubActive && (
                <Alert variant="info" title="Club activation required">
                    Your Club access is inactive. Reactivate to continue.
                </Alert>
            )}

            <Card className="p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Community (₦5,000 / year)</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        This commitment fee keeps SwimBuddz high-quality and unlocks member features.
                    </p>
                </div>

                <dl className="grid gap-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <dt className="text-slate-600">Status:</dt>
                        <dd className={`col-span-2 font-medium ${communityActive ? "text-emerald-600" : "text-slate-900"}`}>
                            {communityActive ? "✓ Active" : "Inactive"}
                        </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <dt className="text-slate-600">Valid until:</dt>
                        <dd className="col-span-2 font-medium text-slate-900">
                            {communityActive
                                ? formatDate(member?.community_paid_until || null)
                                : member?.community_paid_until
                                    ? formatDate(member?.community_paid_until)
                                    : "After activation"}
                        </dd>
                    </div>
                </dl>

                {!communityActive && (
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={activateCommunity} disabled={activatingCommunity}>
                            {activatingCommunity ? "Processing..." : "Pay for Community (₦5,000)"}
                        </Button>
                    </div>
                )}

                {communityActive && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                        <p className="font-medium">Your Community membership is active!</p>
                        <p className="mt-1 text-emerald-600">
                            You have full access to member features. Renewal option will appear when your membership nears expiration.
                        </p>
                    </div>
                )}

                {communityIntent && (
                    <Alert
                        variant="info"
                        title="Payment initiated"
                    >
                        Reference: <span className="font-mono">{communityIntent.reference}</span>. Once payment is verified, your Community access will activate.
                    </Alert>
                )}

                {!communityActive && (
                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="font-semibold text-slate-900 mb-2">Locked until active</div>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Member directory</li>
                            <li>WhatsApp group access</li>
                            <li>Event RSVPs and community content</li>
                            <li>Session booking</li>
                        </ul>
                    </div>
                )}
            </Card>

            {showClubSection ? (
                <Card className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Club</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Club is a recurring membership you can pause anytime. When inactive, you keep Community access (if active).
                        </p>
                    </div>

                    <dl className="grid gap-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Status:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">{clubActive ? "Active" : "Inactive"}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Valid until:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">
                                {clubActive
                                    ? formatDate(member?.club_paid_until || null)
                                    : member?.club_paid_until
                                        ? formatDate(member?.club_paid_until)
                                        : "After activation"}
                            </dd>
                        </div>
                    </dl>

                    {!canActivateClub ? (
                        <Alert variant="info" title="Club not available yet">
                            {communityActive
                                ? `Complete onboarding to unlock payment: ${missingClubRequirements.join(", ")}.`
                                : "Activate Community first, then complete Club readiness in onboarding to unlock payment."}
                        </Alert>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: "monthly" as const, label: "Monthly (₦15,000)" },
                                    { key: "quarterly" as const, label: "Quarterly (₦42,500)" },
                                    { key: "biannual" as const, label: "Bi-annual (₦80,000)" },
                                    { key: "annual" as const, label: "Annual (₦150,000)" },
                                ].map((opt) => (
                                    <Button
                                        key={opt.key}
                                        variant={clubBillingCycle === opt.key ? "primary" : "secondary"}
                                        onClick={() => setClubBillingCycle(opt.key)}
                                        type="button"
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={activateClub} disabled={activatingClub}>
                                    {activatingClub ? "Processing..." : "Pay for Club"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {clubIntent && (
                        <Alert
                            variant="info"
                            title="Payment initiated"
                        >
                            Reference: <span className="font-mono">{clubIntent.reference}</span>. Once payment is verified, your Club access will activate.
                        </Alert>
                    )}
                </Card>
            ) : (
                <Card className="p-6 space-y-3">
                    <h2 className="text-lg font-semibold text-slate-900">Want to join Club?</h2>
                    <p className="text-sm text-slate-600">
                        Club is a recurring membership for swimmers who want regular sessions. You’ll complete readiness first, then activate Club when you’re ready.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/register?upgrade=true">
                            <Button>Request Club upgrade</Button>
                        </Link>
                        <Link href="/membership">
                            <Button variant="secondary">How it works</Button>
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}
