"use client";

import { LoadingCard } from "@/components/ui/LoadingCard";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AcademySection } from "./_billing/AcademySection";
import { ClubCard } from "./_billing/ClubCard";
import { CommunityCard } from "./_billing/CommunityCard";
import { OutstandingSessionFeesCard } from "./_billing/OutstandingSessionFeesCard";
import { PaystackReturnAlerts } from "./_billing/PaystackReturnAlerts";
import { PendingTransfersCard } from "./_billing/PendingTransfersCard";
import { usePaystackReturn } from "./_billing/usePaystackReturn";
import type {
  Cohort,
  Enrollment,
  Member,
  PaymentRecord,
  PricingConfig,
} from "./types";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const providerReference =
    searchParams.get("reference") || searchParams.get("trxref");
  const isMembershipPaymentReference =
    providerReference?.startsWith("PAY-") ?? false;
  const isTopupReference = providerReference?.startsWith("TOP-") ?? false;
  const isPaystackReturn = Boolean(providerReference && isMembershipPaymentReference);

  const [member, setMember] = useState<Member | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PaymentRecord[]>([]);

  // Load member, pricing, payments. Stable identity (empty deps) so children
  // and hooks can call it without thrash.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memberData, pricingData, paymentsData] = await Promise.all([
        apiGet<Member>("/api/v1/members/me", { auth: true }),
        apiGet<PricingConfig>("/api/v1/payments/pricing"),
        apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true }),
      ]);
      setMember(memberData);
      setPricing(pricingData);

      // Filter for pending manual transfers (pending or pending_review status with manual_transfer method)
      const pending = paymentsData.filter(
        (p) =>
          p.payment_method === "manual_transfer" &&
          (p.status === "pending" ||
            p.status === "pending_review" ||
            p.status === "failed"),
      );
      setPendingTransfers(pending);
    } catch (e) {
      console.error("Failed to load billing data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const {
    returnedPayment,
    verificationError,
    verificationTimedOut,
    walletSummary,
  } = usePaystackReturn({
    providerReference,
    isPaystackReturn,
    isTopupReference,
    onPaymentVerified: load,
  });

  // Load open cohorts for Academy section
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const cohorts = await apiGet<Cohort[]>(
          "/api/v1/academy/cohorts/enrollable",
          { auth: true },
        );
        setOpenCohorts(cohorts);
      } catch {
        setOpenCohorts([]);
      }
    };
    fetchCohorts();
  }, []);

  // Load my enrollments for Academy section (with installments for paid ones)
  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const enrollments = await apiGet<Enrollment[]>(
          "/api/v1/academy/my-enrollments",
          { auth: true },
        );
        // Fetch installments for paid enrollments that have them
        const enriched = await Promise.all(
          enrollments.map(async (e) => {
            if (
              (e.payment_status === "paid" || e.status === "enrolled") &&
              e.total_installments &&
              e.total_installments > 1
            ) {
              try {
                const detail = await apiGet<Enrollment>(
                  `/api/v1/academy/my-enrollments/${e.id}`,
                  { auth: true },
                );
                return { ...e, installments: detail.installments };
              } catch {
                return e;
              }
            }
            return e;
          }),
        );
        setMyEnrollments(enriched);
      } catch {
        setMyEnrollments([]);
      }
    };
    fetchEnrollments();
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Membership & Billing
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Manage your memberships and upgrade when you're ready.
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

      <OutstandingSessionFeesCard />

      <PendingTransfersCard pendingTransfers={pendingTransfers} onReload={load} />

      <CommunityCard
        member={member}
        communityActive={communityActive}
        communityFee={communityFee}
      />

      <ClubCard member={member} clubActive={clubActive} communityActive={communityActive} />

      <AcademySection
        myEnrollments={myEnrollments}
        openCohorts={openCohorts}
        communityActive={communityActive}
      />
    </div>
  );
}
