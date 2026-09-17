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
    label: "SwimBuddz Membership",
    tagline: "Join the community and book member activities",
    price: "₦20,000",
    priceNote: "year",
    icon: <Users className="h-6 w-6" />,
    accentColor: "cyan",
    features: [
      "One annual member identity",
      "Access to community activities",
      "Member directory (opt-in)",
      "Volunteer opportunities",
      "Swimming tips & articles",
      "WhatsApp group access",
    ],
  },
  {
    value: "club",
    label: "Join Club",
    tagline: "Practise and improve consistently",
    price: "By location",
    priceNote: "quarter",
    icon: <Star className="h-6 w-6" />,
    accentColor: "emerald",
    featured: true,
    includes: "Club practice includes:",
    features: [
      "Weekly structured practice",
      "Area and pool selection",
      "Pods and progress support",
      "Quarterly, location-based pricing",
      "Readiness assessment before activation",
    ],
  },
  {
    value: "academy",
    label: "Learn through Academy",
    tagline: "Choose a structured learning programme",
    price: "By programme",
    priceNote: "cohort",
    icon: <Sparkles className="h-6 w-6" />,
    accentColor: "purple",
    includes: "Academy programmes can include:",
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
        <h3 className="text-2xl font-bold text-slate-900">How would you like to start?</h3>
        <p className="text-slate-600 max-w-lg mx-auto">
          Create one SwimBuddz identity, then choose Membership, Club practice, or an Academy
          programme. You can join other programmes later.
        </p>
      </div>

      {/* Starting-path cards. API identifiers remain stable during migration. */}
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

          const colors = colorStyles[tier.accentColor as keyof typeof colorStyles];

          return (
            <button
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={tier.label}
              key={tier.value}
              className={`relative min-w-0 text-left rounded-2xl border border-slate-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-xl hover:-translate-y-1"
              } ${
                isSelected
                  ? `ring-2 ring-cyan-600 ${colors.border} shadow-lg ${colors.bg}`
                  : "bg-white hover:border-slate-300"
              } ${tier.featured && !isSelected ? "ring-1 ring-emerald-200" : ""}`}
              onClick={() => !isDisabled && onSelectTier(tier.value)}
            >
              {/* Featured Badge */}
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex whitespace-nowrap items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md">
                    <Star className="h-3 w-3 fill-current" />
                    Regular practice
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
                <div className="space-y-3 lg:min-h-[176px]">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.icon}`}
                  >
                    {tier.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{tier.label}</h4>
                    <p className="text-sm text-slate-500 mt-1">{tier.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="py-4 mt-4 border-b border-slate-100 lg:min-h-[104px]">
                  <div className="flex flex-col gap-1">
                    <span className={`text-2xl font-bold break-words ${colors.text}`}>
                      {tier.price}
                    </span>
                    {tier.priceNote && (
                      <span className="text-sm text-slate-500">per {tier.priceNote}</span>
                    )}
                  </div>
                </div>

                {/* Includes note - fixed height placeholder for alignment */}
                <div className="min-h-10 mt-4">
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
                      <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${colors.check}`} />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button - always at bottom */}
                <span
                  className={`block text-center w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all mt-6 ${
                    isSelected
                      ? `${colors.text} bg-white border-2 ${colors.border}`
                      : isDisabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : `bg-slate-100 text-slate-700 hover:bg-slate-200`
                  }`}
                >
                  {isSelected ? "✓ Selected" : isDisabled ? "Already active" : "Choose this path"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Confirmation */}
      {selectedTier && (
        <div className="text-center p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100">
          <p className="text-sm text-cyan-900">
            <span className="font-semibold">Starting path selected:</span>{" "}
            <span className="font-bold">
              {tierOptions.find((t) => t.value === selectedTier)?.label}
            </span>{" "}
            . Click "Next" to create your profile. Prices and any annual Membership requirement are
            itemised before payment.
          </p>
        </div>
      )}
    </div>
  );
}
