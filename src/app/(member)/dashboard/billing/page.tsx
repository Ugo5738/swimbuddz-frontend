"use client";

import { AcademyReadinessModal } from "@/components/billing/AcademyReadinessModal";
import { ClubReadinessModal } from "@/components/billing/ClubReadinessModal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { savePaymentIntentCache } from "@/lib/paymentCache";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Member = {
    id?: string | null;
    email?: string | null;
    // Nested membership data
    membership?: {
        community_paid_until?: string | null;
        club_paid_until?: string | null;
        active_tiers?: string[] | null;
        requested_tiers?: string[] | null;
        primary_tier?: string | null;
        pending_payment_reference?: string | null;
        club_notes?: string | null;
    } | null;
    // Nested emergency contact
    emergency_contact?: {
        name?: string | null;
        contact_relationship?: string | null;
        phone?: string | null;
    } | null;
    // Nested availability
    availability?: {
        preferred_locations?: string[] | null;
        preferred_times?: string[] | null;
        available_days?: string[] | null;
    } | null;
};

type Cohort = {
    id: string;
    name: string;
    program_name?: string;
    start_date?: string;
    end_date?: string;
    price?: number;
    status?: string;
};

type PaymentIntent = {
    reference: string;
    amount: number;
    currency: string;
    purpose: string;
    status: string;
    checkout_url?: string | null;
    created_at: string;
    // Community extension info (for Club payments)
    requires_community_extension?: boolean;
    community_extension_months?: number;
    community_extension_amount?: number;
    total_with_extension?: number | null;
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
    payment_metadata?: {
        paystack?: {
            authorization_url?: string;
            access_code?: string;
        };
    } | null;
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
    const [clubBillingCycle, setClubBillingCycle] = useState<"quarterly" | "biannual" | "annual">("quarterly");
    const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(null);
    const [activatingClubBundle, setActivatingClubBundle] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PaymentRecord | null>(null);
    const [discountCode, setDiscountCode] = useState("");
    const [showClubReadinessModal, setShowClubReadinessModal] = useState(false);
    const [showAcademyReadinessModal, setShowAcademyReadinessModal] = useState(false);
    const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);
    const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
    const [loadingCohorts, setLoadingCohorts] = useState(false);
    const [includeCommunityExtension, setIncludeCommunityExtension] = useState(true);
    const [extensionInfo, setExtensionInfo] = useState<{
        required: boolean;
        months: number;
        amount: number;
    } | null>(null);
    const router = useRouter();

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

    // Fetch pending payment if member has one (cross-device resumption)
    useEffect(() => {
        const pendingRef = member?.membership?.pending_payment_reference;
        if (!pendingRef) {
            setPendingPayment(null);
            return;
        }
        // Fetch payment details
        const fetchPending = async () => {
            try {
                const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
                const match = payments.find((p) => p.reference === pendingRef && p.status === "pending");
                setPendingPayment(match || null);
            } catch {
                setPendingPayment(null);
            }
        };
        fetchPending();
    }, [member?.membership?.pending_payment_reference]);

    const now = Date.now();
    const communityActive = useMemo(() => {
        const until = parseDateMs(member?.membership?.community_paid_until);
        return until !== null && until > now;
    }, [member, now]);

    const clubActive = useMemo(() => {
        const until = parseDateMs(member?.membership?.club_paid_until);
        return until !== null && until > now;
    }, [member, now]);

    // Fetch open cohorts for Community/Club members
    useEffect(() => {
        if (!communityActive) return;
        const fetchCohorts = async () => {
            setLoadingCohorts(true);
            try {
                const cohorts = await apiGet<Cohort[]>("/api/v1/academy/cohorts?status=open", { auth: true });
                setOpenCohorts(cohorts);
            } catch {
                setOpenCohorts([]);
            } finally {
                setLoadingCohorts(false);
            }
        };
        fetchCohorts();
    }, [communityActive]);

    const approvedTiers = useMemo(() => {
        const tiers = (member?.membership?.active_tiers && member.membership.active_tiers.length > 0)
            ? member.membership.active_tiers
            : member?.membership?.primary_tier
                ? [member.membership.primary_tier]
                : ["community"];
        return tiers.map((t) => String(t).toLowerCase());
    }, [member]);

    const requestedTiers = useMemo(
        () => (member?.membership?.requested_tiers || []).map((t) => String(t).toLowerCase()),
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

    // Check if Club payment would require Community extension
    useEffect(() => {
        if (!showClubSection || !communityActive) {
            setExtensionInfo(null);
            return;
        }
        const checkExtension = async () => {
            try {
                // Make a dry-run call to check extension  
                const intent = await apiPost<PaymentIntent>(
                    "/api/v1/payments/intents",
                    {
                        purpose: "club",
                        club_billing_cycle: clubBillingCycle,
                        months: 1,
                        currency: "NGN",
                        include_community_extension: false, // Dry run
                    },
                    { auth: true }
                );
                if (intent.requires_community_extension) {
                    setExtensionInfo({
                        required: true,
                        months: intent.community_extension_months || 0,
                        amount: intent.community_extension_amount || 0,
                    });
                } else {
                    setExtensionInfo(null);
                }
            } catch {
                setExtensionInfo(null);
            }
        };
        // Don't check on mount - only when billing cycle changes
        if (clubBillingCycle) {
            checkExtension();
        }
    }, [clubBillingCycle, showClubSection, communityActive]);

    const clubReadinessComplete = useMemo(() => {
        if (!member) return false;
        const hasSafetyLogistics = Boolean(
            member.emergency_contact?.name &&
            member.emergency_contact?.contact_relationship &&
            member.emergency_contact?.phone &&
            member.availability?.preferred_locations &&
            member.availability.preferred_locations.length > 0 &&
            member.availability?.preferred_times &&
            member.availability.preferred_times.length > 0
        );
        const hasAvailability = Boolean(
            member.availability?.available_days && member.availability.available_days.length > 0
        );
        return hasSafetyLogistics && hasAvailability;
    }, [member]);

    const missingClubRequirements = useMemo(() => {
        if (!member) return [];
        const missing: string[] = [];
        if (!member.emergency_contact?.name || !member.emergency_contact?.contact_relationship || !member.emergency_contact?.phone) {
            missing.push("Emergency contact");
        }
        if (!member.availability?.preferred_locations || member.availability.preferred_locations.length === 0) {
            missing.push("Preferred locations");
        }
        if (!member.availability?.preferred_times || member.availability.preferred_times.length === 0) {
            missing.push("Time of day availability");
        }
        if (!member.availability?.available_days || member.availability.available_days.length === 0) {
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

    const communityFee = 20000;
    const clubPricing: Record<typeof clubBillingCycle, number> = {
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
                { purpose: "community", years: 1, currency: "NGN", discount_code: discountCode || undefined },
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
                {
                    purpose: "club",
                    club_billing_cycle: clubBillingCycle,
                    months: 1,
                    currency: "NGN",
                    discount_code: discountCode || undefined,
                    include_community_extension: extensionInfo?.required && includeCommunityExtension,
                },
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
                { purpose: "club_bundle", years: 1, club_billing_cycle: clubBillingCycle, months: 1, currency: "NGN", discount_code: discountCode || undefined },
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

    const clubCycleLabel = clubBillingCycle === "quarterly"
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

            {/* Cross-device pending payment resume */}
            {pendingPayment && !returnedPayment && (
                <Card className="p-6 space-y-4 border-amber-200 bg-amber-50">
                    <div>
                        <h2 className="text-lg font-semibold text-amber-900">Resume Payment</h2>
                        <p className="text-sm text-amber-700 mt-1">
                            You have an incomplete payment from a previous session.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => verifyPaystackPayment(pendingPayment.reference)}
                            disabled={verifyingPayment}
                        >
                            {verifyingPayment ? "Verifying..." : "Check Payment Status"}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                // Try to get checkout URL from payment metadata
                                const checkoutUrl = pendingPayment.payment_metadata?.paystack?.authorization_url;
                                if (checkoutUrl) {
                                    window.location.href = checkoutUrl;
                                } else {
                                    toast.error("Unable to resume payment. Please start a new one.");
                                }
                            }}
                        >
                            Resume Payment
                        </Button>
                    </div>
                    <p className="text-xs text-amber-600">
                        Reference: <span className="font-mono">{pendingPayment.reference}</span>
                    </p>
                </Card>
            )}

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

                        {/* Discount Code Input */}
                        <div className="rounded-lg border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
                            <label htmlFor="discount-code-activation" className="block text-sm font-medium text-purple-900 mb-2">
                                Have a discount code?
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="discount-code-activation"
                                    type="text"
                                    value={discountCode}
                                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code (e.g., SUMMER25)"
                                    className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent uppercase"
                                />
                                {discountCode && (
                                    <button
                                        type="button"
                                        onClick={() => setDiscountCode("")}
                                        className="px-3 text-sm text-purple-600 hover:text-purple-800"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {discountCode && (
                                <p className="mt-2 text-xs text-purple-700">
                                    Discount code "{discountCode}" will be applied at checkout.
                                </p>
                            )}
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
                <div className="flex flex-col gap-6">
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

                    {/* Discount Code Input - only show if there are pending payments */}
                    {(!communityActive || (showClubSection && !clubActive)) && (
                        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="flex-1">
                                    <label htmlFor="discount-code" className="block text-sm font-medium text-purple-900 mb-1">
                                        Have a discount code?
                                    </label>
                                    <input
                                        id="discount-code"
                                        type="text"
                                        value={discountCode}
                                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                        placeholder="Enter code (e.g., SUMMER25)"
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent uppercase"
                                    />
                                </div>
                                {discountCode && (
                                    <button
                                        onClick={() => setDiscountCode("")}
                                        className="text-sm text-purple-600 hover:text-purple-800"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {discountCode && (
                                <p className="mt-2 text-xs text-purple-700">
                                    Discount code "{discountCode}" will be applied at checkout.
                                </p>
                            )}
                        </Card>
                    )}

                    {/* Community Card - shows AFTER Club when user is activating Club */}
                    <Card className={`p-6 space-y-4 ${communityActive && showClubSection && !clubActive ? "order-2" : "order-1"}`}>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Community (₦20,000 / year)</h2>
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
                                        ? formatDate(member?.membership?.community_paid_until || null)
                                        : member?.membership?.community_paid_until
                                            ? formatDate(member?.membership?.community_paid_until)
                                            : "After activation"}
                                </dd>
                            </div>
                        </dl>

                        {!communityActive && (
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={activateCommunity} disabled={activatingCommunity}>
                                    {activatingCommunity ? "Processing..." : "Pay for Community (₦20,000)"}
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
                        <Card className={`p-6 space-y-4 ${communityActive && !clubActive ? "order-1" : "order-2"}`}>
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
                                            ? formatDate(member?.membership?.club_paid_until || null)
                                            : member?.membership?.club_paid_until
                                                ? formatDate(member?.membership?.club_paid_until)
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

                                    {/* Community Extension Notice */}
                                    {extensionInfo?.required && (
                                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                                            <p className="text-sm text-amber-800 mb-2">
                                                <strong>Community extension needed:</strong> Your Club membership would extend {extensionInfo.months} month(s) beyond your Community expiry.
                                            </p>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={includeCommunityExtension}
                                                    onChange={(e) => setIncludeCommunityExtension(e.target.checked)}
                                                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="text-sm text-amber-800">
                                                    Include Community extension (+₦{extensionInfo.amount.toLocaleString()})
                                                </span>
                                            </label>
                                            {!includeCommunityExtension && (
                                                <p className="text-xs text-amber-600 mt-2">
                                                    ⚠️ Without extension, your Club access will end when Community expires.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={activateClub} disabled={activatingClub}>
                                            {activatingClub ? "Processing..." : `Pay for Club${extensionInfo?.required && includeCommunityExtension ? ` + Extension` : ""}`}
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
                                Club is a recurring membership for swimmers who want regular sessions. Complete your availability, then choose a billing plan.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={() => setShowClubReadinessModal(true)}>
                                    Upgrade to Club
                                </Button>
                                <Link href="/membership">
                                    <Button variant="secondary">How it works</Button>
                                </Link>
                            </div>
                        </Card>
                    )}

                    {/* Academy Explore Section - always visible for Community members */}
                    {communityActive && (
                        <Card className="p-6 space-y-4 order-3">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Academy</h2>
                                <p className="text-sm text-slate-600 mt-1">
                                    Structured swimming programs with expert coaches. Complete your goals faster with personalized training.
                                </p>
                            </div>
                            {loadingCohorts ? (
                                <p className="text-sm text-slate-500">Loading cohorts...</p>
                            ) : openCohorts.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {openCohorts.map((cohort) => (
                                        <div
                                            key={cohort.id}
                                            className="p-4 border border-slate-200 rounded-lg hover:border-cyan-300 transition-colors"
                                        >
                                            <h3 className="font-medium text-slate-900">{cohort.name}</h3>
                                            {cohort.program_name && (
                                                <p className="text-sm text-slate-500">{cohort.program_name}</p>
                                            )}
                                            {cohort.start_date && (
                                                <p className="text-sm text-slate-500">
                                                    Starts: {formatDate(cohort.start_date)}
                                                </p>
                                            )}
                                            {cohort.price !== undefined && cohort.price > 0 && (
                                                <p className="text-sm font-medium text-cyan-700 mt-1">
                                                    ₦{cohort.price.toLocaleString()}
                                                </p>
                                            )}
                                            <Button
                                                size="sm"
                                                className="mt-3"
                                                onClick={() => {
                                                    setSelectedCohort(cohort);
                                                    setShowAcademyReadinessModal(true);
                                                }}
                                            >
                                                Enroll
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-slate-50 p-4">
                                    <p className="text-sm text-slate-600">
                                        No open cohorts at this time. New cohorts are announced regularly.
                                    </p>
                                    <Link href="/academy" className="text-sm text-cyan-600 hover:text-cyan-800 underline">
                                        Learn more about Academy programs →
                                    </Link>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Club Readiness Modal */}
            <ClubReadinessModal
                isOpen={showClubReadinessModal}
                onClose={() => setShowClubReadinessModal(false)}
                onComplete={() => {
                    setShowClubReadinessModal(false);
                    // Refresh member data and show Club section
                    load().then(() => {
                        toast.success("Club readiness complete! Now choose your billing plan.");
                    });
                }}
                initialData={{
                    availabilitySlots: member?.availability?.available_days || [],
                    clubNotes: member?.membership?.club_notes || "",
                }}
                onSave={async (data) => {
                    await apiPatch("/api/v1/members/me", {
                        availability: { available_days: data.available_days },
                        membership: {
                            club_notes: data.club_notes,
                            requested_tiers: [...(member?.membership?.requested_tiers || []), "club"].filter((v, i, a) => a.indexOf(v) === i),
                        },
                    }, { auth: true });
                }}
            />


            {/* Academy Readiness Modal */}
            <AcademyReadinessModal
                isOpen={showAcademyReadinessModal}
                onClose={() => {
                    setShowAcademyReadinessModal(false);
                    setSelectedCohort(null);
                }}
                onComplete={async () => {
                    setShowAcademyReadinessModal(false);
                    if (!selectedCohort) return;
                    // Create enrollment and payment intent
                    try {
                        const enrollment = await apiPost<{ id: string }>(
                            "/api/v1/academy/enrollments",
                            { cohort_id: selectedCohort.id },
                            { auth: true }
                        );
                        const intent = await apiPost<PaymentIntent>(
                            "/api/v1/payments/intents",
                            {
                                purpose: "academy_cohort",
                                enrollment_id: enrollment.id,
                                discount_code: discountCode || undefined,
                            },
                            { auth: true }
                        );
                        if (intent.checkout_url) {
                            savePaymentIntentCache(intent, member?.id || "");
                            window.location.href = intent.checkout_url;
                        } else {
                            toast.success("Enrollment created! Payment pending.");
                        }
                    } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed to create enrollment");
                    }
                    setSelectedCohort(null);
                }}
                onSave={async (data) => {
                    await apiPatch("/api/v1/members/me", {
                        membership: {
                            academy_skill_assessment: data.academy_skill_assessment,
                            academy_goals: data.academy_goals,
                            academy_preferred_coach_gender: data.academy_preferred_coach_gender,
                            academy_lesson_preference: data.academy_lesson_preference,
                        },
                    }, { auth: true });
                }}
            />
        </div>
    );
}
