"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { savePaymentIntentCache } from "@/lib/paymentCache";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Member = {
    id?: string | null;
    email?: string | null;
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
    const required = searchParams.get("required");
    const provider = searchParams.get("provider");
    const providerReference = searchParams.get("reference") || searchParams.get("trxref");
    const activation = searchParams.get("activation");

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activatingCommunity, setActivatingCommunity] = useState(false);
    const [activatingClub, setActivatingClub] = useState(false);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
    const [communityIntent, setCommunityIntent] = useState<PaymentIntent | null>(null);
    const [clubIntent, setClubIntent] = useState<PaymentIntent | null>(null);
    const [clubActivationIntent, setClubActivationIntent] = useState<PaymentIntent | null>(null);
    const [clubBillingCycle, setClubBillingCycle] = useState<"monthly" | "quarterly" | "biannual" | "annual">("monthly");
    const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(null);
    const [activatingClubBundle, setActivatingClubBundle] = useState(false);

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
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

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

    const activationMode = activation === "club" ? "club" : activation === "community" ? "community" : null;
    const clubApproved = approvedTiers.includes("club") || approvedTiers.includes("academy");
    const canActivateClub = communityActive && (clubApproved || clubReadinessComplete);
    const canActivateClubBundle = clubApproved || clubReadinessComplete;
    const shouldSuggestClubBundle = wantsClub && clubReadinessComplete && !clubActive && !communityActive;
    const effectiveActivationMode = activationMode ?? (shouldSuggestClubBundle ? "club" : null);
    const showClubIntentNotice = wantsClub && !clubActive && !effectiveActivationMode;
    const showClubActivationCheckout = effectiveActivationMode === "club" && canActivateClubBundle && !clubActive;
    const showCommunityActivationCheckout = effectiveActivationMode === "community" && !communityActive;
    const showActivationCheckout = showClubActivationCheckout || showCommunityActivationCheckout;

    const communityFee = 5000;
    const clubPricing: Record<typeof clubBillingCycle, number> = {
        monthly: 15000,
        quarterly: 42500,
        biannual: 80000,
        annual: 150000,
    };
    const clubFee = clubPricing[clubBillingCycle];
    const totalDueToday = communityActive ? clubFee : communityFee + clubFee;

    const paymentMemberKey = member?.id ? String(member.id) : member?.email ? String(member.email) : "me";
    const paymentAttemptKey = `swimbuddz:onboarding:payment_attempted:${paymentMemberKey}`;

    const markPaymentAttempted = useCallback(() => {
        try {
            window.sessionStorage.setItem(paymentAttemptKey, "1");
        } catch {
            // Ignore sessionStorage failures.
        }
    }, [paymentAttemptKey]);

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

    const activateCommunity = async () => {
        setActivatingCommunity(true);
        try {
            const intent = await apiPost<PaymentIntent>(
                "/api/v1/payments/intents",
                { purpose: "community_annual", years: 1, currency: "NGN" },
                { auth: true }
            );
            setCommunityIntent(intent);
            const paymentMemberKey = member?.id ? String(member.id) : member?.email ? String(member.email) : "me";
            savePaymentIntentCache(intent, paymentMemberKey);
            if (intent.checkout_url) {
                markPaymentAttempted();
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
                markPaymentAttempted();
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

    const activateClubWithCommunity = async () => {
        setActivatingClubBundle(true);
        try {
            const intent = await apiPost<PaymentIntent>(
                "/api/v1/payments/intents",
                { purpose: "club_activation", years: 1, club_billing_cycle: clubBillingCycle, months: 1, currency: "NGN" },
                { auth: true }
            );
            setClubActivationIntent(intent);
            const memberKey = member?.id ? String(member.id) : member?.email ? String(member.email) : "me";
            savePaymentIntentCache(intent, memberKey);
            if (intent.checkout_url) {
                markPaymentAttempted();
                window.location.href = intent.checkout_url;
                return;
            }
            toast.success(`Payment reference created: ${intent.reference}`);
        } catch (e) {
            toast.error("Failed to start Club activation payment");
        } finally {
            setActivatingClubBundle(false);
        }
    };

    useEffect(() => {
        if (provider === "paystack" && providerReference) {
            refreshReturnedPayment(providerReference);
        }
    }, [provider, providerReference, refreshReturnedPayment]);

    useEffect(() => {
        if (provider !== "paystack" || !providerReference) return;
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
    }, [provider, providerReference, refreshMember, refreshReturnedPayment]);

    useEffect(() => {
        if (provider !== "paystack" || !providerReference) return;
        if (autoVerifyAttempted) return;
        if (returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at) return;

        setAutoVerifyAttempted(true);
        const timer = window.setTimeout(() => {
            verifyPaystackPayment(providerReference);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [
        autoVerifyAttempted,
        provider,
        providerReference,
        returnedPayment?.entitlement_applied_at,
        returnedPayment?.status,
        verifyPaystackPayment,
    ]);

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

    const isPaystackReturn = provider === "paystack" && providerReference;
    const paystackReturnProcessing = Boolean(
        isPaystackReturn && (
            !returnedPayment ||
            returnedPayment.status === "pending" ||
            (returnedPayment.status === "paid" && !returnedPayment.entitlement_applied_at && !returnedPayment.entitlement_error)
        )
    );

    const paystackStatusAlert = isPaystackReturn && (returnedPayment?.status === "failed" || returnedPayment?.entitlement_error) ? (
        <Alert
            variant="error"
            title="Payment issue"
        >
            Reference: <span className="font-mono">{providerReference}</span>.{" "}
            {returnedPayment?.entitlement_error
                ? `Payment is confirmed, but activation failed: ${returnedPayment.entitlement_error}`
                : "We couldn’t confirm this payment. Please try again from billing."}
        </Alert>
    ) : null;

    if (paystackReturnProcessing) {
        return (
            <div className="space-y-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900">Confirming your payment</h1>
                    <p className="text-slate-600">
                        This usually takes a few seconds.
                    </p>
                </header>
                <LoadingCard
                    text={returnedPayment?.status === "paid"
                        ? "Activating your membership..."
                        : "Confirming your payment..."}
                />
            </div>
        );
    }

    const clubCycleLabel = clubBillingCycle === "monthly"
        ? "Monthly"
        : clubBillingCycle === "quarterly"
            ? "Quarterly"
            : clubBillingCycle === "biannual"
                ? "Bi-annual"
                : "Annual";
    const formattedCommunityFee = `₦${communityFee.toLocaleString("en-NG")}`;
    const formattedClubFee = `₦${clubFee.toLocaleString("en-NG")}`;
    const formattedTotalDue = `₦${totalDueToday.toLocaleString("en-NG")}`;
    const clubActivationIntentToShow = communityActive ? clubIntent : clubActivationIntent;

    const showCommunityRequiredAlert = required === "community" && !communityActive && !effectiveActivationMode;
    const showClubRequiredAlert = required === "club" && !clubActive && !effectiveActivationMode;

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Membership & Billing</h1>
                <p className="text-slate-600">
                    Activate Community to unlock member features. Club and Academy are add-ons that you activate when you’re ready.
                </p>
            </header>

            {paystackStatusAlert}

            {showClubIntentNotice ? (
                <Alert variant="info" title="Club activation pending">
                    {communityActive
                        ? "You selected Club during signup. Choose a billing plan below to activate Club access."
                        : clubReadinessComplete
                            ? "You're ready to activate Club. Community membership is required and will be activated together."
                            : "You selected Club during signup. Activate Community first, then complete Club readiness to continue."}
                </Alert>
            ) : null}

            {showActivationCheckout ? (
                showCommunityActivationCheckout ? (
                    <Card className="p-6 space-y-5">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-slate-900">Review & activate Community</h2>
                            <p className="text-sm text-slate-600">
                                Confirm what you’re paying for before continuing to payment.
                            </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between py-1">
                                <span>Community membership (annual)</span>
                                <span className="font-medium text-slate-900">{formattedCommunityFee}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                                <span>Total due today</span>
                                <span>{formattedCommunityFee}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button onClick={activateCommunity} disabled={activatingCommunity}>
                                {activatingCommunity ? "Processing..." : `Pay ${formattedCommunityFee} & Activate Community`}
                            </Button>
                        </div>

                        <p className="text-xs text-slate-500">
                            Community membership is billed annually.
                        </p>

                        {communityIntent && (
                            <Alert variant="info" title="Payment initiated">
                                Reference: <span className="font-mono">{communityIntent.reference}</span>. Once payment is verified, your Community access will activate.
                            </Alert>
                        )}
                    </Card>
                ) : (
                    <Card className="p-6 space-y-5">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-slate-900">Review & activate Club</h2>
                            <p className="text-sm text-slate-600">
                                {communityActive
                                    ? "Confirm what you’re paying for before continuing to payment."
                                    : "Community membership is required and will be activated together."}
                            </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between py-1">
                                <span>Community membership (annual)</span>
                                <span className={communityActive ? "font-medium text-emerald-600" : "font-medium text-slate-900"}>{communityActive ? "✓ Paid" : formattedCommunityFee}</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span>Club membership ({clubCycleLabel.toLowerCase()})</span>
                                <span className="font-medium text-slate-900">{formattedClubFee}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                                <span>Total due today</span>
                                <span>{formattedTotalDue}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: "monthly" as const, label: "Monthly (₦15,000)" },
                                { key: "quarterly" as const, label: "Quarterly (₦42,500)" },
                                { key: "biannual" as const, label: "Bi-annual (₦80,000)" },
                                { key: "annual" as const, label: "Annual (₦150,000)" },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setClubBillingCycle(opt.key)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${clubBillingCycle === opt.key
                                        ? "bg-cyan-50 border-cyan-500 text-cyan-700"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={communityActive ? activateClub : activateClubWithCommunity}
                                disabled={activatingClubBundle || activatingClub}
                            >
                                {activatingClubBundle || activatingClub
                                    ? "Processing..."
                                    : `Pay ${formattedTotalDue} & Activate Club`}
                            </Button>
                        </div>
                        {!communityActive ? (
                            <Link
                                href="/dashboard/billing?activation=community"
                                className="text-sm text-slate-500 underline hover:text-slate-900"
                            >
                                Activate Community only
                            </Link>
                        ) : null}

                        <p className="text-xs text-slate-500">
                            Community membership is billed annually. Club renews {clubCycleLabel.toLowerCase()}.
                        </p>

                        {clubActivationIntentToShow && (
                            <Alert variant="info" title="Payment initiated">
                                Reference: <span className="font-mono">{clubActivationIntentToShow.reference}</span>. Once payment is verified, your Club access will activate.
                            </Alert>
                        )}
                    </Card>
                )
            ) : (
                <>
                    {showCommunityRequiredAlert && (
                        <Alert variant="info" title="Community activation required">
                            Activate your annual Community membership to continue.
                        </Alert>
                    )}
                    {showClubRequiredAlert && (
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
                                    <dd className={`col-span-2 font-medium ${clubActive ? "text-emerald-600" : "text-slate-900"}`}>{clubActive ? "✓ Active" : "Inactive"}</dd>
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

                            {clubActive ? (
                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                                    <p className="font-medium">Your Club membership is active!</p>
                                    <p className="mt-1 text-emerald-600">
                                        You have full Club access. Renewal options will appear when your membership nears expiration.
                                    </p>
                                </div>
                            ) : !canActivateClub ? (
                                <Alert variant="info" title="Club not available yet">
                                    {communityActive
                                        ? `Club activation is pending. Complete onboarding to unlock payment: ${missingClubRequirements.join(", ")}.`
                                        : "Club activation is pending. Activate Community first, then complete Club readiness in onboarding to unlock payment."}
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
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => setClubBillingCycle(opt.key)}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${clubBillingCycle === opt.key
                                                        ? "bg-cyan-50 border-cyan-500 text-cyan-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
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
                </>
            )}
        </div>
    );
}
