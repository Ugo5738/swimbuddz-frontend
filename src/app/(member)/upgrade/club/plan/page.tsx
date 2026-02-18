"use client";

import { Button } from "@/components/ui/Button";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import {
  ClubBillingCycle,
  CLUB_PRICING,
  formatCurrency,
  useUpgrade,
} from "@/lib/upgradeContext";
import { Check, Clock, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Member = {
  id?: string;
  membership?: {
    community_paid_until?: string | null;
  } | null;
};

const PLAN_OPTIONS: {
  key: ClubBillingCycle;
  label: string;
  description: string;
  savings?: string;
  icon: React.ElementType;
  highlight?: boolean;
}[] = [
  {
    key: "quarterly",
    label: "Quarterly",
    description: "Pay every 3 months",
    icon: Clock,
  },
  {
    key: "biannual",
    label: "Bi-annual",
    description: "Pay every 6 months",
    savings: "Save ₦5,000",
    icon: TrendingUp,
  },
  {
    key: "annual",
    label: "Annual",
    description: "Pay once a year",
    savings: "Save ₦20,000",
    icon: Sparkles,
    highlight: true,
  },
];

export default function ClubPlanSelectionPage() {
  const router = useRouter();
  const { state, setClubBillingCycle } = useUpgrade();

  const [selectedPlan, setSelectedPlan] = useState<ClubBillingCycle | null>(
    state.clubBillingCycle || "quarterly",
  );
  const [loading, setLoading] = useState(true);

  // Check if community is active
  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      await apiGet<Member>("/api/v1/members/me", { auth: true });
    } catch (e) {
      console.error("Failed to load member:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleSelectPlan = (plan: ClubBillingCycle) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (!selectedPlan) return;

    // Save to context
    setClubBillingCycle(selectedPlan);

    // Navigate to checkout with plan in URL (as fallback for context)
    router.push(`/checkout?purpose=club&plan=${selectedPlan}`);
  };

  if (loading) {
    return <LoadingCard text="Loading..." />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 sm:pb-8">
      {/* Header - tighter on mobile */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25">
          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Choose Your Plan
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Select a billing cycle that works for you.
        </p>
      </div>

      {/* Plan Cards - tighter spacing on mobile */}
      <div className="space-y-2 sm:space-y-3">
        {PLAN_OPTIONS.map((plan) => {
          const isSelected = selectedPlan === plan.key;
          const price = CLUB_PRICING[plan.key];
          const Icon = plan.icon;

          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => handleSelectPlan(plan.key)}
              className={`relative w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-lg shadow-cyan-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              } ${plan.highlight ? "ring-2 ring-cyan-100" : ""}`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Icon - smaller on mobile */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "bg-cyan-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                      {plan.label}
                    </h3>
                    {plan.highlight && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full">
                        Best Value
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                    {plan.description}
                  </p>
                  {plan.savings && (
                    <p className="text-xs sm:text-sm font-medium text-emerald-600">
                      {plan.savings}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg sm:text-xl font-bold text-slate-900">
                    {formatCurrency(price)}
                  </div>
                  <div className="text-xs text-slate-400">
                    /
                    {plan.key === "quarterly"
                      ? "quarter"
                      : plan.key === "biannual"
                        ? "6 mo"
                        : "year"}
                  </div>
                </div>

                {/* Selected indicator */}
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-cyan-500 border-cyan-500"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* What's included - more compact on mobile */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
          What's included with Club
        </h4>
        <ul className="space-y-1.5 sm:space-y-2">
          {[
            "Priority session booking",
            "Access to all pool locations",
            "Group training sessions",
            "Coach matching & feedback",
            "Pause or cancel anytime",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-600"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Sticky CTA on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 sm:relative sm:p-0 sm:bg-transparent sm:border-0">
        <Button
          onClick={handleContinue}
          disabled={!selectedPlan}
          size="lg"
          className="w-full"
        >
          Continue to Checkout
        </Button>
        <p className="text-center text-xs text-slate-400 mt-2 sm:mt-3">
          You'll review your order on the next step
        </p>
      </div>
    </div>
  );
}
