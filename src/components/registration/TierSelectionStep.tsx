"use client";

import { Card } from "@/components/ui/Card";
import { CheckCircle } from "lucide-react";

type Tier = "community" | "club" | "academy";

interface TierOption {
    value: Tier;
    label: string;
    tagline: string;
    price: string;
    features: string[];
    includes?: string;
}

const tierOptions: TierOption[] = [
    {
        value: "community",
        label: "Community",
        tagline: "Join the SwimBuddz family",
        price: "Free",
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
        tagline: "Train with us regularly",
        price: "Membership fee applies",
        includes: "All Community benefits, plus:",
        features: [
            "Regular training sessions",
            "Preferred training locations",
            "Club challenges & badges",
            "Punctuality & commitment tracking",
            "Priority event access",
        ],
    },
    {
        value: "academy",
        label: "Academy",
        tagline: "Structured learning program",
        price: "Program fee applies",
        includes: "All Club + Community benefits, plus:",
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
}

export function TierSelectionStep({
    selectedTier,
    onSelectTier,
}: TierSelectionStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Choose your membership tier
                </h3>
                <p className="text-sm text-slate-600">
                    Select the tier that best matches your swimming goals. You can always upgrade later.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {tierOptions.map((tier) => {
                    const isSelected = selectedTier === tier.value;

                    return (
                        <Card
                            key={tier.value}
                            className={`cursor-pointer transition-all hover:shadow-lg ${isSelected
                                    ? "border-2 border-cyan-500 shadow-lg"
                                    : "border border-slate-200 hover:border-cyan-300"
                                }`}
                            onClick={() => onSelectTier(tier.value)}
                        >
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xl font-bold text-slate-900">
                                            {tier.label}
                                        </h4>
                                        {isSelected && (
                                            <CheckCircle className="h-6 w-6 text-cyan-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600">{tier.tagline}</p>
                                </div>

                                {/* Price */}
                                <div className="border-t border-b border-slate-100 py-3">
                                    <p className="text-lg font-semibold text-cyan-600">
                                        {tier.price}
                                    </p>
                                </div>

                                {/* Includes note */}
                                {tier.includes && (
                                    <p className="text-xs font-medium text-slate-700">
                                        {tier.includes}
                                    </p>
                                )}

                                {/* Features */}
                                <ul className="space-y-2">
                                    {tier.features.map((feature, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2 text-sm text-slate-700"
                                        >
                                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {selectedTier && (
                <div className="rounded-lg bg-cyan-50 p-4">
                    <p className="text-sm text-cyan-900">
                        <strong>Selected:</strong> {tierOptions.find(t => t.value === selectedTier)?.label} tier
                    </p>
                </div>
            )}
        </div>
    );
}
