"use client";

import { CheckCircle, Sparkles, Star, Users } from "lucide-react";

type Tier = "community" | "club" | "academy";

interface TierOption {
  value: Tier;
  label: string;
  tagline: string;
  price: string;
  priceNote?: string;
  features: string[];
  includes?: string;
  icon: React.ReactNode;
  featured?: boolean;
  accentColor: string;
}

const tierOptions: TierOption[] = [
  {
    value: "community",
    label: "Community",
    tagline: "Join the SwimBuddz family",
    price: "₦20,000",
    priceNote: "year",
    icon: <Users className="h-6 w-6" />,
    accentColor: "cyan",
    features: [
      "Access to community events",
      "Member directory (opt-in)",
      "Volunteer opportunities",
      "Swimming tips & articles",
      "WhatsApp group access",
    ],
  },
  {
    value: "club",
    label: "Club",
    tagline: "Swim with us regularly",
    price: "₦42,500+",
    priceNote: "quarter",
    icon: <Star className="h-6 w-6" />,
    accentColor: "emerald",
    featured: true,
    includes: "Everything in Community, plus:",
    features: [
      "Regular Swimming sessions",
      "Preferred Swimming locations",
      "Club challenges & badges",
      "Attendance tracking",
      "Priority event access",
    ],
  },
  {
    value: "academy",
    label: "Academy",
    tagline: "Structured learning program",
    price: "₦50,000+",
    priceNote: "cohort",
    icon: <Sparkles className="h-6 w-6" />,
    accentColor: "purple",
    includes: "Everything in Club, plus:",
    features: [
      "Structured curriculum",
      "Personalized coaching",
      "Skill assessments",
      "Certification tracking",
      "Progress milestones",
    ],
  },
];

interface TierSelectionStepProps {
  selectedTier: Tier | null;
  onSelectTier: (tier: Tier) => void;
  disabledTier?: Tier | null;
}

export function TierSelectionStep({
  selectedTier,
  onSelectTier,
  disabledTier,
}: TierSelectionStepProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-2xl mb-2">
          🏊
        </div>
        <h3 className="text-2xl font-bold text-slate-900">
          Choose your membership tier
        </h3>
        <p className="text-slate-600 max-w-lg mx-auto">
          Select the tier that best matches your swimming goals. You can always
          upgrade later as you progress.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {tierOptions.map((tier) => {
          const isSelected = selectedTier === tier.value;
          const isDisabled = disabledTier === tier.value;

          const colorStyles = {
            cyan: {
              bg: "bg-cyan-50",
              border: "border-cyan-500",
              text: "text-cyan-600",
              icon: "bg-cyan-100 text-cyan-600",
              check: "text-cyan-500",
            },
            emerald: {
              bg: "bg-emerald-50",
              border: "border-emerald-500",
              text: "text-emerald-600",
              icon: "bg-emerald-100 text-emerald-600",
              check: "text-emerald-500",
            },
            purple: {
              bg: "bg-purple-50",
              border: "border-purple-500",
              text: "text-purple-600",
              icon: "bg-purple-100 text-purple-600",
              check: "text-purple-500",
            },
          };

          const colors =
            colorStyles[tier.accentColor as keyof typeof colorStyles];

          return (
            <div
              key={tier.value}
              className={`relative rounded-2xl transition-all duration-200 ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-xl hover:-translate-y-1"
              } ${
                isSelected
                  ? `ring-2 ${colors.border} shadow-lg ${colors.bg}`
                  : "bg-white border border-slate-200 hover:border-slate-300"
              } ${tier.featured && !isSelected ? "ring-1 ring-emerald-200" : ""}`}
              onClick={() => !isDisabled && onSelectTier(tier.value)}
            >
              {/* Featured Badge */}
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Selected Check */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center`}
                >
                  <CheckCircle className={`h-5 w-5 ${colors.check}`} />
                </div>
              )}

              <div className="p-6 flex flex-col h-full">
                {/* Icon & Title */}
                <div className="space-y-3">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.icon}`}
                  >
                    {tier.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">
                      {tier.label}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                      {tier.tagline}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="py-4 mt-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${colors.text}`}>
                      {tier.price}
                    </span>
                    {tier.priceNote && (
                      <span className="text-sm text-slate-500">
                        /{tier.priceNote}
                      </span>
                    )}
                  </div>
                </div>

                {/* Includes note - fixed height placeholder for alignment */}
                <div className="h-6 mt-4">
                  {tier.includes && (
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {tier.includes}
                    </p>
                  )}
                </div>

                {/* Features - flex-grow to push button to bottom */}
                <ul className="space-y-3 mt-2 flex-grow">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <CheckCircle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${colors.check}`}
                      />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button - always at bottom */}
                <button
                  type="button"
                  disabled={isDisabled}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all mt-6 ${
                    isSelected
                      ? `${colors.text} bg-white border-2 ${colors.border}`
                      : isDisabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : `bg-slate-100 text-slate-700 hover:bg-slate-200`
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) onSelectTier(tier.value);
                  }}
                >
                  {isSelected
                    ? "✓ Selected"
                    : isDisabled
                      ? "Current Tier"
                      : "Select This Tier"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Confirmation */}
      {selectedTier && (
        <div className="text-center p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100">
          <p className="text-sm text-cyan-900">
            <span className="font-semibold">Great choice!</span> You selected
            the{" "}
            <span className="font-bold">
              {tierOptions.find((t) => t.value === selectedTier)?.label}
            </span>{" "}
            tier. Click "Next" to continue with your profile.
          </p>
        </div>
      )}
    </div>
  );
}
