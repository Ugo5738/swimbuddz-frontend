"use client";

import { prepareCheckout, prepareAcademyEnrollment } from "@/lib/checkoutPreparation";
import { loadAcademyBillingQuotes, type AcademyBillingQuotes } from "@/lib/academyBillingQuotes";
import { BANK_TRANSFER_ACCOUNT } from "@/lib/bank-transfer";

import { canPayAcademyEnrollment } from "@/lib/academy/paymentEligibility";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ClubPaymentModeSelector } from "@/components/club/ClubPaymentModeSelector";
import { ClubTransitionCheckoutNotice } from "@/components/club/ClubTransitionCheckoutNotice";
import {
  ProductPaymentOptions,
  PaymentAdjustments,
} from "@/components/checkout/ProductPaymentOptions";
import { productCheckoutAttempt } from "@/lib/productCheckoutAttempt";
import { apiGet, apiPost } from "@/lib/api";
import {
  ChargePreview,
  ClubPaymentMode,
  previewAcademyCheckout,
  previewClubCheckout,
  previewCommunityExperienceCheckout,
} from "@/lib/clubOnboarding";
import type { components } from "@/lib/api-types";
import { savePaymentIntentCache } from "@/lib/paymentCache";
import { isTierPaid } from "@/lib/tiers";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PaymentIntentRequest = components["schemas"]["CreatePaymentIntentRequest"] & {
  club_payment_mode?: ClubPaymentMode;
};

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
  entitlement_applied_at?: string | null;
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
  const [clubQuote, setClubQuote] = useState<ChargePreview | null>(null);
  const [clubExperienceSelected, setClubExperienceSelected] = useState<boolean | undefined>();
  const quoteRequest = useRef(0);
  const [academyQuotes, setAcademyQuotes] = useState<(AcademyBillingQuotes & { key: string }) | null>(null);
  const [checkoutCohort, setCheckoutCohort] = useState<Cohort | null>(null);
  const [experienceQuote, setExperienceQuote] = useState<ChargePreview | null>(null);
  const [membershipQuote, setMembershipQuote] = useState<ChargePreview | null>(null);
  const [adjustments, setAdjustments] = useState<PaymentAdjustments>({});
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const dataLoaded = useRef(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState(state.discountCode);
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    amount: number;
    appliesTo?: string | null; // Which component the discount applies to
  } | null>(null);
  // The discount field is collapsed by default — most users don't have a
  // code and the always-visible input invites typos / fishing for codes.
  // Auto-expand if the upgrade state already has a code (e.g. user came
  // back from a "Back to previous step" loop with a pre-filled code).
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(Boolean(state.discountCode));
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "manual_transfer">(
    searchParams.get("payment_method") === "manual_transfer" ? "manual_transfer" : "paystack"
  );

  // Installment billing mode — "full" or "installments"
  // Only relevant when purpose === "academy_cohort" and cohort.installment_plan_enabled
  const [billingMode, setBillingMode] = useState<"full" | "installments">(searchParams.get("billing") === "installments" ? "installments" : "full");

  // Determine purpose from URL ONLY — do not fall back to context.targetTier.
  // The context-based fallback was a money-leak: a member arriving with stale
  // upgrade state (e.g. previously browsed Club) could land here from an
  // academy-intent flow and silently buy Club. The /upgrade/academy/cohort
  // page always builds an explicit ?purpose=academy_cohort URL, so requiring
  // the URL param is safe and removes the race entirely.
  const purpose = searchParams.get("purpose");
  const clubApplicationId = searchParams.get("application_id");
  const requestedClubPaymentMode =
    searchParams.get("payment_mode") === "transition_per_session"
      ? "transition_per_session"
      : searchParams.get("payment_mode") === "quarterly_prepaid"
        ? "quarterly_prepaid"
        : null;
  const [clubPaymentMode, setClubPaymentMode] = useState<ClubPaymentMode>(
    requestedClubPaymentMode ?? "quarterly_prepaid"
  );
  const [clubPaymentModeWasChosen, setClubPaymentModeWasChosen] = useState(
    requestedClubPaymentMode !== null
  );
  const communityExperienceOfferingId = searchParams.get("offering_id");

  // Get club plan from URL params (fallback) or context
  const urlPlan = searchParams.get("plan") as "quarterly" | "biannual" | "annual" | null;
  const clubBillingCycle = urlPlan || state.clubBillingCycle;

  // Get cohort_id from URL (for resuming pending payments)
  const urlCohortId = searchParams.get("cohort_id");
  const urlEnrollmentId = searchParams.get("enrollment_id");
  const checkoutCohortId = urlCohortId;
  // Optional override (kobo) for member-initiated mid-cohort custom-amount pay.
  // Backend validates: >= next installment amount, <= remaining balance.
  const urlAmountOverrideKobo = (() => {
    const raw = searchParams.get("amount_override_kobo");
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  })();
  const academyQuoteKey = JSON.stringify([urlEnrollmentId, urlCohortId, paymentMethod, urlAmountOverrideKobo, adjustments]);
  const [academyBubbleResetKey, setAcademyBubbleResetKey] = useState<string | null>(null);
  const bubblesWereReset = academyBubbleResetKey === academyQuoteKey;
  const academyQuote = academyQuotes?.key === academyQuoteKey
    ? bubblesWereReset ? academyQuotes.withoutBubbles[billingMode] : academyQuotes[billingMode]
    : null;
  const academyQuoteError = academyQuotes?.key === academyQuoteKey ? academyQuotes.errors[billingMode] : undefined;
  const switchBilling = (mode: "full" | "installments") => {
    setBillingMode(mode);
    if (adjustments.bubbles_to_apply && academyQuotes?.key === academyQuoteKey &&
        academyQuotes[mode] && !academyQuotes[mode]?.bubbles_to_apply) {
      setAcademyBubbleResetKey(academyQuoteKey);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("billing", mode);
    router.replace(`/checkout?${params.toString()}`, { scroll: false });
  };
  const billingParam = searchParams.get("billing");
  useEffect(() => {
    setBillingMode(billingParam === "installments" ? "installments" : "full");
  }, [billingParam]);
  useEffect(() => {
    if (adjustments.bubbles_to_apply && academyQuotes?.key === academyQuoteKey &&
        academyQuotes[billingMode] && !academyQuotes[billingMode]?.bubbles_to_apply) {
      setAcademyBubbleResetKey(academyQuoteKey);
    }
  }, [billingMode, academyQuoteKey, academyQuotes, adjustments.bubbles_to_apply]);
  const enrollmentStarted = useRef<string | null>(null);
  const [preparationRetry, setPreparationRetry] = useState(0);

  useEffect(() => {
    if (
      purpose !== "academy_cohort" ||
      urlEnrollmentId ||
      !checkoutCohortId ||
      enrollmentStarted.current === checkoutCohortId
    ) {
      return;
    }
    enrollmentStarted.current = checkoutCohortId;
    let active = true;
    void prepareAcademyEnrollment(checkoutCohortId).then(({ path }) => {
      if (active) router.replace(path);
    }).catch((error) => {
      if (active) setQuoteError(error instanceof Error ? error.message : "Could not prepare Academy checkout");
    });
    return () => { active = false; enrollmentStarted.current = null; };
  }, [checkoutCohortId, purpose, router, urlEnrollmentId, preparationRetry]);

  // Load member data and pricing (and cohort if needed)
  const loadData = useCallback(async () => {
    const request = ++quoteRequest.current;
    setLoading(!dataLoaded.current);
    setQuotePending(true);
    try {
      const [memberData, pricingData] = await Promise.all([
        prepareCheckout("member", () => apiGet<Member>("/api/v1/members/me", { auth: true })),
        prepareCheckout("pricing", () => apiGet<PricingConfig>("/api/v1/payments/pricing")),
      ]);
      if (request !== quoteRequest.current) return;
      setMember(memberData);
      setPricing(pricingData);

      if (purpose === "club" && clubApplicationId) {
        try {
          const quote = await prepareCheckout("club-quote", () => previewClubCheckout(
            clubApplicationId,
            paymentMethod,
            clubPaymentModeWasChosen ? clubPaymentMode : undefined,
            clubExperienceSelected,
            adjustments
          ));
          if (request !== quoteRequest.current) return;
          setClubQuote(quote);
          if (quote.components.club_payment_mode) {
            setClubPaymentMode(quote.components.club_payment_mode);
          }
          setQuoteError(null);
          setAdjustmentError(null);
        } catch (quoteFailure) {
          if (request !== quoteRequest.current) return;
          if (dataLoaded.current && (adjustments.discount_code || adjustments.bubbles_to_apply)) {
            setAdjustmentError(
              quoteFailure instanceof Error
                ? quoteFailure.message
                : "Could not apply payment options"
            );
            return;
          }
          setClubQuote(null);
          setQuoteError(
            quoteFailure instanceof Error
              ? quoteFailure.message
              : "Could not load the approved Club price"
          );
        }
      }
      if (purpose === "community") {
        try {
          const quote = await apiPost<ChargePreview>(
            "/api/v1/payments/charges/preview",
            { purpose: "community", payment_method: paymentMethod, ...adjustments },
            { auth: true }
          );
          if (request !== quoteRequest.current) return;
          setMembershipQuote(quote);
          setQuoteError(null);
          setAdjustmentError(null);
        } catch (error) {
          if (request !== quoteRequest.current) return;
          setAdjustmentError(error instanceof Error ? error.message : "Could not price Membership");
        }
      }
      if (purpose === "community_experience" && communityExperienceOfferingId) {
        try {
          setExperienceQuote(
            await previewCommunityExperienceCheckout(communityExperienceOfferingId, paymentMethod)
          );
          setQuoteError(null);
        } catch (quoteFailure) {
          setQuoteError(
            quoteFailure instanceof Error
              ? quoteFailure.message
              : "Could not load the Community Experience price"
          );
        }
      }
      if (purpose === "academy_cohort" && urlEnrollmentId) {
        try {
          const enrollments = await prepareCheckout("academy-enrollment-status", () => apiGet<{
            id: string; cohort_id?: string; status: string; payment_status: string;
          }[]>("/api/v1/academy/my-enrollments", { auth: true }));
          if (request !== quoteRequest.current) return;
          const enrollment = enrollments.find((item) => item.id === urlEnrollmentId);
          if (!enrollment) throw new Error("Academy enrollment not found");
          if (enrollment.cohort_id && urlCohortId && enrollment.cohort_id !== urlCohortId) {
            throw new Error("This enrollment belongs to another cohort. Open it from My Academy.");
          }
          if (enrollment.payment_status === "paid" || !canPayAcademyEnrollment(enrollment.status)) {
            setAcademyQuotes(null);
            router.replace(`/account/academy/enrollments/${enrollment.id}`);
            return;
          }
          const cohortId = enrollment.cohort_id || urlCohortId;
          const cohort = cohortId ? await prepareCheckout("academy-cohort", () => apiGet<Cohort>(
            `/api/v1/academy/cohorts/${cohortId}`, { auth: true }
          )) : null;
          const options = await loadAcademyBillingQuotes(
            !!cohort?.installment_plan_enabled, adjustments.bubbles_to_apply || 0,
            (mode, bubbles) => prepareCheckout(`academy-${mode}-quote`, () => previewAcademyCheckout(
              urlEnrollmentId, mode === "installments", paymentMethod, urlAmountOverrideKobo,
              adjustments.bubbles_to_apply ? { ...adjustments, bubbles_to_apply: bubbles } : adjustments
            ))
          );
          if (request !== quoteRequest.current) return;
          setCheckoutCohort(cohort);
          setAcademyQuotes({ key: academyQuoteKey, ...options });
          setQuoteError(null);
          setAdjustmentError(null);
        } catch (error) {
          if (request !== quoteRequest.current) return;
          setAcademyQuotes(null);
          setQuoteError(error instanceof Error ? error.message : "Could not load the Academy price");
        }
      }

    } catch (e) {
      if (request !== quoteRequest.current) return;
      setQuoteError(e instanceof Error ? e.message : "Could not prepare checkout. Please try again.");
    } finally {
      if (request === quoteRequest.current) {
        setLoading(false);
        setQuotePending(false);
        dataLoaded.current = true;
      }
    }
  }, [
    router,
    urlCohortId,
    urlEnrollmentId,
    academyQuoteKey,
    purpose,
    clubApplicationId,
    clubPaymentMode,
    clubPaymentModeWasChosen,
    clubExperienceSelected,
    adjustments,
    paymentMethod,
    communityExperienceOfferingId,
    urlAmountOverrideKobo,
  ]);

  const invalidateQuotes = useCallback(() => { quoteRequest.current++; }, []);
  useEffect(() => {
    void loadData();
    return invalidateQuotes;
  }, [loadData, invalidateQuotes]);

  // Check if community is active
  const communityActive = isTierPaid(member, "community");

  // Calculate line items based on purpose (using API pricing)
  const lineItems: { label: string; amount: number; highlight?: boolean }[] = [];
  let subtotal = 0;

  const communityFee = pricing?.community_annual || 0;
  const clubPricing = {
    quarterly: pricing?.club_quarterly || 0,
    biannual: pricing?.club_biannual || 0,
    annual: pricing?.club_annual || 0,
  };

  if (purpose === "club" || purpose === "club_bundle") {
    if (clubApplicationId && clubQuote) {
      const experienceFee = (clubQuote.components.community_experience || 0) / 100;
      const clubItems = clubQuote.components.club_items ?? [];
      if (clubItems.length) {
        clubItems.forEach((item) => {
          const adjusted = item.amount_kobo !== item.full_quarter_fee_kobo;
          lineItems.push({
            label: `${item.name} (${item.period_start} to ${item.period_end})${adjusted ? ` · adjusted for ${item.remaining_sessions} sessions` : ""}`,
            amount: item.amount_kobo / 100,
          });
        });
      } else {
        lineItems.push({
          label: "Club practice (selected location)",
          amount: (clubQuote.components.club || 0) / 100,
        });
      }
      const annualMembership = (clubQuote.components.annual_swimbuddz_membership || 0) / 100;
      if (annualMembership > 0) {
        lineItems.push({
          label: "SwimBuddz Membership — annual",
          amount: annualMembership,
        });
      }
      if (clubQuote.components.community_experience_selected) {
        lineItems.push({
          label: clubQuote.components.community_experience_option?.name || "Community Experience",
          amount: experienceFee,
        });
      }
      clubQuote.additional_charges.forEach((charge) => {
        lineItems.push({ label: charge.label, amount: charge.amount_kobo / 100 });
      });
      subtotal = clubQuote.total_kobo / 100;
    } else if (!communityActive) {
      lineItems.push({
        label: "Community membership (annual)",
        amount: communityFee,
      });
      subtotal += communityFee;
    }

    if (!clubApplicationId && clubBillingCycle) {
      const clubFee = clubPricing[clubBillingCycle];
      lineItems.push({
        label: `Club practice (${getClubCycleLabel(clubBillingCycle).toLowerCase()})`,
        amount: clubFee,
      });
      subtotal += clubFee;
    }

    // Community extension if applicable
    if (!clubApplicationId && state.extensionInfo?.required && state.includeCommunityExtension) {
      lineItems.push({
        label: `Community extension (${state.extensionInfo.months} months)`,
        amount: state.extensionInfo.amount,
      });
      subtotal += state.extensionInfo.amount;
    }
  } else if (purpose === "academy_cohort" && academyQuote) {
    const academyAmount = (academyQuote.components.academy || 0) / 100;
    const annualMembership = (academyQuote.components.annual_swimbuddz_membership || 0) / 100;
    const installmentNumber = academyQuote.components.installment_number;
    lineItems.push({
      label: `Academy: ${checkoutCohort?.name || "cohort"}${installmentNumber ? ` · installment ${installmentNumber}` : ""}`,
      amount: academyAmount,
    });
    if (annualMembership > 0) {
      lineItems.push({ label: "SwimBuddz Membership — annual", amount: annualMembership });
    } else if (academyQuote.components.academy_membership_policy === "included") {
      lineItems.push({ label: "Annual SwimBuddz Membership — included", amount: 0 });
    }
    academyQuote.additional_charges.forEach((charge) => {
      lineItems.push({ label: charge.label, amount: charge.amount_kobo / 100 });
    });
    subtotal = academyQuote.total_kobo / 100;
  } else if (purpose === "community_experience" && experienceQuote) {
    lineItems.push({
      label: "Quarterly Community Experience",
      amount: (experienceQuote.components.community_experience || 0) / 100,
    });
    const annualMembership = (experienceQuote.components.annual_swimbuddz_membership || 0) / 100;
    if (annualMembership > 0) {
      lineItems.push({ label: "SwimBuddz Membership — annual", amount: annualMembership });
    }
    experienceQuote.additional_charges.forEach((charge) => {
      lineItems.push({ label: charge.label, amount: charge.amount_kobo / 100 });
    });
    subtotal = experienceQuote.total_kobo / 100;
  } else if (purpose === "community") {
    // Community only
    lineItems.push({
      label: "SwimBuddz Membership — annual",
      amount: communityFee,
    });
    subtotal += communityFee;
    membershipQuote?.additional_charges.forEach((charge) => {
      lineItems.push({ label: charge.label, amount: charge.amount_kobo / 100 });
    });
  }

  // Apply discount
  const discountAmount = validatedDiscount?.amount || 0;
  const productQuote =
    purpose === "club" && clubApplicationId
      ? clubQuote
      : purpose === "academy_cohort"
        ? academyQuote
        : purpose === "community"
          ? membershipQuote
          : null;
  const productCheckout =
    (purpose === "club" && !!clubApplicationId) ||
    purpose === "academy_cohort" ||
    purpose === "community";
  const total = productQuote
    ? productQuote.total_kobo / 100
    : Math.max(0, subtotal - discountAmount);
  const appliedBubbles = productQuote?.bubbles_to_apply || 0;
  const isTransition =
    purpose === "club" &&
    !!clubApplicationId &&
    clubQuote?.components.club_payment_mode === "transition_per_session";
  const nothingDue = isTransition && total === 0 && appliedBubbles === 0;

  const installmentsEnabled = !!academyQuotes?.installments;
  const installmentPreview = academyQuotes?.key === academyQuoteKey && academyQuotes.installments ? {
    count: academyQuotes.installments.components.total_installments ?? 2,
    deposit: (bubblesWereReset ? academyQuotes.withoutBubbles.installments! : academyQuotes.installments).total_kobo / 100,
    subsequentAmount: null,
  } : null;

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
        { auth: true }
      );

      if (response.valid) {
        setDiscountCode(response.code);
        setValidatedDiscount({
          code: response.code,
          amount: response.discount_amount,
          appliesTo: response.applies_to_component,
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
      // Intent body is assembled in branches below based on `purpose` —
      // a Partial of the canonical CreatePaymentIntentRequest covers
      // every shape we send (the backend's Pydantic model defaults the
      // unset booleans/numbers). Avoids both `any` and the noise of a
      // discriminated union with five variants that each duplicate the
      // shared currency / payment_method / discount_code prefix.
      let intentPayload: Partial<PaymentIntentRequest> = {
        currency: "NGN",
        payment_method: paymentMethod,
        discount_code: productCheckout
          ? productQuote?.discount_code || undefined
          : state.discountCode || undefined,
        bubbles_to_apply: productCheckout ? appliedBubbles : undefined,
        expected_total_kobo: productQuote?.total_kobo,
      };

      if (purpose === "club" || purpose === "club_bundle") {
        intentPayload = clubApplicationId
          ? {
              ...intentPayload,
              purpose: "club",
              club_application_id: clubApplicationId,
              club_payment_mode: clubPaymentMode,
              club_community_experience_selected:
                clubQuote?.components.community_experience_selected,
            }
          : {
              ...intentPayload,
              purpose: communityActive ? "club" : "club_bundle",
              club_billing_cycle: clubBillingCycle,
              months: 1,
              years: communityActive ? undefined : 1,
              include_community_extension:
                state.extensionInfo?.required && state.includeCommunityExtension,
            };
      } else if (purpose === "academy_cohort") {
        if (!urlEnrollmentId || !academyQuote || quoteError) {
          throw new Error("Please wait for your Academy enrollment and price to be confirmed.");
        }

        intentPayload = {
          ...intentPayload,
          purpose: "academy_cohort",
          enrollment_id: urlEnrollmentId,
          use_installments: billingMode === "installments",
          ...(urlAmountOverrideKobo ? { amount_override_kobo: urlAmountOverrideKobo } : {}),
        };
      } else if (purpose === "community") {
        intentPayload = {
          ...intentPayload,
          purpose: "community",
          years: 1,
        };
      } else if (purpose === "community_experience") {
        if (!communityExperienceOfferingId) {
          throw new Error("Choose a Community Experience before paying");
        }
        intentPayload = {
          ...intentPayload,
          purpose: "community_experience",
          community_experience_offering_id: communityExperienceOfferingId,
        };
      }

      const attempt = productCheckout
        ? productCheckoutAttempt(member?.id || member?.email || "me", intentPayload)
        : null;
      if (attempt) intentPayload.idempotency_key = attempt.idempotencyKey;
      const intent = await apiPost<PaymentIntent>("/api/v1/payments/intents", intentPayload, {
        auth: true,
      });

      // Cache the intent
      savePaymentIntentCache(intent, member?.id || member?.email || "me");
      // Once the response is safely cached, Billing/provider return owns recovery.
      // Retain the key only for a lost or incomplete initialization response.
      if (intent.status === "paid" || intent.checkout_url || paymentMethod === "manual_transfer")
        attempt?.complete();

      if (intent.checkout_url) {
        // Clear upgrade state before redirect
        clearState();
        // Redirect to payment provider
        window.location.href = intent.checkout_url;
      } else if (paymentMethod === "manual_transfer" && intent.status !== "paid") {
        // For manual transfers, go to proof upload page
        toast.success(`Payment reference created: ${intent.reference}`);
        clearState();
        router.push(`/account/billing?pending_transfer=${intent.reference}#bank-transfer-receipts`);
      } else {
        if (intent.status === "paid") {
          toast.success(
            intent.entitlement_applied_at
              ? nothingDue
                ? "Club access activated."
                : "Payment complete. Access activated."
              : "Payment confirmed. Access activation is processing."
          );
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
    if (purpose === "community_experience") {
      return "/community/experiences";
    }
    return "/account/billing";
  };

  const unavailableInstallments = purpose === "academy_cohort" && billingMode === "installments" && academyQuotes?.key === academyQuoteKey && !academyQuotes.installments && !academyQuoteError;
  if (unavailableInstallments) return <Alert variant="error">Installments are unavailable for this enrollment. <Button onClick={() => switchBilling("full")}>Pay in full</Button></Alert>;

  if (loading || (purpose === "academy_cohort" && urlEnrollmentId && !academyQuote && !quoteError && !academyQuoteError)) {
    return <LoadingCard text={dataLoaded.current ? "Updating price…" : "Preparing checkout…"} />;
  }

  if (purpose === "academy_cohort" && !urlEnrollmentId && !quoteError) {
    return <LoadingCard text="Preparing your Academy quote..." />;
  }

  // Validate we have required data. Route the user back to a useful place
  // based on what they were trying to do — back to cohort selection for
  // academy, back to billing for anything else.
  if (!purpose || quoteError || academyQuoteError || lineItems.length === 0) {
    const isAcademyFlow = purpose === "academy_cohort";
    const backLabel = isAcademyFlow ? "Back to Cohort Selection" : "Back to Billing";
    const backPath = isAcademyFlow ? "/upgrade/academy/cohort" : "/account/billing";
    const message =
      quoteError || academyQuoteError ||
      (isAcademyFlow
        ? "We couldn't load the cohort details. Please pick a cohort again."
        : "Missing checkout information. Please start the upgrade process again.");
    return (
      <div className="space-y-6 text-center">
        <Alert variant="error" title="Checkout Error">
          {message}
        </Alert>
        {(quoteError || academyQuoteError) && <Button onClick={() => { setQuoteError(null); if (purpose === "academy_cohort" && !urlEnrollmentId) { enrollmentStarted.current = null; setPreparationRetry((n) => n + 1); } else void loadData(); }}>Try again</Button>}
        {isAcademyFlow && checkoutCohort?.installment_plan_enabled && <Button variant="outline" onClick={() => switchBilling(billingMode === "full" ? "installments" : "full")}>
          {billingMode === "full" ? "Choose installments" : "Choose full payment"}
        </Button>}
        {(adjustments.bubbles_to_apply || adjustments.discount_code) && <Button variant="outline" onClick={() => setAdjustments({})}>Reset payment options</Button>}
        <Button onClick={() => router.push(backPath)}>{backLabel}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {quotePending && <p role="status" className="text-center text-slate-600">Updating price…</p>}
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
          <CreditCard className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isTransition ? "Activate your Club access" : "Review & Pay"}
        </h1>
        <p className="text-slate-600 max-w-md mx-auto">
          {isTransition
            ? "Review your Club access and choose any extras below."
            : "Please review your order before proceeding to payment."}
        </p>
      </div>

      {/* Order Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {isTransition ? "Your Club access" : "Order Summary"}
        </h2>

        {purpose === "club" && clubQuote?.components.approved_payment_modes ? (
          <div className="mb-5">
            <ClubPaymentModeSelector
              approvedModes={clubQuote.components.approved_payment_modes}
              value={clubPaymentMode}
              transitionExpiresAt={clubQuote.components.transition_expires_at}
              onChange={(mode) => {
                quoteRequest.current++;
                setClubQuote(null);
                setClubPaymentModeWasChosen(true);
                setClubPaymentMode(mode);
                const params = new URLSearchParams(searchParams.toString());
                params.set("payment_mode", mode);
                router.replace(`/checkout?${params.toString()}`);
              }}
            />
            {clubPaymentMode === "transition_per_session" ? (
              <ClubTransitionCheckoutNotice
                expiresAt={clubQuote.components.transition_expires_at}
              />
            ) : null}
          </div>
        ) : null}

        {clubQuote?.components.community_experience_option ? (
          <label className="mb-5 flex items-start gap-3 rounded-xl border border-cyan-200 p-4 text-sm">
            <input
              type="checkbox"
              checked={!!clubQuote.components.community_experience_selected}
              onChange={(event) => {
                quoteRequest.current++;
                setClubQuote(null);
                setClubExperienceSelected(event.target.checked);
              }}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="font-semibold">
                Add {clubQuote.components.community_experience_option.name}
              </span>
              <span className="block text-slate-600">
                Optional.{" "}
                {isTransition
                  ? "Standard member price; pay-per-swim access does not include the quarter bundle discount."
                  : "Club bundle price when you buy the quarter."}{" "}
                You can remove this before continuing.
              </span>
            </span>
            <span>
              {formatCurrency(clubQuote.components.community_experience_option.amount_kobo / 100)}
            </span>
          </label>
        ) : null}

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="flex justify-between py-2">
              <span className="text-slate-700">{item.label}</span>
              <span className="text-slate-900">{formatCurrency(item.amount)}</span>
            </div>
          ))}

          {/* Discount section */}
          {!productCheckout ? (
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
                            Applied to {validatedDiscount.appliesTo.replace("_", " ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-emerald-700">
                        -{discountAmount > 0 ? formatCurrency(discountAmount) : "Applied"}
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
              ) : showDiscountInput ? (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    placeholder="Discount code"
                    autoFocus
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
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountInput("");
                      setShowDiscountInput(false);
                    }}
                    className="flex-shrink-0 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Cancel discount entry"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
                >
                  <Tag className="w-4 h-4" />
                  Have a discount code?
                </button>
              )}
            </div>
          ) : null}

          {adjustmentError && !productQuote && <Alert variant="error">{adjustmentError}</Alert>}
          {purpose === "academy_cohort" && bubblesWereReset && (
            <p role="status" className="text-sm text-cyan-800">Bubbles were reset because the selected amount exceeded this installment. You can choose a new amount below.</p>
          )}
          {productQuote && (
            <ProductPaymentOptions
              quote={productQuote}
              value={purpose === "academy_cohort" ? { ...adjustments, bubbles_to_apply: appliedBubbles } : adjustments}
              error={adjustmentError}
              disabled={processing || quotePending}
              online={paymentMethod === "paystack"}
              onChange={(value) => {
                setAcademyBubbleResetKey(null);
                quoteRequest.current++;
                setQuotePending(true);
                setAdjustments(value);
              }}
            />
          )}

          {billingMode === "installments" && installmentPreview ? (
            <div className="pt-4 border-t border-slate-200 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <span className="text-base font-semibold text-slate-900 block">Due today</span>
                <span className="text-xs text-slate-500">
                  Installment {academyQuote?.components.installment_number ?? 1} of{" "}
                  {installmentPreview.count}
                </span>
              </div>
              <span className="text-xl font-bold text-cyan-600 whitespace-nowrap">
                {formatCurrency(installmentPreview.deposit)}
              </span>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 flex justify-between">
              <span className="text-base font-semibold text-slate-900">
                {nothingDue
                  ? "Nothing due today"
                  : appliedBubbles > 0
                    ? "Remaining online payment"
                    : isTransition
                      ? "Due today"
                      : "Total"}
              </span>
              {!nothingDue && (
                <span className="text-xl font-bold text-cyan-600">{formatCurrency(total)}</span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Installment option — inconspicuous link below order summary ── */}
      {installmentsEnabled && installmentPreview && billingMode === "full" && (
        <p className="text-center text-sm text-slate-500 -mt-2">
          Need more time?{" "}
          <button
            type="button"
            disabled={quotePending || processing}
            onClick={() => switchBilling("installments")}
            className="text-cyan-600 underline underline-offset-2 hover:text-cyan-700 font-medium"
          >
            Pay in {installmentPreview.count} installments —{" "}
            {formatCurrency(installmentPreview.deposit)} now
          </button>
        </p>
      )}

      {/* ── Installment details — shown when installments selected ── */}
      {installmentsEnabled && installmentPreview && billingMode === "installments" && (
        <p className="text-center text-sm text-slate-500 -mt-2">
          {installmentPreview.subsequentAmount != null
            ? `Then ${installmentPreview.count - 1} × ${formatCurrency(installmentPreview.subsequentAmount)} every 4 weeks`
            : "Remaining installments follow the cohort payment schedule"}{" "}
          —{" "}
          <button
            type="button"
            disabled={quotePending || processing}
            onClick={() => switchBilling("full")}
            className="text-cyan-600 underline underline-offset-2 hover:text-cyan-700 font-medium"
          >
            Pay in full{academyQuotes?.full ? ` — ${formatCurrency((bubblesWereReset ? academyQuotes.withoutBubbles.full! : academyQuotes.full).total_kobo / 100)}` : ""}
          </button>
        </p>
      )}

      {/* Approved Club applications can reconcile an existing bank transfer. */}
      {!nothingDue && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h2>
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
              <span className="text-lg font-medium text-slate-900">💳 Pay Online</span>
              <span className="text-sm text-slate-500">Instant payment via Paystack</span>
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
                onChange={() => {
                  setAdjustments((value) => ({ ...value, bubbles_to_apply: 0 }));
                  setPaymentMethod("manual_transfer");
                }}
                className="sr-only"
              />
              <span className="text-lg font-medium text-slate-900">🏦 Bank Transfer</span>
              <span className="text-sm text-slate-500">Manual transfer with proof</span>
            </label>
          </div>

          {/* Bank Transfer Details */}
          {paymentMethod === "manual_transfer" && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-medium text-amber-900 mb-2">📋 Bank Transfer Details</h3>
              {(purpose === "club" || purpose === "community") && (
                <p className="mb-3 text-sm text-amber-900">
                  Already transferred? Do not pay again. Continue to upload the existing receipt for
                  Admin reconciliation against this approved quote. If the amount differs, contact
                  Admin before continuing.
                </p>
              )}
              <div className="space-y-1 text-sm text-amber-800">
                <p>
                  <span className="text-amber-600">Bank:</span>{" "}
                  <strong>{BANK_TRANSFER_ACCOUNT.bankName}</strong>
                </p>
                <p>
                  <span className="text-amber-600">Account Number:</span>{" "}
                  <strong>{BANK_TRANSFER_ACCOUNT.accountNumber}</strong>
                </p>
                <p>
                  <span className="text-amber-600">Account Name:</span>{" "}
                  <strong>{BANK_TRANSFER_ACCOUNT.accountName}</strong>
                </p>
                <p>
                  <span className="text-amber-600">Amount:</span>{" "}
                  <strong>{formatCurrency(total)}</strong>
                </p>
              </div>
              <p className="mt-3 text-xs text-amber-700">
                💡 After transfer, you'll be asked to upload proof of payment for verification.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Payment Button */}
      <div className="space-y-4">
        <Button
          onClick={handlePayment}
          disabled={
            processing || quotePending || !!adjustmentError || (productCheckout && !productQuote)
          }
          size="lg"
          className="w-full"
        >
          {processing
            ? "Processing..."
            : appliedBubbles > 0
              ? total > 0
                ? `Pay ${formatCurrency(total)} + ${appliedBubbles} Bubbles`
                : `Pay ${appliedBubbles} Bubbles`
              : nothingDue
                ? "Activate Club access"
                : isTransition && paymentMethod === "paystack"
                  ? `Pay ${formatCurrency(total)} & activate Club access`
                  : paymentMethod === "manual_transfer"
                    ? "Continue to transfer details"
                    : billingMode === "installments"
                      ? `Pay ${formatCurrency(productQuote ? total : (installmentPreview?.deposit ?? 0))} — Start Installment Plan`
                      : paymentMethod === "paystack"
                        ? `Pay ${formatCurrency(total)}`
                        : "Continue to upload receipt"}
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
        {nothingDue
          ? "No payment is needed to activate your Club access. You'll pay for each swim when you book."
          : paymentMethod === "paystack"
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
