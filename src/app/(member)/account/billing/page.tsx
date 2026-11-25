"use client";

import { LoadingCard } from "@/components/ui/LoadingCard";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { useOptionalMemberProfile } from "@/lib/member-profile-context";
import { isTierPaid } from "@/lib/tiers";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AcademySection } from "./_billing/AcademySection";
import { FinancialOverview } from "./_billing/FinancialOverviewCard";
import type { ServerFinancialOverview } from "./_billing/serverFinancialOverview";
import { ClubCard } from "./_billing/ClubCard";
import { CommunityCard } from "./_billing/CommunityCard";
import { MembershipHistoryCard } from "./_billing/MembershipHistoryCard";
import { OutstandingSessionFeesCard } from "./_billing/OutstandingSessionFeesCard";
import { PaystackReturnAlerts } from "./_billing/PaystackReturnAlerts";
import { PendingTransfersCard } from "./_billing/PendingTransfersCard";
import { ProductPaymentReceipts } from "./_billing/ProductPaymentReceipts";
import { usePaystackReturn } from "./_billing/usePaystackReturn";
import type {
  Cohort,
  Enrollment,
  Member,
  MembershipHistory,
  PaymentRecord,
  PricingConfig,
  StoreCreditSummary,
  BubbleWallet,
} from "./types";
import { formatDate } from "./utils";

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get("returnTo");
  const requiredParam = searchParams.get("required")?.toLowerCase();
  const requiredTier =
    requiredParam === "community" || requiredParam === "club" || requiredParam === "academy"
      ? requiredParam
      : null;
  const providerReference = searchParams.get("reference") || searchParams.get("trxref");
  const isMembershipPaymentReference = providerReference?.startsWith("PAY-") ?? false;
  const isTopupReference = providerReference?.startsWith("TOP-") ?? false;
  const isPaystackReturn = Boolean(providerReference && isMembershipPaymentReference);

  const sharedProfile = useOptionalMemberProfile();
  const [fallbackMember, setFallbackMember] = useState<Member | null>(null);
  const member: Member | null = (sharedProfile?.data as Member | null) ?? fallbackMember;
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "history">("plans");
  const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [academyLoadError, setAcademyLoadError] = useState<string | null>(null);
  const [academyRefreshing, setAcademyRefreshing] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<PaymentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory | null>(null);
  const [storeCredits, setStoreCredits] = useState<StoreCreditSummary | null>(null);
  const [bubblesWallet, setBubblesWallet] = useState<BubbleWallet | null>(null);
  const [serverOverview, setServerOverview] = useState<ServerFinancialOverview | null>(null);
  const [obligationError, setObligationError] = useState(false);
  const [obligationRefreshing, setObligationRefreshing] = useState(false);

  const refetchShellMember = sharedProfile?.refetch;
  const hasSharedProfile = sharedProfile !== null;

  // Load pricing, payments, and membership history. Reuse MemberLayout's shared
  // /members/me profile when available to avoid duplicate profile queries (ADR-022).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memberData, pricingData, paymentsData, historyData] = await Promise.all([
        hasSharedProfile
          ? Promise.resolve(null)
          : apiGet<Member>("/api/v1/members/me", { auth: true }),
        apiGet<PricingConfig>("/api/v1/payments/pricing"),
        apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true }),
        apiGet<MembershipHistory>("/api/v1/members/me/membership-history", {
          auth: true,
        }).catch(() => null),
      ]);
      if (memberData) setFallbackMember(memberData);
      setPayments(paymentsData);
      setPricing(pricingData);
      setMembershipHistory(historyData);

      // Filter for pending manual transfers (pending, pending_review, or rejected)
      const pending = paymentsData.filter(
        (p) =>
          p.payment_method === "manual_transfer" &&
          (p.status === "pending" || p.status === "pending_review" || p.status === "failed")
      );
      setPendingTransfers(pending);
    } catch (e) {
      console.error("Failed to load billing data:", e);
    } finally {
      setLoading(false);
    }
  }, [hasSharedProfile]);

  const reloadAll = useCallback(async () => {
    refetchShellMember?.();
    await load();
  }, [load, refetchShellMember]);

  useEffect(() => {
    load();
  }, [load]);

  const { returnedPayment, verificationError, verificationTimedOut, walletSummary } =
    usePaystackReturn({
      providerReference,
      isPaystackReturn,
      isTopupReference,
      onPaymentVerified: reloadAll,
    });

  // Keep the blocked destination across the external Paystack round-trip.
  useEffect(() => {
    if (returnToParam?.startsWith("/") && !returnToParam.startsWith("//")) {
      sessionStorage.setItem("swimbuddz:membership-return-to", returnToParam);
    } else if (!providerReference) {
      // A normal visit to Billing starts a fresh payment journey; do not let
      // an abandoned, older access flow redirect a later unrelated payment.
      sessionStorage.removeItem("swimbuddz:membership-return-to");
    }
  }, [providerReference, returnToParam]);

  useEffect(() => {
    if (returnedPayment?.status !== "paid" || !returnedPayment.entitlement_applied_at) return;
    const stored = sessionStorage.getItem("swimbuddz:membership-return-to");
    if (!stored?.startsWith("/") || stored.startsWith("//")) return;
    sessionStorage.removeItem("swimbuddz:membership-return-to");
    const timeout = window.setTimeout(() => router.replace(stored), 1200);
    return () => window.clearTimeout(timeout);
  }, [returnedPayment, router]);

  // Load open cohorts for Academy section
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const cohorts = await apiGet<Cohort[]>("/api/v1/academy/cohorts/enrollable", {
          auth: true,
        });
        setOpenCohorts(cohorts);
      } catch {
        setOpenCohorts([]);
      }
    };
    fetchCohorts();
  }, []);

  // Refresh Academy balances independently of membership billing and when a
  // Paystack return completes. Never interpret an API error as zero debt.
  const fetchEnrollments = useCallback(async () => {
    setAcademyRefreshing(true);
    setAcademyLoadError(null);
    try {
      const enrollments = await apiGet<Enrollment[]>("/api/v1/academy/my-enrollments", {
        auth: true,
      });
      // The list endpoint includes frozen installments; fetch individual
      // details only when an existing plan unexpectedly lacks its rows.
      const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
          if (!enrollment.installments?.length &&
              ((enrollment.total_installments ?? 0) > 0 || enrollment.uses_installments)) {
            try {
              return await apiGet<Enrollment>(
                `/api/v1/academy/my-enrollments/${enrollment.id}`, { auth: true }
              );
            } catch {
              // Never provide a payment action against incomplete installment data.
              return enrollment;
            }
          }
          return enrollment;
        })
      );
      setMyEnrollments(enriched);
    } catch {
      setAcademyLoadError("Could not refresh your Academy installments. Please try again.");
    } finally {
      setAcademyRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchEnrollments(); }, [fetchEnrollments]);
  useEffect(() => {
    if (returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at) {
      void fetchEnrollments();
    }
  }, [returnedPayment?.status, returnedPayment?.entitlement_applied_at, fetchEnrollments]);

  // Optional financial sources are deliberately isolated; a failed source never
  // becomes a fabricated zero balance or blocks another payment method.
  const refreshFinancialSources = useCallback(async () => {
    setObligationRefreshing(true);
    try {
      const [credits, wallet, obligations] = await Promise.allSettled([
        apiGet<StoreCreditSummary>("/api/v1/store/credits/me", { auth: true }),
        apiGet<BubbleWallet>("/api/v1/wallet/me", { auth: true }),
        apiGet<ServerFinancialOverview>("/api/v1/payments/me/obligations", { auth: true }),
      ]);
      setStoreCredits(credits.status === "fulfilled" ? credits.value : null);
      setBubblesWallet(wallet.status === "fulfilled" ? wallet.value : null);
      setServerOverview(obligations.status === "fulfilled" ? obligations.value : null);
      setObligationError(obligations.status === "rejected");
    } finally {
      setObligationRefreshing(false);
    }
  }, []);

  useEffect(() => { void refreshFinancialSources(); }, [refreshFinancialSources]);
  useEffect(() => {
    if (returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at) {
      void refreshFinancialSources();
    }
  }, [returnedPayment?.status, returnedPayment?.entitlement_applied_at, refreshFinancialSources]);

  const refreshOverview = () => {
    void Promise.all([fetchEnrollments(), refreshFinancialSources(), reloadAll()]);
  };

  // Computed membership status
  const communityActive = useMemo(() => {
    return isTierPaid(member, "community");
  }, [member]);

  const clubActive = useMemo(() => {
    return isTierPaid(member, "club");
  }, [member]);

  // Loading state
  if (loading) {
    return <LoadingPage text="Loading billing..." />;
  }

  // Processing payment return - but don't block forever
  const shouldShowPaymentLoading =
    isPaystackReturn &&
    !verificationError &&
    !verificationTimedOut &&
    (!returnedPayment ||
      returnedPayment.status === "pending" ||
      (returnedPayment.status === "paid" && !returnedPayment.entitlement_applied_at));

  const paymentPurpose = (
    returnedPayment?.purpose ||
    returnedPayment?.payment_metadata?.purpose ||
    ""
  ).toLowerCase();
  const isSessionPayment = paymentPurpose.includes("session");
  const isAcademyPayment = paymentPurpose.includes("academy");
  const isClubPayment = paymentPurpose.includes("club");
  const isMembershipPayment =
    paymentPurpose === "community" || paymentPurpose === "club_bundle" || isClubPayment;

  if (shouldShowPaymentLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Confirming Payment</h1>
        <LoadingCard
          text={
            returnedPayment?.status === "paid"
              ? isSessionPayment
                ? "Confirming session..."
                : isAcademyPayment
                  ? "Confirming enrollment..."
                  : "Activating membership..."
              : "Confirming payment..."
          }
        />
        <p className="text-center text-sm text-slate-500">
          This usually takes just a few seconds...
        </p>
      </div>
    );
  }

  const communityFee = pricing?.community_annual ?? 20000;
  const requiredStatus = requiredTier ? member?.membership?.tier_statuses?.[requiredTier] : null;
  const requiredExpiry = requiredStatus?.paid_until || requiredStatus?.effective_until;
  const activeFallback = member?.membership?.highest_paid_tier || member?.membership?.paid_tier;
  const tierLabel = requiredTier
    ? requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)
    : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Payments & Credits</h1>
        <p className="text-sm md:text-base text-slate-600">
          Review your memberships, outstanding balances, payment history and credits.
        </p>
      </header>

      <PaystackReturnAlerts
        isPaystackReturn={isPaystackReturn}
        verificationError={verificationError}
        verificationTimedOut={verificationTimedOut}
        returnedPayment={returnedPayment}
        walletSummary={walletSummary}
        isSessionPayment={isSessionPayment}
        isAcademyPayment={isAcademyPayment}
        isClubPayment={isClubPayment}
        isMembershipPayment={isMembershipPayment}
      />

      {requiredTier && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Complete {tierLabel} access</p>
          <p className="mt-1 text-amber-800">
            {returnToParam
              ? `You came here from ${returnToParam}. `
              : "A feature you opened requires this membership. "}
            {requiredStatus?.status === "expired" && requiredExpiry
              ? `Your previous ${tierLabel} access ended on ${formatDate(requiredExpiry)}. `
              : ""}
            {activeFallback && activeFallback !== "prospect" && activeFallback !== requiredTier
              ? `Your ${activeFallback.charAt(0).toUpperCase() + activeFallback.slice(1)} access remains active. `
              : ""}
            {returnToParam
              ? "After successful payment, we’ll return you to the original page."
              : "Choose the relevant payment option below to restore access."}
          </p>
        </div>
      )}

      <FinancialOverview
        credits={storeCredits}
        wallet={bubblesWallet}
        serverOverview={serverOverview}
        incomplete={!!academyLoadError || obligationError || academyRefreshing}
        hasPendingTransfers={pendingTransfers.length > 0}
        onRefresh={refreshOverview}
        onViewHistory={() => setActiveTab("history")}
        refreshing={obligationRefreshing || academyRefreshing}
      />

      {/* Actionable unpaid sessions & pending bank transfers render directly only when non-empty */}
      <OutstandingSessionFeesCard payments={payments} />
      <PendingTransfersCard pendingTransfers={pendingTransfers} onReload={reloadAll} />

      {/* Clean visible tabs replace the four collapsed <details> toggles (ADR-022) */}
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Billing sections"
          className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "plans"}
            onClick={() => setActiveTab("plans")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "plans"
                ? "bg-cyan-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Memberships &amp; Plans
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-cyan-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Payment History{payments.length > 0 ? ` (${payments.length})` : ""}
          </button>
        </div>

        {activeTab === "plans" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <CommunityCard
                member={member}
                communityActive={communityActive}
                communityFee={communityFee}
              />
              <ClubCard
                member={member}
                clubActive={clubActive}
                communityActive={communityActive}
                history={membershipHistory}
              />
            </div>

            {academyLoadError && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                {academyLoadError}{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => void fetchEnrollments()}
                >
                  Retry
                </button>
              </div>
            )}

            <AcademySection
              loading={academyRefreshing}
              unavailable={!!academyLoadError && myEnrollments.length === 0}
              myEnrollments={myEnrollments}
              openCohorts={openCohorts}
              communityActive={communityActive}
              member={member}
            />

            <MembershipHistoryCard history={membershipHistory} />
          </div>
        ) : (
          <ProductPaymentReceipts payments={payments} />
        )}
      </div>
    </div>
  );
}
