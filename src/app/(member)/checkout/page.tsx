"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { savePaymentIntentCache } from "@/lib/paymentCache";
import {
  Cohort,
  formatCurrency,
  getClubCycleLabel,
  UpgradeProvider,
  useUpgrade,
} from "@/lib/upgradeContext";
import { ArrowLeft, CreditCard, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
  id?: string;
  email?: string;
  membership?: {
    community_paid_until?: string | null;
  } | null;
};

type PricingConfig = {
  community_annual: number;
  club_quarterly: number;
  club_biannual: number;
  club_annual: number;
  currency: string;
};

type PaymentIntent = {
  reference: string;
  amount: number;
  currency: string;
  purpose: string;
  status: string;
  checkout_url?: string | null;
  created_at: string;
  discount_amount?: number;
  discount_code?: string;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setDiscountCode, clearState } = useUpgrade();

  const [member, setMember] = useState<Member | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState(state.discountCode);
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    amount: number;
    appliesTo?: string | null; // Which component the discount applies to
  } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "paystack" | "manual_transfer"
  >("paystack");

  // Determine purpose from URL or context
  const urlPurpose = searchParams.get("purpose");
  const purpose =
    urlPurpose ||
    (state.targetTier === "club"
      ? "club"
      : state.targetTier === "academy"
        ? "academy_cohort"
        : null);

  // Get club plan from URL params (fallback) or context
  const urlPlan = searchParams.get("plan") as
    | "quarterly"
    | "biannual"
    | "annual"
    | null;
  const clubBillingCycle = urlPlan || state.clubBillingCycle;

  // Get cohort_id from URL (for resuming pending payments)
  const urlCohortId = searchParams.get("cohort_id");
  const urlEnrollmentId = searchParams.get("enrollment_id");
  const { setSelectedCohort } = useUpgrade();

  // Load member data and pricing (and cohort if needed)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberData, pricingData] = await Promise.all([
        apiGet<Member>("/api/v1/members/me", { auth: true }),
        apiGet<PricingConfig>("/api/v1/payments/pricing"),
      ]);
      setMember(memberData);
      setPricing(pricingData);

      // If we have cohort_id in URL but no selectedCohort in context, fetch it
      // This allows resuming pending payments from billing page or deep link
      if (urlCohortId && !state.selectedCohort) {
        try {
          // Prefer enrollment lookup if provided
          if (urlEnrollmentId) {
            const enrollment = await apiGet<{
              id: string;
              cohort_id: string;
              cohort?: Cohort;
              program?: Cohort["program"];
            }>(`/api/v1/academy/enrollments/${urlEnrollmentId}`, {
              auth: true,
            }).catch(() => null);
            if (enrollment?.cohort) {
              setSelectedCohort(enrollment.cohort);
            }
          }

          if (!state.selectedCohort) {
            const cohortResponse = await apiGet<Cohort>(
              `/api/v1/academy/cohorts/${urlCohortId}`,
              { auth: true },
            ).catch(() => null);
            if (cohortResponse) {
              setSelectedCohort(cohortResponse);
            }
          }
        } catch (e) {
          console.error("Failed to load cohort:", e);
        }
      }
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, [urlCohortId, state.selectedCohort, setSelectedCohort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if community is active
  const communityActive = (() => {
    const until = member?.membership?.community_paid_until;
    if (!until) return false;
    const untilMs = Date.parse(until);
    return Number.isFinite(untilMs) && untilMs > Date.now();
  })();

  // Calculate line items based on purpose (using API pricing)
  const lineItems: { label: string; amount: number; highlight?: boolean }[] =
    [];
  let subtotal = 0;

  const communityFee = pricing?.community_annual || 0;
  const clubPricing = {
    quarterly: pricing?.club_quarterly || 0,
    biannual: pricing?.club_biannual || 0,
    annual: pricing?.club_annual || 0,
  };

  if (purpose === "club" || purpose === "club_bundle") {
    // Club upgrade
    if (!communityActive) {
      lineItems.push({
        label: "Community membership (annual)",
        amount: communityFee,
      });
      subtotal += communityFee;
    }

    if (clubBillingCycle) {
      const clubFee = clubPricing[clubBillingCycle];
      lineItems.push({
        label: `Club membership (${getClubCycleLabel(clubBillingCycle).toLowerCase()})`,
        amount: clubFee,
      });
      subtotal += clubFee;
    }

    // Community extension if applicable
    if (state.extensionInfo?.required && state.includeCommunityExtension) {
      lineItems.push({
        label: `Community extension (${state.extensionInfo.months} months)`,
        amount: state.extensionInfo.amount,
      });
      subtotal += state.extensionInfo.amount;
    }
  } else if (purpose === "academy_cohort") {
    // Academy enrollment - use price_override or program.price_amount
    // Price is stored in naira (major unit)
    const cohortPrice =
      state.selectedCohort?.price_override ??
      state.selectedCohort?.program?.price_amount;
    if (cohortPrice) {
      lineItems.push({
        label: `Academy: ${state.selectedCohort?.name}`,
        amount: cohortPrice,
      });
      subtotal += cohortPrice;
    }
  } else if (purpose === "community") {
    // Community only
    lineItems.push({
      label: "Community membership (annual)",
      amount: communityFee,
    });
    subtotal += communityFee;
  }

  // Apply discount
  const discountAmount = validatedDiscount?.amount || 0;
  const total = Math.max(0, subtotal - discountAmount);

  // Validate discount code against backend
  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;

    setValidatingDiscount(true);
    try {
      // Determine the payment purpose for discount validation
      const discountPurpose =
        purpose === "club" || purpose === "club_bundle"
          ? communityActive
            ? "club"
            : "club_bundle"
          : purpose || "community";

      // Build component breakdown for smart discount matching
      // This allows tier-specific discounts to apply only to their portion
      let components: Record<string, number> | undefined;

      if (discountPurpose === "club_bundle" && clubBillingCycle) {
        const clubFee = clubPricing[clubBillingCycle];
        components = {
          community: communityFee,
          club: clubFee,
        };
      }

      const response = await apiPost<{
        valid: boolean;
        code: string;
        discount_type: string | null;
        discount_value: number | null;
        discount_amount: number;
        final_total: number;
        applies_to_component: string | null;
        message: string | null;
      }>(
        "/api/v1/payments/discounts/preview",
        {
          code: discountInput.trim().toUpperCase(),
          purpose: discountPurpose,
          subtotal: subtotal,
          components: components,
        },
        { auth: true },
      );

      if (response.valid) {
        setDiscountCode(response.code);
        setValidatedDiscount({
          code: response.code,
          amount: response.discount_amount,
          appliesTo: response.applies_to_component,
        });
        toast.success(
          response.message || `Discount "${response.code}" applied`,
        );
      } else {
        toast.error(response.message || "Invalid discount code");
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to validate discount code";
      toast.error(message);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleClearDiscount = () => {
    setDiscountInput("");
    setValidatedDiscount(null);
    setDiscountCode("");
  };

  // Process payment
  const handlePayment = async () => {
    if (!purpose) {
      toast.error("Invalid checkout state");
      return;
    }

    setProcessing(true);
    try {
      let intentPayload: any = {
        currency: "NGN",
        payment_method: paymentMethod,
        discount_code: state.discountCode || undefined,
      };

      if (purpose === "club" || purpose === "club_bundle") {
        intentPayload = {
          ...intentPayload,
          purpose: communityActive ? "club" : "club_bundle",
          club_billing_cycle: clubBillingCycle,
          months: 1,
          years: communityActive ? undefined : 1,
          include_community_extension:
            state.extensionInfo?.required && state.includeCommunityExtension,
        };
      } else if (purpose === "academy_cohort") {
        // Use existing enrollment ID from URL if available (set by quick-enroll paths)
        let enrollmentId: string | undefined = urlEnrollmentId || undefined;

        if (!enrollmentId) {
          // Try to create a new enrollment, or use existing one if already enrolled
          try {
            const newEnrollment = await apiPost<{ id: string }>(
              "/api/v1/academy/enrollments/me",
              { cohort_id: state.selectedCohortId },
              { auth: true },
            );
            enrollmentId = newEnrollment.id;
          } catch (enrollError: any) {
            // If already enrolled, try to get existing enrollment
            if (enrollError?.message?.includes("already")) {
              // Fetch existing enrollments and find the one for this cohort
              const existingEnrollments = await apiGet<
                { id: string; cohort_id: string; payment_status: string }[]
              >("/api/v1/academy/my-enrollments", { auth: true });
              const existingEnrollment = existingEnrollments.find(
                (e) =>
                  e.cohort_id === state.selectedCohortId &&
                  e.payment_status !== "paid",
              );
              if (existingEnrollment) {
                enrollmentId = existingEnrollment.id;
              } else {
                throw new Error(
                  "You already have a paid enrollment for this cohort",
                );
              }
            } else {
              throw enrollError;
            }
          }
        }

        intentPayload = {
          ...intentPayload,
          purpose: "academy_cohort",
          enrollment_id: enrollmentId,
        };
      } else if (purpose === "community") {
        intentPayload = {
          ...intentPayload,
          purpose: "community",
          years: 1,
        };
      }

      const intent = await apiPost<PaymentIntent>(
        "/api/v1/payments/intents",
        intentPayload,
        { auth: true },
      );

      // Cache the intent
      savePaymentIntentCache(intent, member?.id || member?.email || "me");

      if (intent.checkout_url) {
        // Clear upgrade state before redirect
        clearState();
        // Redirect to payment provider
        window.location.href = intent.checkout_url;
      } else if (paymentMethod === "manual_transfer") {
        // For manual transfers, go to proof upload page
        toast.success(`Payment reference created: ${intent.reference}`);
        clearState();
        router.push(`/account/billing?pending_transfer=${intent.reference}`);
      } else {
        if (intent.status === "paid") {
          toast.success("Payment complete. Access activated.");
        } else {
          toast.success(`Payment reference created: ${intent.reference}`);
        }
        clearState();
        router.push("/account/billing");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Payment failed";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // Navigation back based on purpose
  const getBackLink = () => {
    if (purpose === "club" || purpose === "club_bundle") {
      return "/upgrade/club/plan";
    }
    if (purpose === "academy_cohort") {
      return "/upgrade/academy/details";
    }
    return "/account/billing";
  };

  if (loading) {
    return <LoadingCard text="Loading checkout..." />;
  }

  // Validate we have required data
  if (!purpose || lineItems.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <Alert variant="error" title="Checkout Error">
          Missing checkout information. Please start the upgrade process again.
        </Alert>
        <Button onClick={() => router.push("/account/billing")}>
          Back to Billing
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
          <CreditCard className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Review & Pay</h1>
        <p className="text-slate-600 max-w-md mx-auto">
          Please review your order before proceeding to payment.
        </p>
      </div>

      {/* Order Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Order Summary
        </h2>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="flex justify-between py-2">
              <span className="text-slate-700">{item.label}</span>
              <span className="text-slate-900">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}

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
                      {validatedDiscount.appliesTo && (
                        <p className="text-xs text-emerald-600">
                          Applied to{" "}
                          {validatedDiscount.appliesTo.replace("_", " ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-emerald-700">
                      -
                      {discountAmount > 0
                        ? formatCurrency(discountAmount)
                        : "Applied"}
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
                  onChange={(e) =>
                    setDiscountInput(e.target.value.toUpperCase())
                  }
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

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <span className="text-base font-semibold text-slate-900">
              Total
            </span>
            <span className="text-xl font-bold text-cyan-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment Method Selector - Only show for session payments, not membership */}
      {purpose === "session" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Payment Method
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "paystack"
                  ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="paystack"
                checked={paymentMethod === "paystack"}
                onChange={() => setPaymentMethod("paystack")}
                className="sr-only"
              />
              <span className="text-lg font-medium text-slate-900">
                💳 Pay Online
              </span>
              <span className="text-sm text-slate-500">
                Instant payment via Paystack
              </span>
            </label>
            <label
              className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "manual_transfer"
                  ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="manual_transfer"
                checked={paymentMethod === "manual_transfer"}
                onChange={() => setPaymentMethod("manual_transfer")}
                className="sr-only"
              />
              <span className="text-lg font-medium text-slate-900">
                🏦 Bank Transfer
              </span>
              <span className="text-sm text-slate-500">
                Manual transfer with proof
              </span>
            </label>
          </div>

          {/* Bank Transfer Details */}
          {paymentMethod === "manual_transfer" && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-medium text-amber-900 mb-2">
                📋 Bank Transfer Details
              </h3>
              <div className="space-y-1 text-sm text-amber-800">
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
                <p>
                  <span className="text-amber-600">Amount:</span>{" "}
                  <strong>{formatCurrency(total)}</strong>
                </p>
              </div>
              <p className="mt-3 text-xs text-amber-700">
                💡 After transfer, you'll be asked to upload proof of payment
                for verification.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Payment Button */}
      <div className="space-y-4">
        <Button
          onClick={handlePayment}
          disabled={processing}
          size="lg"
          className="w-full"
        >
          {processing
            ? "Processing..."
            : paymentMethod === "paystack"
              ? `Pay ${formatCurrency(total)}`
              : `Confirm & Get Reference`}
        </Button>

        <Link
          href={getBackLink()}
          className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to previous step
        </Link>
      </div>

      {/* Security note */}
      <p className="text-center text-xs text-slate-400">
        {paymentMethod === "paystack"
          ? "Payments are securely processed by Paystack. Your card details are never stored on our servers."
          : "After creating your payment reference, upload proof of payment for admin verification."}
      </p>
    </div>
  );
}

// Wrap with UpgradeProvider since checkout page is outside /upgrade layout
export default function CheckoutPage() {
  return (
    <UpgradeProvider>
      <div className="max-w-2xl mx-auto space-y-6">
        <CheckoutContent />
      </div>
    </UpgradeProvider>
  );
}
