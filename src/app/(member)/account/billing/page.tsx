"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  amount: number;
  currency: string;
  purpose?: string; // Direct field on payment, e.g. "club_bundle", "club", "community"
  payment_method?: string | null; // paystack or manual_transfer
  proof_of_payment_url?: string | null;
  admin_review_note?: string | null;
  paid_at?: string | null;
  entitlement_applied_at?: string | null;
  entitlement_error?: string | null;
  created_at: string;
  payment_metadata?: {
    purpose?: string; // Legacy/backup
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

type Enrollment = {
  id: string;
  cohort_id: string;
  status: string;
  payment_status: string;
  cohort?: {
    name: string;
    start_date?: string;
    end_date?: string;
    program?: {
      name: string;
    };
  };
};

type WalletSummary = {
  balance: number;
  welcomeBonusGranted: boolean;
  welcomeBonusAmount: number;
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

// ============================================================================
// Component
// ============================================================================

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerReference =
    searchParams.get("reference") || searchParams.get("trxref");
  const isMembershipPaymentReference =
    providerReference?.startsWith("PAY-") ?? false;
  const isTopupReference = providerReference?.startsWith("TOP-") ?? false;
  const isPaystackReturn = Boolean(
    providerReference && isMembershipPaymentReference,
  );

  const [member, setMember] = useState<Member | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [verificationTimedOut, setVerificationTimedOut] = useState(false);
  const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PaymentRecord[]>([]);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<{ [ref: string]: File | null }>(
    {},
  );
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(
    null,
  );

  // Load data
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

  // Load returned payment if coming from Paystack
  useEffect(() => {
    if (!providerReference || !isPaystackReturn) return;
    const fetchPayment = async () => {
      try {
        const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", {
          auth: true,
        });
        const match = payments.find((p) => p.reference === providerReference);
        setReturnedPayment(match || null);
      } catch {
        // If we can't fetch payments, still try to verify
        setReturnedPayment(null);
      }
    };
    fetchPayment();
  }, [isPaystackReturn, providerReference]);

  // Wallet topups use TOP-* references and should return to wallet, not billing.
  useEffect(() => {
    if (!providerReference || !isTopupReference) return;
    router.replace(
      `/account/wallet?provider=paystack&reference=${encodeURIComponent(providerReference)}`,
    );
  }, [isTopupReference, providerReference, router]);

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
    if (
      returnedPayment?.status === "paid" &&
      returnedPayment.entitlement_applied_at
    )
      return;

    const verify = async () => {
      setVerifying(true);
      try {
        await apiPost(
          `/api/v1/payments/paystack/verify/${encodeURIComponent(providerReference)}`,
          undefined,
          { auth: true },
        );
        toast.success("Payment verified!");
        setVerificationError(null);
        await load();
        // Re-fetch payment to get updated status
        const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", {
          auth: true,
        });
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

  useEffect(() => {
    const loadWalletSummary = async () => {
      if (!isPaystackReturn || !returnedPayment) return;
      if (
        returnedPayment.status !== "paid" ||
        !returnedPayment.entitlement_applied_at
      )
        return;

      const purpose = (
        returnedPayment.purpose ||
        returnedPayment.payment_metadata?.purpose ||
        ""
      ).toLowerCase();
      const membershipPurpose =
        purpose === "community" ||
        purpose === "club" ||
        purpose === "club_bundle";
      if (!membershipPurpose) return;

      try {
        const [walletData, txnData] = await Promise.all([
          apiGet<{ balance: number }>("/api/v1/wallet/me", { auth: true }),
          apiGet<{
            transactions: Array<{
              transaction_type: string;
              amount: number;
              created_at: string;
            }>;
          }>("/api/v1/wallet/transactions?limit=20", { auth: true }),
        ]);

        const anchorTs = new Date(
          returnedPayment.entitlement_applied_at ||
            returnedPayment.paid_at ||
            returnedPayment.created_at,
        ).getTime();
        const recentWelcomeBonus = (txnData.transactions || []).find((txn) => {
          if (txn.transaction_type !== "welcome_bonus") return false;
          const createdAtTs = new Date(txn.created_at).getTime();
          if (Number.isNaN(anchorTs) || Number.isNaN(createdAtTs)) return false;
          return Math.abs(createdAtTs - anchorTs) <= 30 * 60 * 1000;
        });

        const summary: WalletSummary = {
          balance: walletData.balance || 0,
          welcomeBonusGranted: Boolean(recentWelcomeBonus),
          welcomeBonusAmount: recentWelcomeBonus?.amount || 0,
        };
        setWalletSummary(summary);

        try {
          localStorage.setItem(
            "wallet_intro_pending",
            JSON.stringify({
              created_at: Date.now(),
              welcome_bonus_granted: summary.welcomeBonusGranted,
              welcome_bonus_amount: summary.welcomeBonusAmount,
              balance: summary.balance,
            }),
          );
        } catch {
          // localStorage may be unavailable
        }
      } catch {
        setWalletSummary(null);
      }
    };

    loadWalletSummary();
  }, [isPaystackReturn, returnedPayment]);

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

  // Load my enrollments for Academy section
  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const enrollments = await apiGet<Enrollment[]>(
          "/api/v1/academy/my-enrollments",
          { auth: true },
        );
        setMyEnrollments(enrollments);
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
      (returnedPayment.status === "paid" &&
        !returnedPayment.entitlement_applied_at));

  if (shouldShowPaymentLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Confirming Payment
        </h1>
        <LoadingCard
          text={
            returnedPayment?.status === "paid"
              ? "Activating membership..."
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

      {/* Verification Error Alert */}
      {isPaystackReturn && verificationError && (
        <Alert variant="error" title="Payment verification issue">
          {verificationError}. Your payment may still have been processed.
          Please check your email or contact support if the issue persists.
        </Alert>
      )}

      {/* Verification Timeout Alert */}
      {isPaystackReturn &&
        verificationTimedOut &&
        !returnedPayment?.entitlement_applied_at && (
          <Alert
            variant="info"
            title="Verification taking longer than expected"
          >
            Payment verification is still processing. Your membership will be
            activated automatically once complete. You can refresh this page to
            check status.
          </Alert>
        )}

      {/* Success Banner */}
      {isPaystackReturn &&
        returnedPayment?.status === "paid" &&
        returnedPayment.entitlement_applied_at &&
        (() => {
          // Use the direct purpose field first, fall back to payment_metadata
          const purpose = (
            returnedPayment.purpose ||
            returnedPayment.payment_metadata?.purpose ||
            ""
          ).toLowerCase();
          const isClub = purpose.includes("club");
          const isAcademy = purpose.includes("academy");
          const isSession = purpose.includes("session");
          const isMembership =
            purpose === "community" ||
            purpose === "club" ||
            purpose === "club_bundle";

          let title = "Welcome to Community! 🎉";
          let description =
            "Your membership has been activated. You now have full access to member features.";

          if (isSession) {
            title = "Session Confirmed! ✓";
            description =
              "Your attendance has been recorded. You'll receive a confirmation email with session details and your e-card.";
          } else if (isClub) {
            title = "Club is now active! 🎉";
            description =
              "You can now book sessions and access all Club features.";
          } else if (isAcademy) {
            title = "Academy enrollment confirmed! 🎉";
            description =
              "You're enrolled! Check your email for cohort details and next steps.";
          }

          return (
            <Alert variant="success" title={title}>
              <div className="space-y-2">
                <p>{description}</p>
                {isMembership && (
                  <p>
                    {walletSummary?.welcomeBonusGranted
                      ? `Welcome bonus added: +${walletSummary.welcomeBonusAmount} Bubbles.`
                      : "Your Bubble wallet is active. Welcome bonus is granted on first paid activation only."}{" "}
                    {walletSummary
                      ? `Current balance: ${walletSummary.balance.toLocaleString()} Bubbles.`
                      : ""}
                  </p>
                )}
                {isMembership && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/account/wallet?welcome=1">
                      <Button size="sm">Go to Wallet</Button>
                    </Link>
                    <Link href="/account/wallet/topup">
                      <Button size="sm" variant="outline">
                        Add Bubbles
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Alert>
          );
        })()}

      {/* Error Banner */}
      {isPaystackReturn && returnedPayment?.entitlement_error && (
        <Alert variant="error" title="Payment issue">
          Payment confirmed but activation failed:{" "}
          {returnedPayment.entitlement_error}
        </Alert>
      )}

      {/* ============================================================ */}
      {/* PENDING MANUAL TRANSFERS */}
      {/* ============================================================ */}
      {pendingTransfers.length > 0 && (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4 border-amber-200 bg-amber-50">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-amber-900">
              🏦 Pending Bank Transfers
            </h2>
            <p className="text-xs md:text-sm text-amber-700 mt-0.5 md:mt-1">
              Complete your payment by uploading proof of transfer.
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            {pendingTransfers.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-lg border border-amber-200 p-3 md:p-4 space-y-3"
              >
                {/* Payment info - stacked on mobile */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm">
                      {payment.purpose?.replace(/_/g, " ").toUpperCase() ||
                        "Payment"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Ref: {payment.reference}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                    <p className="text-base md:text-lg font-bold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        payment.status === "pending_review"
                          ? "bg-blue-100 text-blue-800"
                          : payment.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {payment.status === "pending_review"
                        ? "Under Review"
                        : payment.status === "failed"
                          ? "Rejected"
                          : "Awaiting Proof"}
                    </span>
                  </div>
                </div>

                {/* Rejection Note */}
                {payment.status === "failed" && payment.admin_review_note && (
                  <Alert variant="error" className="text-xs md:text-sm">
                    <strong>Rejection reason:</strong>{" "}
                    {payment.admin_review_note}
                  </Alert>
                )}

                {/* Upload Section */}
                {(payment.status === "pending" ||
                  payment.status === "failed") && (
                  <div className="space-y-2">
                    <p className="text-xs md:text-sm text-slate-600">
                      📤 Upload proof of payment (screenshot or receipt)
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setProofFile({
                            ...proofFile,
                            [payment.reference]: e.target.files?.[0] || null,
                          })
                        }
                        className="flex-1 text-xs md:text-sm text-slate-500 file:mr-2 md:file:mr-3 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-medium file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                      />
                      <Button
                        size="sm"
                        className="w-full sm:w-auto flex-shrink-0"
                        disabled={
                          !proofFile[payment.reference] ||
                          uploadingProof === payment.reference
                        }
                        onClick={async () => {
                          const file = proofFile[payment.reference];
                          if (!file) return;

                          setUploadingProof(payment.reference);
                          try {
                            // Upload file to backend media service
                            const mediaItem = await uploadMedia(
                              file,
                              "payment_proof",
                              payment.reference,
                              `Payment proof ${payment.reference}`,
                            );
                            // Send the media_id, not the URL
                            const proofMediaId = mediaItem.id;

                            await apiPost(
                              `/api/v1/payments/${payment.reference}/proof`,
                              { proof_media_id: proofMediaId },
                              { auth: true },
                            );
                            toast.success(
                              "Proof uploaded! Awaiting admin review.",
                            );
                            await load();
                          } catch (e) {
                            const msg =
                              e instanceof Error ? e.message : "Upload failed";
                            toast.error(msg);
                          } finally {
                            setUploadingProof(null);
                          }
                        }}
                      >
                        {uploadingProof === payment.reference
                          ? "Uploading..."
                          : "Submit"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Under Review Message */}
                {payment.status === "pending_review" && (
                  <div className="flex items-start gap-2 text-xs md:text-sm text-blue-700 bg-blue-50 p-2.5 md:p-3 rounded-lg">
                    <span className="flex-shrink-0">⏳</span>
                    <span>
                      Your proof is being reviewed by our team. You'll be
                      notified once approved.
                    </span>
                  </div>
                )}

                {/* Bank Details Reminder */}
                <details className="text-xs md:text-sm">
                  <summary className="cursor-pointer text-amber-700 hover:text-amber-800">
                    View bank transfer details
                  </summary>
                  <div className="mt-2 p-2.5 md:p-3 bg-amber-50 rounded-lg space-y-1 text-amber-800">
                    <p>
                      <span className="text-amber-600">Bank:</span>{" "}
                      <strong>OPay</strong>
                    </p>
                    <p>
                      <span className="text-amber-600">Account Number:</span>{" "}
                      <strong>7033588400</strong>
                    </p>
                    <p>
                      <span className="text-amber-600">Account Name:</span>{" "}
                      <strong>Ugochukwu Nwachukwu</strong>
                    </p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* COMMUNITY CARD */}
      {/* ============================================================ */}
      <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              Community
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              Annual membership that unlocks all member features.
            </p>
          </div>
          <span className="text-xs md:text-sm text-slate-500 font-medium">
            {formatCurrency(communityFee)}/year
          </span>
        </div>

        <dl className="space-y-1.5 md:space-y-2 text-sm">
          <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
            <dt className="text-slate-600">Status</dt>
            <dd
              className={`md:col-span-2 font-medium ${communityActive ? "text-emerald-600" : "text-slate-500"}`}
            >
              {communityActive ? "✓ Active" : "Inactive"}
            </dd>
          </div>
          {communityActive && (
            <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
              <dt className="text-slate-600">Valid until</dt>
              <dd className="md:col-span-2 font-medium text-slate-900">
                {formatDate(member?.membership?.community_paid_until)}
              </dd>
            </div>
          )}
        </dl>

        {communityActive ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
            <p className="font-medium">Your Community membership is active!</p>
            <p className="mt-0.5 md:mt-1 text-emerald-600">
              You have full access to member features.
            </p>
          </div>
        ) : (
          <Link href="/checkout?purpose=community" className="block">
            <Button className="w-full sm:w-auto">
              Activate Community ({formatCurrency(communityFee)})
            </Button>
          </Link>
        )}
      </Card>

      {/* ============================================================ */}
      {/* CLUB CARD */}
      {/* ============================================================ */}
      {clubActive ? (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              Club
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              Recurring membership for regular sessions with coaches.
            </p>
          </div>

          <dl className="space-y-1.5 md:space-y-2 text-sm">
            <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
              <dt className="text-slate-600">Status</dt>
              <dd className="md:col-span-2 font-medium text-emerald-600">
                ✓ Active
              </dd>
            </div>
            <div className="flex justify-between md:grid md:grid-cols-3 md:gap-2">
              <dt className="text-slate-600">Valid until</dt>
              <dd className="md:col-span-2 font-medium text-slate-900">
                {formatDate(member?.membership?.club_paid_until)}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
            <p className="font-medium">Your Club membership is active!</p>
            <p className="mt-0.5 md:mt-1 text-emerald-600">
              You can book sessions and access all Club features.
            </p>
          </div>
        </Card>
      ) : communityActive ? (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              Want to join Club?
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              Get access to regular swimming sessions with coaches. Pay
              quarterly, bi-annually, or annually.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            <Link href="/upgrade/club/readiness" className="block">
              <Button className="w-full sm:w-auto">Upgrade to Club</Button>
            </Link>
            <Link
              href="/membership"
              className="text-sm text-cyan-600 hover:text-cyan-800 text-center sm:text-left"
            >
              How it works →
            </Link>
          </div>
        </Card>
      ) : null}

      {/* ============================================================ */}
      {/* ACADEMY SECTION */}
      {/* ============================================================ */}
      {(() => {
        // Separate enrollments by status
        const paidEnrollments = myEnrollments.filter(
          (e) => e.payment_status === "paid" || e.status === "enrolled",
        );
        const pendingEnrollments = myEnrollments.filter(
          (e) =>
            e.payment_status === "pending" && e.status === "pending_approval",
        );

        // Get cohort IDs the member is already enrolled in
        const enrolledCohortIds = new Set(
          myEnrollments.map((e) => e.cohort_id),
        );

        // Filter available cohorts (exclude ones already enrolled in)
        const availableCohorts = openCohorts.filter(
          (c) => !enrolledCohortIds.has(c.id),
        );

        return (
          <>
            {/* Academy Enrollments Summary */}
            {paidEnrollments.length > 0 && (
              <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-slate-900">
                      Academy
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                      {paidEnrollments.length} active enrollment
                      {paidEnrollments.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 text-emerald-600 text-sm">
                    <svg
                      className="h-4 w-4 md:h-5 md:w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium">Active</span>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
                  <p className="font-medium">You're enrolled in the Academy!</p>
                  <p className="mt-0.5 md:mt-1 text-emerald-600">
                    Track your progress and milestones on the My Academy page.
                  </p>
                </div>

                <Link href="/account/academy" className="block">
                  <Button variant="outline" className="w-full">
                    View My Academy →
                  </Button>
                </Link>
              </Card>
            )}

            {/* Show pending enrollments */}
            {pendingEnrollments.map((enrollment) => (
              <Card
                key={enrollment.id}
                className="p-4 md:p-6 space-y-3 md:space-y-4"
              >
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900">
                    Academy
                  </h2>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                    {enrollment.cohort?.program?.name || "Swimming Program"}
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 md:p-4 text-xs md:text-sm text-amber-800">
                  <p className="font-medium">Payment Pending</p>
                  <p className="mt-0.5 md:mt-1 text-amber-600">
                    Complete your payment to confirm your enrollment in{" "}
                    {enrollment.cohort?.name}.
                  </p>
                </div>

                <Link
                  href={`/checkout?purpose=academy_cohort&cohort_id=${enrollment.cohort_id}`}
                  className="block"
                >
                  <Button className="w-full sm:w-auto">Complete Payment</Button>
                </Link>
              </Card>
            ))}

            {/* Show option to enroll in more cohorts */}
            {communityActive && availableCohorts.length > 0 && (
              <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900">
                    {myEnrollments.length > 0
                      ? "Enroll in Another Cohort"
                      : "Want to join Academy?"}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                    {myEnrollments.length > 0
                      ? `${availableCohorts.length} more cohort${availableCohorts.length > 1 ? "s" : ""} available for enrollment.`
                      : "Structured swimming programs with expert coaches. Complete your goals faster with personalized training."}
                  </p>
                </div>

                {/* Show available cohorts preview */}
                {availableCohorts.length <= 3 && (
                  <div className="space-y-2">
                    {availableCohorts.map((cohort) => (
                      <div
                        key={cohort.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {cohort.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {cohort.start_date
                              ? `Starts ${formatDate(cohort.start_date)}`
                              : "Coming soon"}
                          </p>
                        </div>
                        <Link
                          href={`/upgrade/academy/cohort?select=${cohort.id}`}
                          className="flex-shrink-0"
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            Enroll
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                  <Link href="/upgrade/academy/details" className="block">
                    <Button className="w-full sm:w-auto">
                      {myEnrollments.length > 0
                        ? "Browse All Cohorts"
                        : "Enroll in Academy"}
                    </Button>
                  </Link>
                  <Link
                    href="/academy"
                    className="text-sm text-cyan-600 hover:text-cyan-800 text-center sm:text-left"
                  >
                    How it works →
                  </Link>
                </div>
              </Card>
            )}

            {/* No enrollments and no available cohorts */}
            {communityActive &&
              myEnrollments.length === 0 &&
              availableCohorts.length === 0 && (
                <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-slate-900">
                      Academy
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                      No cohorts are currently open for enrollment. Check back
                      soon!
                    </p>
                  </div>
                  <Link
                    href="/academy"
                    className="text-sm text-cyan-600 hover:text-cyan-800"
                  >
                    Learn about Academy programs →
                  </Link>
                </Card>
              )}

            {/* Enrolled in all available cohorts */}
            {communityActive &&
              myEnrollments.length > 0 &&
              availableCohorts.length === 0 && (
                <Card className="p-4 md:p-6 space-y-2 md:space-y-3 bg-slate-50 border-dashed">
                  <p className="text-xs md:text-sm text-slate-600">
                    ✨ You're enrolled in all currently available cohorts! Check
                    back later for new programs.
                  </p>
                  <Link
                    href="/account/academy/browse"
                    className="text-sm text-cyan-600 hover:text-cyan-800"
                  >
                    Browse Academy programs →
                  </Link>
                </Card>
              )}
          </>
        );
      })()}
    </div>
  );
}
